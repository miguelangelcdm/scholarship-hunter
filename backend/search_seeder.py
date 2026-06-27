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
    Constructs an optimized DuckDuckGo search query based on the user's profile and returns organic result URLs.
    If targeted_university is provided, it performs a highly specific search for funding at that institution.
    """
    query_parts = []
    
    if targeted_university:
        query_parts.append(f'"{targeted_university}" scholarship OR admissions')
        if targeted_program_title:
            query_parts.append(targeted_program_title)
    else:
        # Add target disciplines / major / areas
        target_areas = []
        if profile.target_areas:
            try:
                target_areas = json.loads(profile.target_areas)
            except Exception:
                target_areas = [a.strip() for a in profile.target_areas.split(",")] if profile.target_areas else []
                
        target_areas = [a for a in target_areas if a]
        
        # Build discipline/major terms
        discipline_terms = []
        if profile.major:
            discipline_terms.append(f'"{profile.major}"')
        for a in target_areas[:2]: # Limit to 2 to prevent query bloat
            if a != profile.major:
                discipline_terms.append(f'"{a}"')
                
        if discipline_terms:
            query_parts.append(f"({ ' OR '.join(discipline_terms) })")
            
        # Add general funding/scholarship search terms
        query_parts.append("(scholarship OR funding OR \"financial aid\")")
        
        # Add degree level search terms
        degree_keywords = "(degree OR master OR masters OR admissions)" # Fallback
        if profile.degree_level:
            lvl = profile.degree_level.strip().lower()
            if "bachelor" in lvl:
                degree_keywords = "(bachelor OR undergraduate OR university)"
            elif "master" in lvl:
                degree_keywords = "(masters OR postgraduate OR graduate)"
            elif "phd" in lvl or "doctor" in lvl:
                degree_keywords = "(PhD OR doctoral OR doctorate OR fellowship)"
        query_parts.append(degree_keywords)
        
        # Parse and expand target countries/continents
        from continent_mapper import expand_continents_to_countries
        
        desired = []
        if profile.target_countries:
            try:
                targets = json.loads(profile.target_countries)
                desired = [t.get("country").strip() for t in targets if t.get("country")]
            except Exception:
                desired = [c.strip() for c in profile.target_countries.split(",")] if profile.target_countries else []
                
        undesired = []
        if profile.undesired_countries:
            try:
                undes_targets = json.loads(profile.undesired_countries)
                undesired = [u.get("country").strip() for u in undes_targets if u.get("country")]
            except Exception:
                undesired = [c.strip() for c in profile.undesired_countries.split(",")] if profile.undesired_countries else []
                
        expanded_desired = expand_continents_to_countries(desired)
        expanded_undesired = expand_continents_to_countries(undesired)
        
        final_countries = [c for c in expanded_desired if c.lower() not in [u.lower() for u in expanded_undesired]]
        
        # Build country query terms prioritizing specific countries and keeping list compact (max 5)
        query_countries = []
        specific_countries = [c for c in desired if c.lower() not in ["europe", "asia", "north america", "south america", "africa", "oceania"]]
        query_countries.extend(specific_countries)
        
        continent_names = [c.strip().title() for c in desired if c.lower() in ["europe", "asia", "north america", "south america", "africa", "oceania"]]
        query_countries.extend(continent_names)
        
        for c in final_countries:
            if len(query_countries) >= 5:
                break
            if c not in query_countries:
                query_countries.append(c)
                
        if query_countries:
            query_parts.append(f"({ ' OR '.join([f'\"{c}\"' for c in query_countries]) })")

    query = " ".join(query_parts)
    print(f"[Search Seeder] Executing Optimized DDG Query: {query} (Max Results: {limit})")

    urls = []
    try:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=limit)
            if results:
                urls = [res.get("href") for res in results if res.get("href")]
    except Exception as e:
        print(f"[Search Seeder] DDGS API Error: {e}")
        
    if not urls:
        print("[Search Seeder] Warning: No results found or DDG blocked.")
        return []

    return urls
