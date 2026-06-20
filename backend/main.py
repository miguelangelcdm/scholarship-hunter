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
from models import Profile, Scholarship, ProfileDocument, TargetProgram
from schemas import ProfileUpdate, ProfileResponse, ScholarshipResponse, ProfileDocumentResponse, TargetProgramResponse
from scraper import fetch_scholarships_real
from search_seeder import get_seed_urls
from ai_agent import score_scholarship, draft_essay, draft_outreach_email, parse_profile_from_document, extract_page_content

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

# --- Target Program Endpoints ---
@app.get("/programs", response_model=list[TargetProgramResponse])
def get_all_programs(db: Session = Depends(get_db)):
    return db.query(TargetProgram).all()

@app.get("/scholarships/last-scan")
def get_last_scan():
    logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "discovery_logs")
    if not os.path.exists(logs_dir):
        return {"last_scan": None}
    
    try:
        files = [f for f in os.listdir(logs_dir) if f.startswith("scan_") and f.endswith(".json")]
        if not files:
            return {"last_scan": None}
        
        # Sort lexicographically descending (latest timestamp first)
        files.sort(reverse=True)
        latest_file = files[0]
        
        import json
        with open(os.path.join(logs_dir, latest_file), "r", encoding="utf-8") as f:
            data = json.load(f)
            return {"last_scan": data.get("timestamp")}
    except Exception as e:
        print(f"Error retrieving last scan time: {e}")
        return {"last_scan": None}

