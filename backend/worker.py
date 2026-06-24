import os
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

def save_discovered_data(db: Session, extracted: dict, profile: Profile):
    programs_created = []
    for prog in extracted.get("programs", []):
        existing = db.query(TargetProgram).filter(
            TargetProgram.university == prog.get("university"),
            TargetProgram.title == prog.get("title")
        ).first()
        if not existing:
            new_prog = TargetProgram(
                university=prog.get("university"),
                country=prog.get("country"),
                title=prog.get("title"),
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
                improvement_projection=prog.get("improvement_projection", "")
            )
            db.add(new_prog)
            programs_created.append(new_prog)
    db.commit()
    
    for sch in extracted.get("scholarships", []):
        # We need url for uniqueness check safely
        url = sch.get("url", "")
        existing = db.query(Scholarship).filter(Scholarship.url == url, Scholarship.title == sch.get("title")).first()
        if not existing:
            new_sch = Scholarship(
                title=sch.get("title", ""),
                provider=sch.get("provider", ""),
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
    if total_words < 50:
        return 0.0
        
    matches = sum(len(re.findall(r'\b' + re.escape(kw) + r'\b', text)) for kw in translated_keywords)
    
    # We just want to ensure AT LEAST 1 keyword is found.
    # Calculate density (matches per 1000 words)
    density = (matches / total_words) * 1000
    if matches > 0 and density < 0.2:
        density = 0.2 # boost slightly if they at least have a match so we don't reject purely on length
        
    return density

@huey.task()
def run_mass_discovery_job(job_id: str, profile_id: int, scan_limit: int = 100):
    """
    Background job to scan hundreds of universities asynchronously.
    """
    import time
    start_time = time.time()
    
    logger.info(f"Starting mass discovery job for profile ID: {profile_id} at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Update job status tracking
    status_file = os.path.join(os.path.dirname(__file__), "discovery_logs", f"job_{job_id}.json")
    
    def update_status(status, progress, message):
        with open(status_file, "w") as f:
            json.dump({"status": status, "progress": progress, "message": message}, f)
            
    os.makedirs(os.path.dirname(status_file), exist_ok=True)
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
            desired_countries_raw = [t.get("country").strip().lower() for t in profile_targets if t.get("country")]
            
            profile_undesired = json.loads(profile.undesired_countries) if profile.undesired_countries else []
            undesired_countries_raw = [t.get("country").strip().lower() for t in profile_undesired if t.get("country")]
            
            import pycountry
            
            # Helper to map a list of string names to ISO sets
            def map_to_iso(country_list):
                iso_set = set()
                for c in country_list:
                    if c == "europe":
                        # Add common European codes
                        iso_set.update(["GB", "FR", "DE", "IT", "ES", "NL", "BE", "CH", "SE", "DK", "NO", "FI", "IE", "AT", "PT", "PL", "CZ", "GR", "RO", "HU", "BG", "SK", "HR", "LT", "LV", "EE", "SI", "CY", "LU", "MT", "IS", "MD", "BY", "UA", "RU"])
                    else:
                        try:
                            res = pycountry.countries.get(name=c.title())
                            if res:
                                iso_set.add(res.alpha_2)
                            else:
                                res = pycountry.countries.search_fuzzy(c)
                                if res:
                                    iso_set.add(res[0].alpha_2)
                        except Exception:
                            pass
                return iso_set
                
            desired_iso = map_to_iso(desired_countries_raw)
            undesired_iso = map_to_iso(undesired_countries_raw)
            
            # Remove avoided countries
            desired_iso = desired_iso - undesired_iso
            
        except Exception as e:
            logger.error(f"Error parsing countries: {e}")
            desired_iso = set()
            
        profile_dict = {
            "major": profile.major,
            "target_areas": profile.target_areas,
            "gpa": profile.gpa,
            "career_goals": profile.career_goals
        }
        
        seed_urls = []
        from bs4 import BeautifulSoup
        import requests
        from urllib.parse import urljoin
        from ai_agent import evaluate_navigation_links
        
        target_unis = []
        for uni in universities:
            # Check country alignment
            if desired_iso and uni.get("country") not in desired_iso:
                continue
            domains = uni.get("domains", [])
            if domains:
                domain = domains[0]
                uni_name = uni.get("name", domain)
                target_unis.append((uni_name, domain))
                
            if len(target_unis) >= max(1, scan_limit // 2):
                break
                
        if not target_unis:
            update_status("completed", 100, "No target domains matched profile preferences.")
            return
            
        update_status("running", 20, f"Scout AI exploring {len(target_unis)} university homepages...")
        logger.info(f"Scout AI started exploration for {len(target_unis)} universities.")
        
        for uni_name, domain in target_unis:
            try:
                homepage = f"https://{domain}"
                logger.info(f"[Scout] Fetching homepage for {uni_name} ({homepage})...")
                # Using a standard user agent to avoid basic blocks
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
                    if domain in full_url: # only keep internal links
                        links_found.append({"text": text, "url": full_url})
                        
                # Dedup
                unique_links = []
                seen = set()
                for link in links_found:
                    if link['url'] not in seen:
                        seen.add(link['url'])
                        unique_links.append(link)
                        
                logger.info(f"[Scout] Extracted {len(unique_links)} internal links for {uni_name}. Sending to AI for routing decision...")
                
                selected = evaluate_navigation_links(unique_links, profile_dict, uni_name)
                
                if not selected:
                    logger.warning(f"[Scout] AI returned no links for {uni_name}. Falling back to homepage.")
                    seed_urls.append({"url": homepage, "uni_name": uni_name})
                else:
                    logger.info(f"[Scout] AI decided the {len(selected)} most relevant links are: {', '.join(selected)}")
                    for s in selected:
                        seed_urls.append({"url": s, "uni_name": uni_name})
                        
            except Exception as e:
                logger.error(f"[Scout] Error exploring {domain}: {e}")
                
        if not seed_urls:
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
            url = seed["url"]
            uni_name = seed["uni_name"]
            processed_count += 1
            progress = 30 + int(70 * (processed_count / total_seeds))
            
            elapsed_time = time.time() - start_time
            update_status("running", progress, f"Scanning {url} (URL {processed_count}/{total_seeds}) [Elapsed: {elapsed_time:.1f}s]")
            
            try:
                # Crawl the page
                result = fetch_scholarships_real([url], profile_dict)
                pages = result.get("pages", [])
                stats["crawled"] += 1
                
                for page in pages:
                    html_text = page.get("text", "")
                    
                    # Tier 1 Heuristic Gatekeeper
                    density = calculate_relevance_density(html_text, translated_keywords)
                    if density < 0.2:  # Arbitrary threshold for relevancy
                        logger.info(f"Tier 1 Gatekeeper rejected {url} (Density: {density:.2f} < 0.2)")
                        stats["gatekeeper_rejected"] += 1
                        continue
                        
                    logger.info(f"Tier 1 Gatekeeper PASSED {url} (Density: {density:.2f}). Sending to LLM...")
                    stats["gatekeeper_passed"] += 1
                    
                    # Tier 2 Deep Extraction
                    target_context = {"university": uni_name, "title": "Any relevant academic program or scholarship"}
                    extracted = extract_page_content(profile_dict, page, target_program_context=target_context, is_mass_scan=True)
                    if extracted and extracted.get("is_valid"):
                        # Save to db
                        save_discovered_data(db, extracted, profile)
                        stats["programs_found"] += len(extracted.get("programs", []))
                        stats["scholarships_found"] += len(extracted.get("scholarships", []))
                        
            except Exception as e:
                logger.error(f"Error processing {url}: {e}")
                stats["errors"] += 1
                
        total_time = time.time() - start_time
        final_msg = f"Mass discovery scan complete in {total_time:.1f}s. Scanned: {stats['crawled']}, Passed Gatekeeper: {stats['gatekeeper_passed']}, Errors: {stats['errors']}. Discovered {stats['programs_found']} programs and {stats['scholarships_found']} scholarships."
        logger.info(final_msg)
        update_status("completed", 100, final_msg)
        
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Mass discovery job failed after {total_time:.1f}s: {e}")
        update_status("failed", 0, f"Failed after {total_time:.1f}s: {str(e)}")
    finally:
        db.close()
