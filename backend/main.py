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
from models import Profile, Scholarship, ProfileDocument, TargetProgram, BlacklistedUniversity
from schemas import ProfileUpdate, ProfileResponse, ScholarshipResponse, ProfileDocumentResponse, TargetProgramResponse
from scraper import fetch_scholarships_real
from search_seeder import get_seed_urls
from ai_agent import score_scholarship, draft_essay, draft_outreach_email, parse_profile_from_document, extract_page_content, suggest_target_disciplines

app = FastAPI(title="Educational Pathfinder API")

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
    return {"message": "Welcome to the Educational Pathfinder API"}

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

@app.get("/profile/suggest-pivots")
def get_suggested_pivots(major: str, career_goals: str = ""):
    if not major:
        raise HTTPException(status_code=400, detail="Major is required")
    suggestions = suggest_target_disciplines(major, career_goals)
    return {"suggestions": suggestions}

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
    
    cv_fields = [
        "name", "major", "degree_level", "gpa", "demographics", 
        "extracurriculars", "hobbies", "volunteer_work", "projects", 
        "experience", "awards", "nationalities", "languages", 
        "publications", "financial_need", "career_goals", 
        "relocation_feasibility_score", "primary_goal"
    ]
    
    for key in cv_fields:
        if hasattr(profile, key):
            val = extracted_data.get(key)
            if val is None:
                if key in ["experience", "languages"]:
                    setattr(profile, key, "[]")
                elif key == "relocation_feasibility_score":
                    setattr(profile, key, None)
                else:
                    setattr(profile, key, "")
            else:
                setattr(profile, key, val)
            
    db.commit()
    db.refresh(profile)
    return profile

# --- Scholarship Endpoints ---
@app.get("/funding", response_model=list[ScholarshipResponse])
def get_all_scholarships(db: Session = Depends(get_db)):
    return db.query(Scholarship).filter(Scholarship.status != "Discarded").all()

