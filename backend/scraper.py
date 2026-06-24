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
                
                # Hunt for an official English translation link
                english_url = None
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    text_link = a.get_text().strip().lower()
                    if href.endswith('/en') or href.endswith('/en/') or '/en/' in href or '?lang=en' in href or text_link in ['en', 'english', 'anglais', 'ingles']:
                        from urllib.parse import urljoin
                        english_url = urljoin(url, href)
                        break
                        
                if english_url and english_url != url:
                    print(f"[Scraper] Found official English version! Redirecting to: {english_url}")
                    try:
                        en_page = fetcher.fetch(english_url)
                        if hasattr(en_page, 'body'):
                            html_content = en_page.body.decode('utf-8', errors='ignore')
                        else:
                            html_content = str(en_page)
                        soup = BeautifulSoup(html_content, 'html.parser')
                        url = english_url
                    except Exception as e:
                        print(f"[Scraper] Failed to fetch English version {english_url}: {e}. Falling back to original.")
                
                for elem in soup(["script", "style", "nav", "footer", "header"]):
                    elem.extract()
                    
                text = soup.get_text(separator=' ', strip=True)
                
                # We no longer strictly reject pages based on narrow keywords.
                # We let the massive Gemma context window decide if it's relevant.
                max_len = int(os.getenv('SCRAPER_MAX_TEXT_LENGTH', 50000))
                filtered_text = text[:max_len]
                
                title = soup.title.string if soup.title else url
                results.append({
                    "url": url,
                    "title": title.strip() if title else url,
                    "text": filtered_text
                })
            except Exception as e:
                print(f"[Scraper] Failed to fetch {url}: {e}")
                errors.append({"url": url, "error": str(e)})
                
    except Exception as e:
        print(f"[Scraper] Error initializing StealthyFetcher: {e}")
        errors.append({"url": "all", "error": f"Failed to initialize stealth fetcher: {str(e)}"})
        
    print(f"[Scraper] Yielded {len(results)} valid pages and {len(errors)} errors.")
    return {"pages": results, "errors": errors}

