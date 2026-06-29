import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
import json
import logging
from huey import SqliteHuey
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Profile, TargetProgram, Scholarship
from ai_agent import extract_page_content
import re

logger = logging.getLogger("huey")
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'huey_tasks.db')
huey = SqliteHuey(filename=db_path)

def is_university_specialized_blacklisted(uni_name: str, target_disciplines: str, major: str) -> bool:
    disallowed_keywords = [
        "medicine", "pharmacy", "pharmaceutical", "veterinary", "dentistry",
        "nursing", "conservatory", "art school", "music school", "theology",
        "theological", "seminary"
    ]
    uni_lower = uni_name.lower()
    user_context = (target_disciplines + " " + major).lower()
    
    for kw in disallowed_keywords:
        if kw in uni_lower:
            if kw not in user_context:
                return True
    return False

def is_program_subject_blacklisted(title: str, target_disciplines: str, major: str) -> bool:
    disallowed_keywords = [
        "medical", "medicine", "pharmacy", "pharmaceutical", "veterinary", 
        "dentistry", "nurse", "nursing", "clinical", "anatomy", "zoology",
        "music", "conservatory", "theater", "theatre", "art", "dance", 
        "history", "literature", "philosophy", "theology", "biology"
    ]
    title_lower = title.lower()
    user_context = (target_disciplines + " " + major).lower()
    
    for kw in disallowed_keywords:
        if kw in title_lower:
            if kw not in user_context:
                return True
    return False

def save_discovered_data(db: Session, extracted: dict, profile: Profile, default_uni_name: str = None, is_targeted: bool = False):
    programs_created = []
    for prog in extracted.get("programs", []):
        university = prog.get("university")
        if not university or university.strip().lower() in ["example university", "example", ""]:
            university = default_uni_name or "Unknown University"
            
        existing = db.query(TargetProgram).filter(
            TargetProgram.university == university,
            TargetProgram.title == prog.get("title")
        ).first()
        if not existing:
            new_prog = TargetProgram(
                university=university,
                country=prog.get("country"),
                title=prog.get("title"),
                url=prog.get("url") or extracted.get("url"),
                is_online=prog.get("is_online", False),
                is_hybrid=prog.get("is_hybrid", False),
                accepts_international=prog.get("accepts_international", True),
                instruction_languages=",".join(prog.get("instruction_languages", [])),
                offers_language_training=prog.get("offers_language_training", False),
                foreigner_friendly=prog.get("foreigner_friendly", True),
                details=prog.get("details", ""),
                steps=prog.get("steps", ""),
                important_info=prog.get("important_info", ""),
                next_steps=prog.get("next_steps", ""),
                desire_score=prog.get("desire_score", 0),
                probability_score=prog.get("probability_score", 0),
                improvement_projection=prog.get("improvement_projection", ""),
                is_targeted=is_targeted
            )
            db.add(new_prog)
            programs_created.append(new_prog)
    db.commit()
    
    for sch in extracted.get("scholarships", []):
        # We need url for uniqueness check safely
        url = sch.get("url", "")
        provider = sch.get("provider")
        if not provider or provider.strip().lower() in ["example university", "example", ""]:
            provider = default_uni_name or "Unknown Provider"
            
        existing = db.query(Scholarship).filter(Scholarship.url == url, Scholarship.title == sch.get("title")).first()
        if not existing:
            new_sch = Scholarship(
                title=sch.get("title", ""),
                provider=provider,
                amount=sch.get("amount", ""),
                description=sch.get("description", ""),
                url=url,
                desire_score=sch.get("desire_score", 0),
                probability_score=sch.get("probability_score", 0),
                improvement_projection=sch.get("improvement_projection", ""),
                requires_outreach=sch.get("requires_outreach", False),
                benefits_summary=sch.get("benefits_summary", "")
            )
            if programs_created:
                new_sch.target_program_id = programs_created[0].id
            db.add(new_sch)
    db.commit()


