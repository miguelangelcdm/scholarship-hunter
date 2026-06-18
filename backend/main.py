import os
import shutil
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from the backend/.env file
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path)

from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pypdf import PdfReader
from database import init_db, get_db
from models import Profile, Scholarship, ProfileDocument
from schemas import ProfileUpdate, ProfileResponse, ScholarshipResponse, ProfileDocumentResponse
from scraper import fetch_scholarships
from ai_agent import score_scholarship, draft_essay, draft_outreach_email, parse_profile_from_document

app = FastAPI(title="Scholarship Hunter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    db = next(get_db())
    if not db.query(Profile).first():
        default_profile = Profile(name="Default User")
        db.add(default_profile)
        db.commit()

@app.get("/")
def read_root():
    return {"message": "Welcome to the Scholarship Hunter API"}

# --- Profile Endpoints ---
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/profile", response_model=ProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.put("/profile", response_model=ProfileResponse)
def update_profile(profile_data: ProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    
    db.commit()
    db.refresh(profile)
    return profile

@app.post("/profile/upload", response_model=ProfileDocumentResponse)
def upload_profile_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".pdf", ".txt", ".docx"]:
        raise HTTPException(status_code=400, detail="Only PDF, TXT and DOCX files are supported")
        
    filename = f"profile_{profile.id}_{doc_type}{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")
        
    parsed_text = ""
    try:
        if file_ext == ".pdf":
            reader = PdfReader(filepath)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    parsed_text += text + "\n"
        elif file_ext == ".txt":
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                parsed_text = f.read()
        elif file_ext == ".docx":
            parsed_text = "[DOCX files are stored but text extraction is not supported]"
    except Exception as e:
        print(f"Error extracting text from file: {e}")
        parsed_text = f"[Text extraction failed: {str(e)}]"

    doc = db.query(ProfileDocument).filter(
        ProfileDocument.profile_id == profile.id,
        ProfileDocument.doc_type == doc_type
    ).first()
    
    if not doc:
        doc = ProfileDocument(
            profile_id=profile.id,
            doc_type=doc_type,
            filename=file.filename,
            filepath=filepath,
            is_uploaded=True,
            parsed_text=parsed_text
        )
        db.add(doc)
    else:
        doc.filename = file.filename
        doc.filepath = filepath
        doc.is_uploaded = True
        doc.parsed_text = parsed_text
        doc.uploaded_at = datetime.utcnow()
        
    db.commit()
    db.refresh(doc)
    return doc

@app.post("/profile/parse-doc/{doc_type}", response_model=ProfileResponse)
def parse_profile_document(
    doc_type: str,
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    doc = db.query(ProfileDocument).filter(
        ProfileDocument.profile_id == profile.id,
        ProfileDocument.doc_type == doc_type
    ).first()
    
    if not doc or not doc.is_uploaded or not doc.parsed_text:
        raise HTTPException(status_code=400, detail=f"No uploaded document text found for type '{doc_type}'")
        
    extracted_data = parse_profile_from_document(doc.parsed_text)
    
    for key, value in extracted_data.items():
        if hasattr(profile, key) and value is not None:
            setattr(profile, key, value)
            
    db.commit()
    db.refresh(profile)
    return profile

# --- Scholarship Endpoints ---
@app.get("/scholarships", response_model=list[ScholarshipResponse])
def get_all_scholarships(db: Session = Depends(get_db)):
    return db.query(Scholarship).all()

@app.post("/scholarships/scan")
def run_discovery_scan(db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile required to scan")
    
    raw_scholarships = fetch_scholarships()
    
    new_count = 0
    for s_data in raw_scholarships:
        existing = db.query(Scholarship).filter(Scholarship.url == s_data["url"]).first()
        if not existing:
            profile_dict = {
                "major": profile.major,
                "gpa": profile.gpa,
                "demographics": profile.demographics,
                "hobbies": profile.hobbies,
                "volunteer_work": profile.volunteer_work,
                "projects": profile.projects,
                "experience": profile.experience,
                "awards": profile.awards,
                "languages": profile.languages,
                "publications": profile.publications,
                "financial_need": profile.financial_need,
                "career_goals": profile.career_goals
            }
            scores = score_scholarship(profile_dict, s_data)
            
            new_scholarship = Scholarship(
                title=s_data["title"],
                provider=s_data["provider"],
                amount=s_data["amount"],
                deadline=s_data["deadline"],
                description=s_data["description"],
                url=s_data["url"],
                desire_score=scores.get("desire_score", 0),
                probability_score=scores.get("probability_score", 0)
            )
            db.add(new_scholarship)
            new_count += 1
            
    db.commit()
    return {"message": f"Scan complete. Discovered {new_count} new scholarships."}

@app.post("/scholarships/{scholarship_id}/draft")
def generate_draft(scholarship_id: int, db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    scholarship = db.query(Scholarship).filter(Scholarship.id == scholarship_id).first()
    
    if not profile or not scholarship:
        raise HTTPException(status_code=404, detail="Not found")
        
    profile_dict = {
        "major": profile.major,
        "gpa": profile.gpa,
        "demographics": profile.demographics,
        "hobbies": profile.hobbies,
        "volunteer_work": profile.volunteer_work,
        "projects": profile.projects,
        "experience": profile.experience,
        "awards": profile.awards,
        "languages": profile.languages,
        "publications": profile.publications,
        "financial_need": profile.financial_need,
        "career_goals": profile.career_goals
    }
    scholarship_dict = {"title": scholarship.title, "description": scholarship.description}
    
    essay = draft_essay(profile_dict, scholarship_dict)
    
    scholarship.status = "Drafting"
    db.commit()
    
    return {"essay_draft": essay}

@app.post("/scholarships/{scholarship_id}/outreach")
def generate_outreach(scholarship_id: int, db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    scholarship = db.query(Scholarship).filter(Scholarship.id == scholarship_id).first()
    
    if not profile or not scholarship:
        raise HTTPException(status_code=404, detail="Not found")
        
    profile_dict = {
        "major": profile.major,
        "gpa": profile.gpa,
        "demographics": profile.demographics,
        "experience": profile.experience,
        "career_goals": profile.career_goals
    }
    scholarship_dict = {"title": scholarship.title, "description": scholarship.description}
    
    email = draft_outreach_email(profile_dict, scholarship_dict)
    
    return {"email_draft": email}