@app.post("/scholarships/scan")
def run_discovery_scan(db: Session = Depends(get_db)):
    from fastapi.responses import StreamingResponse
    
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile required to scan")
    
    def scan_generator():
        import json
        
        yield json.dumps({"step": "init", "message": "Starting discovery engine...", "progress": 5}) + "\n"
        
        try:
            targets = json.loads(profile.target_countries) if profile.target_countries else []
            desired_countries = [t.get("country") for t in targets if t.get("country")]
        except:
            desired_countries = []
            
        try:
            undesired = json.loads(profile.undesired_countries) if profile.undesired_countries else []
            undesired_countries = [u.get("country") for u in undesired if u.get("country")]
        except:
            undesired_countries = []

        try:
            target_conts = json.loads(profile.target_continents) if profile.target_continents else []
        except:
            target_conts = []
            
        try:
            undesired_conts = json.loads(profile.undesired_continents) if profile.undesired_continents else []
        except:
            undesired_conts = []

        try:
            langs = json.loads(profile.languages) if profile.languages else []
            spoken_languages = [l.get("language") for l in langs if l.get("language")]
        except:
            spoken_languages = ["English"] # Default

        import random
        import os
        offset = random.randint(0, 30)
        
        # 1. Search Seeding (Phase 1)
        yield json.dumps({"step": "seeding", "message": "Searching DuckDuckGo for matching scholarships...", "progress": 15}) + "\n"
        
        search_limit = int(os.getenv("SEARCH_MAX_RESULTS", 5))
        seed_urls = get_seed_urls(profile, offset=offset, limit=search_limit)
        
        # 2. Web Crawling (Phase 2)
        yield json.dumps({"step": "crawling", "message": f"Found {len(seed_urls)} seed URLs. Initializing crawler...", "progress": 30}) + "\n"
        
        profile_dict = {
            "major": profile.major,
            "gpa": profile.gpa,
            "degree_level": getattr(profile, "degree_level", ""),
            "demographics": profile.demographics,
            "hobbies": profile.hobbies,
            "volunteer_work": profile.volunteer_work,
            "projects": profile.projects,
            "experience": profile.experience,
            "awards": profile.awards,
            "languages": profile.languages,
            "publications": profile.publications,
            "financial_need": profile.financial_need,
            "career_goals": profile.career_goals,
            "has_dependents": getattr(profile, "has_dependents", False)
        }
        
        scraper_result = fetch_scholarships_real(seed_urls, profile_dict)
        raw_pages = scraper_result.get("pages", [])
        scraper_errors = scraper_result.get("errors", [])
        
        # Initialize discovery scan log structure
        scan_time = datetime.utcnow()
        scan_log = {
            "timestamp": scan_time.isoformat() + "Z",
            "profile_id": profile.id,
            "criteria": {
                "name": profile.name,
                "major": profile.major,
                "gpa": profile.gpa,
                "preferred_modality": profile.preferred_modality,
                "target_countries": desired_countries,
                "has_dependents": getattr(profile, "has_dependents", False)
            },
            "search_phase": {
                "max_results_limit": search_limit,
                "offset": offset,
                "seed_urls": seed_urls
            },
            "scraper_phase": {
                "pages_scraped_count": len(raw_pages),
                "pages": [{"url": p.get("url"), "title": p.get("title")} for p in raw_pages],
                "errors": scraper_errors
            },
            "extraction_phase": {
                "processed_pages": []
            },
            "aggregate_metrics": {
                "total_scholarships_added": 0,
                "total_programs_added": 0,
                "total_input_tokens": 0,
                "total_output_tokens": 0,
                "total_cost_usd": 0.0
            }
        }
        
        # 3. AI Extractor & Scorer (Phase 3)
        new_scholarship_count = 0
        new_program_count = 0
        total_in = 0
        total_out = 0
        total_cost = 0.0
        
        pages_to_process = len(raw_pages)
        if pages_to_process > 0:
            yield json.dumps({"step": "analyzing", "message": f"Scraped {pages_to_process} pages. Starting AI analysis and relevance check...", "progress": 45}) + "\n"
        else:
            yield json.dumps({"step": "analyzing", "message": "No pages scraped. Skipping AI analysis...", "progress": 45}) + "\n"
            
        for idx, page_data in enumerate(raw_pages):
            yield json.dumps({
                "step": "analyzing", 
                "message": f"Analyzing page {idx+1} of {pages_to_process}: {page_data.get('title', '')[:30]}...", 
                "progress": 45 + int(((idx + 1) / pages_to_process) * 45)
            }) + "\n"
            
            extracted = extract_page_content(profile_dict, page_data)
            if not extracted:
                scan_log["extraction_phase"]["processed_pages"].append({
                    "url": page_data["url"],
                    "title": page_data.get("title"),
                    "status": "failed (LLM error)"
                })
                continue
                
            # Accumulate token metrics
            tokens = extracted.get("token_usage", {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0})
            total_in += tokens.get("input_tokens", 0)
            total_out += tokens.get("output_tokens", 0)
            total_cost += tokens.get("cost_usd", 0.0)
            
            page_log = {
                "url": page_data["url"],
                "title": page_data.get("title"),
                "is_valid": extracted.get("is_valid", False),
                "scholarships_found": len(extracted.get("scholarships", [])),
                "programs_found": len(extracted.get("programs", [])),
                "token_usage": tokens
            }
            scan_log["extraction_phase"]["processed_pages"].append(page_log)
            
            if extracted.get("is_valid"):
                # Handle Scholarships
                for sch in extracted.get("scholarships", []):
                    existing = db.query(Scholarship).filter(Scholarship.url == page_data["url"], Scholarship.title == sch.get("title")).first()
                    if not existing:
                        new_scholarship = Scholarship(
                            title=sch.get("title", page_data["title"]),
                            provider=sch.get("provider", "Unknown Provider"),
                            amount=sch.get("amount"),
                            deadline=None, 
                            description=sch.get("description", ""),
                            url=page_data.get("url"),
                            desire_score=sch.get("desire_score", 0),
                            probability_score=sch.get("probability_score", 0),
                            requires_outreach=sch.get("requires_outreach", False),
                            benefits_summary=sch.get("benefits_summary", "")
                        )
                        db.add(new_scholarship)
                        new_scholarship_count += 1

                # Handle Programs
                for prog in extracted.get("programs", []):
                    existing = db.query(TargetProgram).filter(TargetProgram.url == page_data["url"], TargetProgram.title == prog.get("title")).first()
                    if not existing:
                        new_program = TargetProgram(
                            title=prog.get("title", "Unknown Program"),
                            university=prog.get("university", "Unknown University"),
                            country=prog.get("country", ""),
                            url=page_data.get("url"),
                            is_online=prog.get("is_online", False),
                            is_hybrid=prog.get("is_hybrid", False),
                            accepts_international=prog.get("accepts_international", True),
                            details=prog.get("details", ""),
                            steps=prog.get("steps", ""),
                            important_info=prog.get("important_info", ""),
                            next_steps=prog.get("next_steps", ""),
                            desire_score=prog.get("desire_score", 0),
                            probability_score=prog.get("probability_score", 0)
                        )
                        db.add(new_program)
                        new_program_count += 1
                        
        yield json.dumps({"step": "saving", "message": "Saving matches and generating execution logs...", "progress": 95}) + "\n"
        db.commit()
        
        # Save aggregate metrics
        scan_log["aggregate_metrics"]["total_scholarships_added"] = new_scholarship_count
        scan_log["aggregate_metrics"]["total_programs_added"] = new_program_count
        scan_log["aggregate_metrics"]["total_input_tokens"] = total_in
        scan_log["aggregate_metrics"]["total_output_tokens"] = total_out
        scan_log["aggregate_metrics"]["total_cost_usd"] = total_cost
        
        # Write to log file
        logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "discovery_logs")
        os.makedirs(logs_dir, exist_ok=True)
        
        log_filename = f"scan_{scan_time.strftime('%Y%m%d_%H%M%S')}.json"
        log_filepath = os.path.join(logs_dir, log_filename)
        try:
            with open(log_filepath, "w", encoding="utf-8") as lf:
                json.dump(scan_log, lf, indent=2)
        except Exception as le:
            print(f"Failed to write discovery scan log: {le}")
            
        yield json.dumps({
            "step": "complete", 
            "message": f"Scan complete! Discovered {new_scholarship_count} scholarships and {new_program_count} programs.", 
            "progress": 100,
            "new_count": new_scholarship_count + new_program_count
        }) + "\n"
        
    return StreamingResponse(scan_generator(), media_type="application/x-ndjson")

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