def get_target_languages(profile: Profile) -> list:
    languages = set(["english"]) # Always include english
    
    if profile.languages:
        try:
            langs = json.loads(profile.languages)
            for l in langs:
                lang_name = l.get("language", "").lower() if isinstance(l, dict) else str(l).lower()
                if lang_name:
                    languages.add(lang_name.strip())
        except:
            for l in profile.languages.split(","):
                languages.add(l.strip().lower())
                
    country_to_lang = {
        "fr": "french", "es": "spanish", "de": "german", "it": "italian", 
        "jp": "japanese", "kr": "korean", "cn": "chinese (simplified)", 
        "br": "portuguese", "pt": "portuguese", "ru": "russian", "nl": "dutch"
    }
    if profile.target_countries:
        try:
            targets = json.loads(profile.target_countries)
            for t in targets:
                c = t.get("country", "").lower()
                if c in country_to_lang:
                    languages.add(country_to_lang[c])
        except:
            pass
            
    return list(languages)

def get_translated_keywords(profile: Profile, target_languages: list) -> list:
    core_keywords = ["program", "degree", "admission", "curriculum", "course", "scholarship", "financial aid"]
    if profile.major:
        major_parts = profile.major.lower().split()
        core_keywords.extend(major_parts)
    if profile.target_areas:
        target_parts = profile.target_areas.lower().replace(',', ' ').split()
        core_keywords.extend(target_parts)
    if hasattr(profile, "degree_level") and profile.degree_level:
        core_keywords.append(profile.degree_level.lower())
        
    final_keywords = set(core_keywords)
    
    try:
        from deep_translator import GoogleTranslator
        for lang in target_languages:
            if lang == "english":
                continue
            try:
                translator = GoogleTranslator(source='auto', target=lang)
                for kw in core_keywords:
                    translated = translator.translate(kw)
                    if translated:
                        final_keywords.add(translated.lower())
            except Exception as e:
                logger.warning(f"Failed to translate to {lang}: {e}")
    except ImportError:
        logger.warning("deep-translator not installed. Falling back to English keywords.")
        
    return list(final_keywords)

def calculate_relevance_density(html_text: str, translated_keywords: list) -> float:
    """
    Tier 1 Gatekeeper: Calculates keyword density to instantly discard irrelevant pages.
    """
    if not html_text:
        return 0.0
        
    text = html_text.lower()
    total_words = len(text.split())
    min_words = int(os.getenv('GATEKEEPER_MIN_WORDS', 50))
    if total_words < min_words:
        return 0.0
        
    matches = sum(len(re.findall(r'\b' + re.escape(kw) + r'\b', text)) for kw in translated_keywords)
    
    # We just want to ensure AT LEAST 1 keyword is found.
    # Calculate density (matches per 1000 words)
    density = (matches / total_words) * 1000
    min_density = float(os.getenv('GATEKEEPER_MIN_DENSITY', 0.2))
    if matches > 0 and density < min_density:
        density = min_density # boost slightly if they at least have a match so we don't reject purely on length
        
    return density

def format_elapsed_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    parts = []
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0 or hours > 0:
        parts.append(f"{minutes}m")
    parts.append(f"{secs}s")
    return " ".join(parts)

