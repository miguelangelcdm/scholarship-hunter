import os
import nltk
from scrapling import StealthyFetcher
from bs4 import BeautifulSoup

def filter_text_with_nltk(text, profile_dict):
    """
    Extracts only sentences containing relevant keywords to reduce token usage.
    """
    keywords = ["tuition", "deadline", "scholarship", "financial aid", "apply", "requirements", "admissions", "grant", "$", "€", "£"]
    if profile_dict.get("has_dependents", False):
        keywords.extend(["family", "childcare", "dependents"])
        
    sentences = nltk.tokenize.sent_tokenize(text)
    relevant_sentences = []
    
    for sent in sentences:
        sent_lower = sent.lower()
        if any(k in sent_lower for k in keywords):
            relevant_sentences.append(sent)
            
    filtered_text = " ".join(relevant_sentences)
    # Drastically reduce max length since we only keep relevant sentences
    max_len = int(os.getenv('SCRAPER_MAX_TEXT_LENGTH', 2000))
    return filtered_text[:max_len]

def fetch_scholarships_real(urls, profile_dict):
    """
    Uses Scrapling's StealthyFetcher to bypass Cloudflare and fetch seed URLs.
    Returns a dict with 'pages' and 'errors'.
    """
    if not urls:
        return {"pages": [], "errors": []}
        
    print(f"[Scraper] Fetching {len(urls)} seed URLs with Scrapling...")
    results = []
    errors = []
    
    try:
        # Use StealthyFetcher to bypass Cloudflare
        fetcher = StealthyFetcher()
        max_pages = int(os.getenv('SCRAPER_MAX_PAGES', 5))
        
        for url in urls[:max_pages]:
            try:
                print(f"[Scraper] Fetching: {url}")
                page = fetcher.fetch(url)
                
                # Extract HTML content
                if hasattr(page, 'body'):
                    html_content = page.body.decode('utf-8', errors='ignore')
                else:
                    html_content = str(page)
                
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Remove navs, footers, scripts, styles
                for elem in soup(["script", "style", "nav", "footer", "header"]):
                    elem.extract()
                    
                text = soup.get_text(separator=' ', strip=True)
                
                # Check if it has any keywords at all before running NLTK
                text_lower = text.lower()
                keywords = ["tuition", "deadline", "scholarship", "financial aid", "apply", "requirements", "admissions", "grant", "program", "degree", "master", "bachelor"]
                if any(k in text_lower for k in keywords):
                    filtered_text = filter_text_with_nltk(text, profile_dict)
                    title = soup.title.string if soup.title else url
                    results.append({
                        "url": url,
                        "title": title.strip() if title else url,
                        "text": filtered_text
                    })
                else:
                    print(f"[Scraper] No relevant keywords found on {url}")
                    errors.append({"url": url, "error": "No relevant keywords found in page content"})
            except Exception as e:
                print(f"[Scraper] Failed to fetch {url}: {e}")
                errors.append({"url": url, "error": str(e)})
                
    except Exception as e:
        print(f"[Scraper] Error initializing StealthyFetcher: {e}")
        errors.append({"url": "all", "error": f"Failed to initialize stealth fetcher: {str(e)}"})
        
    print(f"[Scraper] Yielded {len(results)} valid pages and {len(errors)} errors.")
    return {"pages": results, "errors": errors}

