import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import init_db, get_db
from models import Profile, Scholarship
from schemas import ProfileUpdate, ProfileResponse, ScholarshipResponse
from scraper import fetch_scholarships
from ai_agent import score_scholarship, draft_essay

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
            # Score it via LangChain
            profile_dict = {"major": profile.major, "gpa": profile.gpa, "demographics": profile.demographics}
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
        
    profile_dict = {"major": profile.major, "gpa": profile.gpa, "demographics": profile.demographics}
    scholarship_dict = {"title": scholarship.title, "description": scholarship.description}
    
    essay = draft_essay(profile_dict, scholarship_dict)
    
    scholarship.status = "Drafting"
    db.commit()
    
    return {"essay_draft": essay}