@huey.task()
def run_mass_discovery_job(job_id: str, profile_id: int, scan_limit: int = None):
    """
    Background job to scan hundreds of universities asynchronously.
    """
    if scan_limit is None:
        scan_limit = int(os.getenv('MASS_DISCOVERY_SCAN_LIMIT', 100))
        
    import time
    start_time = time.time()
    
    logger.info(f"Starting mass discovery job for profile ID: {profile_id} at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Update job status tracking
    status_file = os.path.join(os.path.dirname(__file__), "discovery_logs", f"job_{job_id}.json")
    os.makedirs(os.path.dirname(status_file), exist_ok=True)
    
    processed_pages = []
    
    def update_status(status, progress, message, extra_stats=None):
        status_data = {
            "status": status,
            "progress": progress,
            "message": message,
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        }
        if extra_stats:
            status_data["stats"] = extra_stats
        if processed_pages:
            status_data["processed_pages"] = processed_pages
            
        with open(status_file, "w", encoding="utf-8") as f:
            json.dump(status_data, f, indent=2)
    update_status("running", 5, "Initializing mass discovery...")
    
    db: Session = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            update_status("failed", 0, "Profile not found")
            return
            
        update_status("running", 10, "Loading university domain database...")
        
        universities_file = os.path.join(os.path.dirname(__file__), "universities.json")
        if not os.path.exists(universities_file):
            logger.error("universities.json not found. Did you run fetch_ror.py?")
            update_status("failed", 0, "Database missing. Please run fetch_ror.py")
            return
            
        with open(universities_file, "r", encoding="utf-8") as f:
            universities = json.load(f)
            
        # Target domains based on preferred countries
        targets = []
        desired_iso = set()
        try:
            profile_targets = json.loads(profile.target_countries) if profile.target_countries else []
            desired_countries_raw = [t.get("country").strip() for t in profile_targets if t.get("country")]
            
            profile_undesired = json.loads(profile.undesired_countries) if profile.undesired_countries else []
            undesired_countries_raw = [t.get("country").strip() for t in profile_undesired if t.get("country")]
            
            from continent_mapper import expand_continents_to_iso
            
            desired_iso = expand_continents_to_iso(desired_countries_raw)
            undesired_iso = expand_continents_to_iso(undesired_countries_raw)
            
            # Remove avoided countries
            desired_iso = desired_iso - undesired_iso
            
        except Exception as e:
            logger.error(f"Error parsing countries: {e}")
            desired_iso = set()
            
        profile_dict = {
            "major": profile.major,
            "target_areas": profile.target_areas,
            "target_disciplines": profile.target_areas,
            "gpa": profile.gpa,
            "career_goals": profile.career_goals,
            "target_degree_level": getattr(profile, "target_degree_level", "Masters"),
            "target_study_type": getattr(profile, "target_study_type", "Taught")
        }
        
        seed_urls = []
        from bs4 import BeautifulSoup
        import requests
        from urllib.parse import urljoin
        from ai_agent import evaluate_navigation_links
        
        target_unis = []
        from models import ScannedUniversity, BlacklistedUniversity
        try:
            scanned_list = {su.name for su in db.query(ScannedUniversity).all()}
            blacklisted_unis = {bu.name for bu in db.query(BlacklistedUniversity).all()}
        except Exception as se:
            logger.error(f"Failed to query scanned/blacklisted universities: {se}")
            scanned_list = set()
            blacklisted_unis = set()

        for uni in universities:
            # Check country alignment
            if desired_iso and uni.get("country") not in desired_iso:
                continue
            domains = uni.get("domains", [])
            if domains:
                domain = domains[0]
                uni_name = uni.get("name", domain)
                if uni_name in scanned_list:
                    continue
                if uni_name in blacklisted_unis:
                    logger.info(f"Skipping blacklisted university: {uni_name}")
                    continue
                if is_university_specialized_blacklisted(uni_name, profile.target_areas or "", profile.major or ""):
                    logger.info(f"Skipping specialized/irrelevant university: {uni_name}")
                    continue
                target_unis.append((uni_name, domain))
                
            if len(target_unis) >= max(1, scan_limit // 2):
                break
                
        if not target_unis:
            update_status("completed", 100, "No target domains matched profile preferences.")
            return
            
        import threading
        from concurrent.futures import ThreadPoolExecutor
        
        status_lock = threading.Lock()
        seed_urls_lock = threading.Lock()
        scanned_lock = threading.Lock()
        scanned_count = 0
        total_unis = len(target_unis)

        def is_cancelled():
            with status_lock:
                try:
                    if os.path.exists(status_file):
                        with open(status_file, "r") as f:
                            data = json.load(f)
                            return data.get("status") == "canceled" or data.get("canceled") is True
                except Exception:
                    pass
                return False

        def safe_update_status(status, progress, message):
            with status_lock:
                update_status(status, progress, message)

        def process_single_university_scout(uni_name, domain):
            nonlocal scanned_count
            if is_cancelled():
                return
                
            with scanned_lock:
                current_idx = min(total_unis, scanned_count + 1)
            progress = 20 + int(10 * (scanned_count / total_unis))
            safe_update_status("running", progress, f"Scout AI analyzing website {current_idx} of {total_unis} ({uni_name})...")
            
            thread_db = SessionLocal()
            try:
                homepage = f"https://{domain}"
                logger.info(f"[Scout] Fetching homepage for {uni_name} ({homepage})...")
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                res = requests.get(homepage, headers=headers, timeout=10, verify=False)
                soup = BeautifulSoup(res.text, 'html.parser')
                
                links_found = []
                for a in soup.find_all('a', href=True):
                    text = a.get_text(strip=True)
                    href = a['href']
                    if not text or href.startswith('javascript:') or href.startswith('mailto:') or href.startswith('tel:'):
                        continue
                    full_url = urljoin(homepage, href)
                    if domain in full_url:
                        links_found.append({"text": text, "url": full_url})
                        
                unique_links = []
                seen = set()
                for link in links_found:
                    if link['url'] not in seen:
                        seen.add(link['url'])
                        unique_links.append(link)
                        
                logger.info(f"[Scout] Extracted {len(unique_links)} internal links for {uni_name}. Sending to AI for routing decision...")
                
                is_relevant, selected = evaluate_navigation_links(unique_links, profile_dict, uni_name)
                
                if not is_relevant:
                    logger.info(f"[Scout] AI determined {uni_name} is specialized/irrelevant to profile. Skipping.")
                    return
                    
                with seed_urls_lock:
                    if not selected:
                        logger.warning(f"[Scout] AI returned no links for {uni_name}. Falling back to homepage.")
                        seed_urls.append({"url": homepage, "uni_name": uni_name})
                    else:
                        logger.info(f"[Scout] AI decided the {len(selected)} most relevant links are: {', '.join(selected)}")
                        for s in selected:
                            full_s = urljoin(homepage, s)
                            seed_urls.append({"url": full_s, "uni_name": uni_name})
                            
            except Exception as e:
                logger.error(f"[Scout] Error exploring {domain}: {e}")
            finally:
                # Mark university as scanned internally so it is not processed again
                try:
                    from models import ScannedUniversity
                    from datetime import datetime
                    existing_scan = thread_db.query(ScannedUniversity).filter(ScannedUniversity.name == uni_name).first()
                    if not existing_scan:
                        thread_db.add(ScannedUniversity(name=uni_name))
                    else:
                        existing_scan.scanned_at = datetime.utcnow()
                    thread_db.commit()
                except Exception as se:
                    logger.error(f"Error marking university {uni_name} as scanned: {se}")
                    thread_db.rollback()
                finally:
                    thread_db.close()
                
                with scanned_lock:
                    scanned_count += 1
                    current_count = scanned_count
                
                progress = 20 + int(10 * (current_count / total_unis))
                safe_update_status("running", progress, f"Scout AI analyzing website {current_count} of {total_unis}...")

        safe_update_status("running", 20, f"Scout AI exploring {len(target_unis)} university homepages...")
        logger.info(f"Scout AI started exploration for {len(target_unis)} universities.")
        
        max_workers = int(os.getenv('SCOUT_MAX_CONCURRENCY', 5))
        logger.info(f"[Scout] Running concurrently with max_workers={max_workers}")
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(process_single_university_scout, uni_name, domain) for uni_name, domain in target_unis]
            for fut in futures:
                try:
                    fut.result()
                except Exception as ex:
                    logger.error(f"[Scout] Worker thread error: {ex}")
                
        if not seed_urls:
            if is_cancelled():
                update_status("canceled", 20, "Scan cancelled by user. No URLs were processed.")
            else:
                update_status("completed", 100, "Scout AI failed to find any valid URLs.")
            return
            
        update_status("running", 30, f"Beginning Deep Crawl of {len(seed_urls)} AI-selected pages...")
        logger.info(f"Targeting {len(seed_urls)} AI-selected URLs. Preparing to start crawling.")
        
        # We process sequentially for safety but this could be batched
        processed_count = 0
        total_seeds = len(seed_urls)
        stats = {
            "crawled": 0,
            "gatekeeper_passed": 0,
            "gatekeeper_rejected": 0,
            "errors": 0,
            "programs_found": 0,
            "scholarships_found": 0
        }
        
        # Profile dict moved above
        
        # 1. Dynamically find target languages and translate keywords
        target_languages = get_target_languages(profile)
        translated_keywords = get_translated_keywords(profile, target_languages)
        logger.info(f"Using multilingual keywords for gatekeeper in languages: {target_languages}")
        
        from scraper import fetch_scholarships_real
        from main import get_db
        
        for i, seed in enumerate(seed_urls):
            if is_cancelled():
                logger.info(f"Mass scan job {job_id} cancelled during Crawl phase.")
                break
                
            url = seed["url"]
            uni_name = seed["uni_name"]
            processed_count += 1
            progress = 30 + int(70 * (processed_count / total_seeds))
            
            elapsed_time = time.time() - start_time
            avg_time = elapsed_time / processed_count
            elapsed_str = format_elapsed_time(elapsed_time)
            update_status("running", progress, f"Extracting opportunities: {uni_name} (page {processed_count} of {total_seeds})... [Avg: {avg_time:.1f}s/page]")
            
            try:
                # Crawl the page
                result = fetch_scholarships_real([url], profile_dict)
                pages = result.get("pages", [])
                stats["crawled"] += 1
                
                if not pages:
                    err_msg = "Unknown scraping error"
                    errors = result.get("errors", [])
                    if errors:
                        for err in errors:
                            if isinstance(err, dict) and err.get("url") == url:
                                err_msg = err.get("error", err_msg)
                                break
                            elif isinstance(err, str) and url in err:
                                err_msg = err
                                break
                    processed_pages.append({
                        "url": url,
                        "uni_name": uni_name,
                        "status": "failed (scraping failed)",
                        "error_detail": err_msg
                    })
                
                for page in pages:
                    html_text = page.get("text", "")
                    
                    # Tier 1 Heuristic Gatekeeper
                    density = calculate_relevance_density(html_text, translated_keywords)
                    min_density = float(os.getenv('GATEKEEPER_MIN_DENSITY', 0.2))
                    if density < min_density:  # Arbitrary threshold for relevancy
                        logger.info(f"Tier 1 Gatekeeper rejected {url} (Density: {density:.2f} < {min_density})")
                        stats["gatekeeper_rejected"] += 1
                        processed_pages.append({
                            "url": url,
                            "uni_name": uni_name,
                            "status": "rejected (gatekeeper)",
                            "keyword_density": round(density, 4),
                            "min_required_density": min_density
                        })
                        continue
                        
                    logger.info(f"Tier 1 Gatekeeper PASSED {url} (Density: {density:.2f}). Sending to LLM...")
                    stats["gatekeeper_passed"] += 1
                    
                    # Tier 2 Deep Extraction
                    target_context = {"university": uni_name, "title": "Any relevant academic program or scholarship"}
                    try:
                        extracted = extract_page_content(profile_dict, page, target_program_context=target_context, is_mass_scan=True)
                        if extracted:
                            # Filter out low-relevance matching programs (desire_score < 50) and disallowed subjects
                            filtered_programs = []
                            for p in extracted.get("programs", []):
                                desire = p.get("desire_score", 0)
                                title = p.get("title", "")
                                if desire >= 50:
                                    if not is_program_subject_blacklisted(title, profile.target_areas or "", profile.major or ""):
                                        filtered_programs.append(p)
                                    else:
                                        logger.info(f"[Filter] Discarding program '{title}' because subject matches specialized blacklist.")
                            extracted["programs"] = filtered_programs
                            
                            is_valid = extracted.get("is_valid", False)
                            p_count = len(filtered_programs)
                            s_count = len(extracted.get("scholarships", []))
                            
                            # If no relevant programs or scholarships remain, mark page as invalid
                            if p_count == 0 and s_count == 0:
                                is_valid = False
                                extracted["is_valid"] = False
                                extracted["relevance_rejection_reason"] = "No programs matched the user's field of interest (desire score below threshold)."
                            
                            processed_pages.append({
                                "url": url,
                                "uni_name": uni_name,
                                "status": "completed",
                                "keyword_density": round(density, 4),
                                "is_valid": is_valid,
                                "relevance_rejection_reason": extracted.get("relevance_rejection_reason"),
                                "programs_found": p_count,
                                "scholarships_found": s_count
                            })
                            
                            if is_valid:
                                # Save to db
                                save_discovered_data(db, extracted, profile, uni_name)
                                stats["programs_found"] += p_count
                                stats["scholarships_found"] += s_count
                        else:
                            stats["errors"] += 1
                            processed_pages.append({
                                "url": url,
                                "uni_name": uni_name,
                                "status": "failed (LLM returned None)",
                                "keyword_density": round(density, 4)
                            })
                    except Exception as le:
                        stats["errors"] += 1
                        processed_pages.append({
                            "url": url,
                            "uni_name": uni_name,
                            "status": "failed (LLM error)",
                            "keyword_density": round(density, 4),
                            "error_detail": str(le)
                        })
                        
            except Exception as e:
                logger.error(f"Error processing {url}: {e}")
                stats["errors"] += 1
                if not any(p.get("url") == url for p in processed_pages):
                    processed_pages.append({
                        "url": url,
                        "uni_name": uni_name,
                        "status": "failed (crashed)",
                        "error_detail": str(e)
                    })
                
        total_time = time.time() - start_time
        if is_cancelled():
            final_msg = f"Mass discovery scan cancelled by user after {total_time:.1f}s. Scanned: {stats['crawled']}, Discovered {stats['programs_found']} programs and {stats['scholarships_found']} scholarships."
            logger.info(final_msg)
            update_status("canceled", progress, final_msg, extra_stats=stats)
        else:
            final_msg = f"Mass discovery scan complete in {total_time:.1f}s. Scanned: {stats['crawled']}, Passed Gatekeeper: {stats['gatekeeper_passed']}, Errors: {stats['errors']}. Discovered {stats['programs_found']} programs and {stats['scholarships_found']} scholarships."
            logger.info(final_msg)
            update_status("completed", 100, final_msg, extra_stats=stats)
        
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Mass discovery job failed after {total_time:.1f}s: {e}")
        update_status("failed", 0, f"Failed after {total_time:.1f}s: {str(e)}", extra_stats={"errors": 1})
    finally:
        db.close()


@huey.task()
def run_targeted_discovery_job(job_id: str, profile_id: int, target_unis: list):
    """
    Background job to scan a specific list of target universities asynchronously.
    """
    import time
    start_time = time.time()
    
    logger.info(f"Starting targeted discovery job for profile ID: {profile_id} at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Update job status tracking
    status_file = os.path.join(os.path.dirname(__file__), "discovery_logs", f"job_{job_id}.json")
    os.makedirs(os.path.dirname(status_file), exist_ok=True)
    
    processed_pages = []
    
    def update_status(status, progress, message, extra_stats=None):
        status_data = {
            "status": status,
            "progress": progress,
            "message": message,
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        }
        if extra_stats:
            status_data["stats"] = extra_stats
        if processed_pages:
            status_data["processed_pages"] = processed_pages
            
        with open(status_file, "w", encoding="utf-8") as f:
            json.dump(status_data, f, indent=2)
            
    update_status("running", 5, "Initializing targeted discovery...")
    
    db: Session = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            update_status("failed", 0, "Profile not found")
            return
            
        profile_dict = {
            "major": profile.major,
            "target_areas": profile.target_areas,
            "target_disciplines": profile.target_areas,
            "gpa": profile.gpa,
            "career_goals": profile.career_goals,
            "target_degree_level": getattr(profile, "target_degree_level", "Masters"),
            "target_study_type": getattr(profile, "target_study_type", "Taught")
        }
        
        target_unis_parsed = []
        for item in target_unis:
            name = item.get("name")
            domain = item.get("domain")
            if name and domain:
                target_unis_parsed.append((name, domain))
                
        if not target_unis_parsed:
            update_status("completed", 100, "No target universities provided.")
            return
            
        seed_urls = []
        from bs4 import BeautifulSoup
        import requests
        from urllib.parse import urljoin
        from ai_agent import evaluate_navigation_links
        
        import threading
        from concurrent.futures import ThreadPoolExecutor
        
        status_lock = threading.Lock()
        seed_urls_lock = threading.Lock()
        scanned_lock = threading.Lock()
        scanned_count = 0
        total_unis = len(target_unis_parsed)

        def is_cancelled():
            with status_lock:
                try:
                    if os.path.exists(status_file):
                        with open(status_file, "r") as f:
                            data = json.load(f)
                            return data.get("status") == "canceled" or data.get("canceled") is True
                except Exception:
                    pass
                return False

        def safe_update_status(status, progress, message):
            with status_lock:
                update_status(status, progress, message)

        def process_single_university_scout(uni_name, domain):
            nonlocal scanned_count
            if is_cancelled():
                return
                
            with scanned_lock:
                current_idx = min(total_unis, scanned_count + 1)
            progress = 20 + int(10 * (scanned_count / total_unis))
            safe_update_status("running", progress, f"Scout AI analyzing website {current_idx} of {total_unis} ({uni_name})...")
            
            thread_db = SessionLocal()
            try:
                homepage = f"https://{domain}"
                logger.info(f"[Scout] Fetching homepage for {uni_name} ({homepage})...")
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                res = requests.get(homepage, headers=headers, timeout=10, verify=False)
                soup = BeautifulSoup(res.text, 'html.parser')
                
                links_found = []
                for a in soup.find_all('a', href=True):
                    text = a.get_text(strip=True)
                    href = a['href']
                    if not text or href.startswith('javascript:') or href.startswith('mailto:') or href.startswith('tel:'):
                        continue
                    full_url = urljoin(homepage, href)
                    if domain in full_url:
                        links_found.append({"text": text, "url": full_url})
                        
                unique_links = []
                seen = set()
                for link in links_found:
                    if link['url'] not in seen:
                        seen.add(link['url'])
                        unique_links.append(link)
                        
                logger.info(f"[Scout] Extracted {len(unique_links)} internal links for {uni_name}. Sending to AI for routing decision...")
                
                is_relevant, selected = evaluate_navigation_links(unique_links, profile_dict, uni_name)
                
                if not is_relevant:
                    logger.info(f"[Scout] AI determined {uni_name} is specialized/irrelevant to profile. Skipping.")
                    return
                    
                with seed_urls_lock:
                    if not selected:
                        logger.warning(f"[Scout] AI returned no links for {uni_name}. Falling back to homepage.")
                        seed_urls.append({"url": homepage, "uni_name": uni_name})
                    else:
                        logger.info(f"[Scout] AI decided the {len(selected)} most relevant links are: {', '.join(selected)}")
                        for s in selected:
                            full_s = urljoin(homepage, s)
                            seed_urls.append({"url": full_s, "uni_name": uni_name})
                            
            except Exception as e:
                logger.error(f"[Scout] Error exploring {domain}: {e}")
            finally:
                # Mark university as scanned internally with current timestamp
                try:
                    from models import ScannedUniversity
                    from datetime import datetime
                    existing_scan = thread_db.query(ScannedUniversity).filter(ScannedUniversity.name == uni_name).first()
                    if not existing_scan:
                        thread_db.add(ScannedUniversity(name=uni_name))
                    else:
                        existing_scan.scanned_at = datetime.utcnow()
                    thread_db.commit()
                except Exception as se:
                    logger.error(f"Error marking university {uni_name} as scanned: {se}")
                    thread_db.rollback()
                finally:
                    thread_db.close()
                
                with scanned_lock:
                    scanned_count += 1
                    current_count = scanned_count
                
                progress = 20 + int(10 * (current_count / total_unis))
                safe_update_status("running", progress, f"Scout AI analyzing website {current_count} of {total_unis}...")

        safe_update_status("running", 20, f"Scout AI exploring {len(target_unis_parsed)} university homepages...")
        
        max_workers = int(os.getenv('SCOUT_MAX_CONCURRENCY', 5))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(process_single_university_scout, uni_name, domain) for uni_name, domain in target_unis_parsed]
            for fut in futures:
                try:
                    fut.result()
                except Exception as ex:
                    logger.error(f"[Scout] Worker thread error: {ex}")
                
        if not seed_urls:
            if is_cancelled():
                update_status("canceled", 20, "Scan cancelled by user. No URLs were processed.")
            else:
                update_status("completed", 100, "Scout AI failed to find any valid URLs.")
            return
            
        update_status("running", 30, f"Beginning Deep Crawl of {len(seed_urls)} AI-selected pages...")
        
        processed_count = 0
        total_seeds = len(seed_urls)
        stats = {
            "crawled": 0,
            "gatekeeper_passed": 0,
            "gatekeeper_rejected": 0,
            "errors": 0,
            "programs_found": 0,
            "scholarships_found": 0
        }
        
        target_languages = get_target_languages(profile)
        translated_keywords = get_translated_keywords(profile, target_languages)
        
        from scraper import fetch_scholarships_real
        
        for i, seed in enumerate(seed_urls):
            if is_cancelled():
                break
                
            url = seed["url"]
            uni_name = seed["uni_name"]
            processed_count += 1
            progress = 30 + int(70 * (processed_count / total_seeds))
            
            elapsed_time = time.time() - start_time
            avg_time = elapsed_time / processed_count
            update_status("running", progress, f"Extracting: {uni_name} ({processed_count}/{total_seeds})... [Avg: {avg_time:.1f}s/page]")
            
            try:
                result = fetch_scholarships_real([url], profile_dict)
                pages = result.get("pages", [])
                stats["crawled"] += 1
                
                if not pages:
                    err_msg = "Unknown scraping error"
                    errors = result.get("errors", [])
                    if errors:
                        for err in errors:
                            if isinstance(err, dict) and err.get("url") == url:
                                err_msg = err.get("error", err_msg)
                                break
                    processed_pages.append({
                        "url": url,
                        "uni_name": uni_name,
                        "status": "failed (scraping failed)",
                        "error_detail": err_msg
                    })
                
                for page in pages:
                    html_text = page.get("text", "")
                    
                    density = calculate_relevance_density(html_text, translated_keywords)
                    min_density = float(os.getenv('GATEKEEPER_MIN_DENSITY', 0.2))
                    if density < min_density:
                        stats["gatekeeper_rejected"] += 1
                        processed_pages.append({
                            "url": url,
                            "uni_name": uni_name,
                            "status": "rejected (gatekeeper)",
                            "keyword_density": round(density, 4),
                            "min_required_density": min_density
                        })
                        continue
                        
                    stats["gatekeeper_passed"] += 1
                    
                    target_context = {"university": uni_name, "title": "Any relevant academic program or scholarship"}
                    try:
                        extracted = extract_page_content(profile_dict, page, target_program_context=target_context, is_mass_scan=True)
                        if extracted:
                            filtered_programs = []
                            for p in extracted.get("programs", []):
                                desire = p.get("desire_score", 0)
                                title = p.get("title", "")
                                if desire >= 50:
                                    if not is_program_subject_blacklisted(title, profile.target_areas or "", profile.major or ""):
                                        filtered_programs.append(p)
                            extracted["programs"] = filtered_programs
                            
                            is_valid = extracted.get("is_valid", False)
                            p_count = len(filtered_programs)
                            s_count = len(extracted.get("scholarships", []))
                            
                            if p_count == 0 and s_count == 0:
                                is_valid = False
                                extracted["is_valid"] = False
                                extracted["relevance_rejection_reason"] = "No programs matched interest threshold."
                            
                            processed_pages.append({
                                "url": url,
                                "uni_name": uni_name,
                                "status": "completed",
                                "keyword_density": round(density, 4),
                                "is_valid": is_valid,
                                "relevance_rejection_reason": extracted.get("relevance_rejection_reason"),
                                "programs_found": p_count,
                                "scholarships_found": s_count
                            })
                            
                            if is_valid:
                                save_discovered_data(db, extracted, profile, uni_name, is_targeted=True)
                                stats["programs_found"] += p_count
                                stats["scholarships_found"] += s_count
                        else:
                            stats["errors"] += 1
                            processed_pages.append({
                                "url": url,
                                "uni_name": uni_name,
                                "status": "failed (LLM returned None)",
                                "keyword_density": round(density, 4)
                            })
                    except Exception as le:
                        stats["errors"] += 1
                        processed_pages.append({
                            "url": url,
                            "uni_name": uni_name,
                            "status": "failed (LLM error)",
                            "keyword_density": round(density, 4),
                            "error_detail": str(le)
                        })
                        
            except Exception as e:
                logger.error(f"Error processing {url}: {e}")
                stats["errors"] += 1
                if not any(p.get("url") == url for p in processed_pages):
                    processed_pages.append({
                        "url": url,
                        "uni_name": uni_name,
                        "status": "failed (crashed)",
                        "error_detail": str(e)
                    })
                
        total_time = time.time() - start_time
        if is_cancelled():
            final_msg = f"Targeted scan cancelled by user after {total_time:.1f}s. Scanned: {stats['crawled']}, Discovered {stats['programs_found']} programs."
            update_status("canceled", progress, final_msg, extra_stats=stats)
        else:
            final_msg = f"Targeted scan complete in {total_time:.1f}s. Scanned: {stats['crawled']}. Discovered {stats['programs_found']} programs."
            update_status("completed", 100, final_msg, extra_stats=stats)
            
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Targeted discovery job failed: {e}")
        update_status("failed", 0, f"Failed: {str(e)}", extra_stats={"errors": 1})
    finally:
        db.close()
