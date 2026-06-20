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
        # Targeted search for financial aid / scholarships for a specific university
        query_parts.append(f'"{targeted_university}"')
        if targeted_program_title:
            query_parts.append(f'"{targeted_program_title}"')
        query_parts.append('(scholarship OR "financial aid" OR "international student funding")')
    else:
        # Core academic constraints for generic program discovery
        if profile.major:
            query_parts.append(f'"{profile.major}"')
            
        if profile.degree_level:
            query_parts.append(f'"{profile.degree_level}"')
            
        # We want university portals, financial aid pages, or program details
        query_parts.append("(admissions OR program OR degree)")
    
    # Location constraints
    try:
        targets = json.loads(profile.target_countries) if profile.target_countries else []
        countries = [t.get("country") for t in targets if t.get("country")]
        if countries:
            # e.g., (Canada OR "United Kingdom")
            country_query = " OR ".join([f'"{c}"' for c in countries])
            query_parts.append(f"({country_query})")
    except Exception:
        pass

    # Exclusions
    try:
        undesired = json.loads(profile.undesired_countries) if profile.undesired_countries else []
        undesired_countries = [u.get("country") for u in undesired if u.get("country")]
        for u in undesired_countries:
            query_parts.append(f'-"{u}"')
    except Exception:
        pass

    # Family needs
    if getattr(profile, "has_dependents", False):
        query_parts.append('("family housing" OR childcare OR dependents OR "students with families")')

    query = " ".join(query_parts)
    print(f"[Search Seeder] Executing DDG Query: {query} (Max Results: {limit})")

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
