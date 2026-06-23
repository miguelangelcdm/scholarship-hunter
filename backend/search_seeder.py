import json
try:
    from ddgs import DDGS
except ImportError:
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        pass

def get_seed_urls(profile, offset=0, limit=10, targeted_university=None, targeted_program_title=None):
    """
    Constructs a DuckDuckGo search query based on the user's profile and returns organic result URLs.
    If targeted_university is provided, it performs a highly specific search for funding at that institution.
    """
    query_parts = []
    
    if targeted_university:
        query_parts.append(f'"{targeted_university}" scholarship OR admissions')
        if targeted_program_title:
            query_parts.append(targeted_program_title)
    else:
        if profile.major:
            query_parts.append(f'"{profile.major}"')
        query_parts.append("(scholarship OR degree OR masters OR admissions)")
    
    try:
        targets = json.loads(profile.target_countries) if profile.target_countries else []
        countries = [t.get("country") for t in targets if t.get("country")]
        if countries:
            query_parts.append(f"({ ' OR '.join(countries) })")
    except Exception:
        pass

    query = " ".join(query_parts)
    print(f"[Search Seeder] Executing Broad DDG Query: {query} (Max Results: {limit})")

    urls = []
    try:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=limit)
            if results:
                urls = [res.get("href") for res in results if res.get("href")]
    except Exception as e:
        print(f"[Search Seeder] DDGS API Error: {e}")
        
    if not urls:
        print("[Search Seeder] Warning: No results found or DDG blocked. Using mock URLs.")
        return [
            "https://example.edu/admissions",
            "https://example.edu/financial-aid"
        ]

    return urls