@app.patch("/funding/{id}/discard")
def discard_scholarship(id: int, db: Session = Depends(get_db)):
    item = db.query(Scholarship).filter(Scholarship.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Funding not found")
    item.status = "Discarded"
    db.commit()
    return {"status": "discarded"}

# --- Target Program Endpoints ---
@app.get("/programs", response_model=list[TargetProgramResponse])
def get_all_programs(db: Session = Depends(get_db)):
    return db.query(TargetProgram).all()

@app.patch("/programs/{id}/discard")
def discard_program(id: int, db: Session = Depends(get_db)):
    item = db.query(TargetProgram).filter(TargetProgram.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Program not found")
    item.status = "Discarded"
    db.commit()
    return {"status": "discarded"}

@app.patch("/programs/{id}/restore")
def restore_program(id: int, db: Session = Depends(get_db)):
    item = db.query(TargetProgram).filter(TargetProgram.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Program not found")
    item.status = "Discovered"
    db.commit()
    return {"status": "restored"}

@app.get("/discovery/last-scan")
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


@app.get("/universities/{university_name}/deep-dive")
def get_university_deep_dive(university_name: str, db: Session = Depends(get_db)):
    """Fetches a deep dive summary and campus image for a specific university."""
    import urllib.parse
    import httpx
    import hashlib
    import logging

    decoded_name = urllib.parse.unquote(university_name)
    image_url = None
    description = f"Detailed information and application steps for programs at {decoded_name}."

    # Fetch official photograph using Wikidata Semantic API (Property P18)
    try:
        search_url = f"https://www.wikidata.org/w/api.php?action=wbsearchentities&search={urllib.parse.quote(decoded_name)}&language=en&format=json"
        res = httpx.get(search_url, timeout=5.0)
        data = res.json()
        
        if data.get("search") and len(data["search"]) > 0:
            entity_id = data["search"][0]["id"]
            claims_url = f"https://www.wikidata.org/w/api.php?action=wbgetclaims&entity={entity_id}&property=P18&format=json"
            res2 = httpx.get(claims_url, timeout=5.0)
            claims_data = res2.json()
            
            if "claims" in claims_data and "P18" in claims_data["claims"]:
                image_name = claims_data["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"]
                image_name = image_name.replace(" ", "_")
                # Generate Wikimedia Commons URL
                md5_hash = hashlib.md5(image_name.encode('utf-8')).hexdigest()
                image_url = f"https://upload.wikimedia.org/wikipedia/commons/{md5_hash[0]}/{md5_hash[0:2]}/{urllib.parse.quote(image_name)}"
    except Exception as e:
        logging.info(f"Could not fetch image for {decoded_name} via Wikidata: {e}")
        
    # We could also use an LLM call here to generate a short description if we wanted to
    return {
        "university": decoded_name,
        "image_url": image_url,
        "description": description
    }

@app.post("/programs/{program_id}/deep-scan")
def run_deep_program_scan(program_id: int, db: Session = Depends(get_db)):
    from ddgs import DDGS
    from scrapling import fetch
    from ai_agent import extract_deep_program_details
    
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile required to scan")
        
    program = db.query(TargetProgram).filter(TargetProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
        
    target_url = program.url
    if not target_url:
        # Search for the official program URL
        query = f"{program.title} {program.university} official requirements admissions"
        try:
            results = DDGS().text(query, max_results=3)
            for res in results:
                url = res.get("href")
                if url and "facebook.com" not in url and "findamasters.com" not in url:
                    target_url = url
                    program.url = target_url
                    break
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to find program URL: {str(e)}")
            
    if not target_url:
        raise HTTPException(status_code=404, detail="Could not locate official program URL to scrape.")
        
    # Scrape the URL
    try:
        page = fetch(target_url)
        page_text = page.text
        # Limit text size to avoid token limits
        max_page_len = int(os.getenv('DEEP_SCAN_MAX_PAGE_LENGTH', 40000))
        if len(page_text) > max_page_len:
            page_text = page_text[:max_page_len]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scrape URL {target_url}: {str(e)}")
        
    # Extract details
    target_context = {
        "title": program.title,
        "university": program.university
    }
    extracted = extract_deep_program_details(page_text, profile.__dict__, target_context)
    
    if extracted:
        program.details = extracted.get("details", program.details)
        program.steps = extracted.get("steps", program.steps)
        program.important_info = extracted.get("important_info", program.important_info)
        program.next_steps = extracted.get("next_steps", program.next_steps)
        db.commit()
        db.refresh(program)
        
    return {"status": "success", "program": program}

@app.post("/programs/{program_id}/find-funding")
def run_targeted_funding_scan(program_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import StreamingResponse
    import json
    
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile required to scan")
        
    program = db.query(TargetProgram).filter(TargetProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Target program not found")
        
    def funding_generator():
        yield json.dumps({"step": "init", "message": f"Initializing targeted funding search for {program.university}...", "progress": 5}) + "\n"
        
        import os
        import random
        offset = random.randint(0, 10)
        
        yield json.dumps({"step": "seeding", "message": "Querying for specific financial aid and scholarships...", "progress": 15}) + "\n"
        
        search_limit = int(os.getenv("SEARCH_MAX_RESULTS", 5))
        seed_urls = get_seed_urls(profile, offset=offset, limit=search_limit, targeted_university=program.university, targeted_program_title=program.title)
        
        yield json.dumps({"step": "crawling", "message": f"Found {len(seed_urls)} university resources. Crawling...", "progress": 30}) + "\n"
        
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
        
        new_scholarship_count = 0
        pages_to_process = len(raw_pages)
        if pages_to_process > 0:
            yield json.dumps({"step": "analyzing", "message": f"Scraped {pages_to_process} pages. Analyzing for funding...", "progress": 45}) + "\n"
        else:
            yield json.dumps({"step": "analyzing", "message": "No pages scraped.", "progress": 45}) + "\n"
            
        target_context = {
            "university": program.university,
            "title": program.title
        }
            
        for idx, page_data in enumerate(raw_pages):
            yield json.dumps({
                "step": "analyzing", 
                "message": f"Analyzing page {idx+1} of {pages_to_process}: {page_data.get('title', '')[:30]}...", 
                "progress": 45 + int(((idx + 1) / pages_to_process) * 45)
            }) + "\n"
            
            extracted = extract_page_content(profile_dict, page_data, target_program_context=target_context)
            if not extracted or not extracted.get("is_valid"):
                continue
                
            for sch in extracted.get("scholarships", []):
                existing = db.query(Scholarship).filter(Scholarship.url == page_data["url"], Scholarship.title == sch.get("title")).first()
                if not existing:
                    new_scholarship = Scholarship(
                        title=sch.get("title", page_data["title"]),
                        provider=sch.get("provider", program.university),
                        amount=sch.get("amount"),
                        deadline=None, 
                        description=sch.get("description", ""),
                        url=page_data.get("url"),
                        desire_score=sch.get("desire_score", 0),
                        probability_score=sch.get("probability_score", 0),
                        improvement_projection=sch.get("improvement_projection", ""),
                        requires_outreach=sch.get("requires_outreach", False),
                        benefits_summary=sch.get("benefits_summary", ""),
                        target_program_id=program.id
                    )
                    db.add(new_scholarship)
                    new_scholarship_count += 1
                    
        yield json.dumps({"step": "saving", "message": "Saving matching funding...", "progress": 95}) + "\n"
        db.commit()
        
        yield json.dumps({
            "step": "complete", 
            "message": f"Funding scan complete! Secured {new_scholarship_count} opportunities for this program.", 
            "progress": 100,
            "new_count": new_scholarship_count
        }) + "\n"
        
    return StreamingResponse(funding_generator(), media_type="application/x-ndjson")

@app.post("/funding/{scholarship_id}/draft")
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

@app.post("/funding/{scholarship_id}/outreach")
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

def check_for_active_job():
    """
    Scans the discovery logs for any active job, sorting by newest first
    and marking stale jobs (no updates for 15+ minutes) as failed.
    Returns a dict with job details if active, or None.
    """
    import os
    import json
    import time
    
    logs_dir = os.path.join(os.path.dirname(__file__), "discovery_logs")
    if not os.path.exists(logs_dir):
        return None
        
    job_files = []
    for f in os.listdir(logs_dir):
        if f.startswith("job_") and f.endswith(".json"):
            file_path = os.path.join(logs_dir, f)
            try:
                mtime = os.path.getmtime(file_path)
                job_files.append((f, file_path, mtime))
            except Exception:
                pass
                
    # Sort by modification time, newest first
    job_files.sort(key=lambda x: x[2], reverse=True)
    
    for f, file_path, mtime in job_files:
        try:
            with open(file_path, "r", encoding="utf-8") as jf:
                data = json.load(jf)
                status = data.get("status")
                
                # If the newest job is finished, then no job is active
                if status in ["completed", "failed", "canceled"]:
                    return None
                    
                if status in ["running", "pending"]:
                    current_time = time.time()
                    if current_time - mtime > 900: # 15 minutes
                        # Mark as failed/stale so it's ignored in the future
                        try:
                            data["status"] = "failed"
                            data["message"] = "Job timed out or was interrupted."
                            with open(file_path, "w", encoding="utf-8") as out_f:
                                json.dump(data, out_f, indent=2)
                        except Exception:
                            pass
                        continue
                        
                    job_id = f.replace("job_", "").replace(".json", "")
                    return {
                        "active_job_id": job_id,
                        "status": status,
                        "progress": data.get("progress", 0),
                        "message": data.get("message", "Running...")
                    }
        except Exception:
            pass
            
    return None

@app.post("/discovery/mass-scan")
def trigger_mass_discovery_scan(db: Session = Depends(get_db)):
    active_job = check_for_active_job()
    if active_job:
        raise HTTPException(
            status_code=400,
            detail="A mass discovery scan is already running. Please cancel or wait for it to finish."
        )

    from ai_agent import get_primary_llm
    if not get_primary_llm():
        raise HTTPException(
            status_code=400,
            detail="No active LLM available. Please ensure Ollama is running and has the llama3 model, or configure prioritized cloud LLM in your .env."
        )
        
    from worker import run_mass_discovery_job
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile required to scan")
    import glob
    import uuid
    from datetime import datetime
    
    logs_dir = os.path.join(os.path.dirname(__file__), "discovery_logs")
    os.makedirs(logs_dir, exist_ok=True)
    existing_jobs = glob.glob(os.path.join(logs_dir, "job_*.json"))
    
    indices = []
    for f in existing_jobs:
        basename = os.path.basename(f)
        parts = basename.split("_")
        if len(parts) >= 2 and parts[1].isdigit():
            indices.append(int(parts[1]))
            
    next_idx = max(indices) + 1 if indices else 1
    seq_str = f"{next_idx:03d}"
    date_str = datetime.now().strftime("%Y%m%d")
    
    job_id = f"{seq_str}_{date_str}"
    # Enqueue the job
    run_mass_discovery_job(job_id, profile.id)
    
    return {"job_id": job_id, "message": "Mass discovery job enqueued"}

@app.get("/discovery/active-job")
def get_active_job():
    active_job = check_for_active_job()
    if active_job:
        return active_job
    return {"active_job_id": None}


@app.get("/discovery/mass-scan/{job_id}/status")
def get_mass_discovery_status(job_id: str):
    import os
    import json
    status_file = os.path.join(os.path.dirname(__file__), "discovery_logs", f"job_{job_id}.json")
    if not os.path.exists(status_file):
        return {"status": "pending", "progress": 0, "message": "Job initializing..."}
        
    try:
        with open(status_file, "r") as f:
            data = json.load(f)
            return data
    except Exception:
        return {"status": "pending", "progress": 0, "message": "Reading status..."}

@app.post("/discovery/mass-scan/{job_id}/cancel")
def cancel_mass_discovery_scan(job_id: str):
    import os
    import json
    
    status_file = os.path.join(os.path.dirname(__file__), "discovery_logs", f"job_{job_id}.json")
    if not os.path.exists(status_file):
        raise HTTPException(status_code=404, detail="Job not found")
        
    try:
        progress = 0
        message = "Job cancelled."
        with open(status_file, "r") as f:
            data = json.load(f)
            progress = data.get("progress", 0)
            message = data.get("message", "Job cancelled.")
            
        with open(status_file, "w") as f:
            json.dump({
                "status": "canceled",
                "progress": progress,
                "message": "Cancelling scan... saving partial results.",
                "canceled": True,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, f, indent=2)
            
        try:
            from worker import huey
            huey.revoke_by_id(job_id)
        except Exception as he:
            print(f"Failed to revoke Huey task: {he}")
            
        return {"status": "cancelling", "message": "Cancellation request received."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel job: {e}")

# --- University Blacklist Endpoints ---
@app.post("/universities/{university_name}/blacklist")
def blacklist_university(university_name: str, db: Session = Depends(get_db)):
    existing = db.query(BlacklistedUniversity).filter(BlacklistedUniversity.name == university_name).first()
    if not existing:
        new_block = BlacklistedUniversity(name=university_name)
        db.add(new_block)
        
    # Mark all programs of this university as Discarded so they are hidden from dashboard
    programs = db.query(TargetProgram).filter(TargetProgram.university == university_name).all()
    for prog in programs:
        prog.status = "Discarded"
        
    db.commit()
    return {"status": "blacklisted", "university": university_name}

@app.delete("/universities/{university_name}/blacklist")
def restore_university(university_name: str, db: Session = Depends(get_db)):
    item = db.query(BlacklistedUniversity).filter(BlacklistedUniversity.name == university_name).first()
    if not item:
        raise HTTPException(status_code=404, detail="University not found on blacklist")
    db.delete(item)
    db.commit()
    return {"status": "restored", "university": university_name}

@app.get("/universities/blacklist")
def get_blacklisted_universities(db: Session = Depends(get_db)):
    items = db.query(BlacklistedUniversity).all()
    return [{"id": x.id, "name": x.name, "blacklisted_at": x.blacklisted_at} for x in items]
