# continent_mapper.py
# Maps continents to their constituent country names and ISO alpha-2 codes.

CONTINENT_TO_ISO = {
    "europe": {
        "GB", "FR", "DE", "IT", "ES", "NL", "BE", "CH", "SE", "DK", "NO", "FI", "IE", "AT", "PT",
        "PL", "CZ", "GR", "RO", "HU", "BG", "SK", "HR", "LT", "LV", "EE", "SI", "CY", "LU", "MT",
        "IS", "AD", "LI", "MC", "SM", "VA", "UA", "MD", "BY", "RU", "AL", "BA", "ME", "MK", "RS"
    },
    "asia": {
        "JP", "KR", "CN", "IN", "SG", "MY", "TH", "VN", "ID", "PH", "IL", "AE", "SA", "TR", "PK",
        "BD", "IR", "IQ", "KZ", "UZ", "LK", "NP", "JO", "LB", "OM", "QA", "KW", "BH", "TW", "HK", "MO"
    },
    "north america": {
        "US", "CA", "MX", "CR", "PA", "GT", "HN", "SV", "NI", "BZ", "CU", "JM", "DO", "HT", "BS"
    },
    "south america": {
        "BR", "AR", "CO", "CL", "PE", "VE", "EC", "BO", "PY", "UY", "GY", "SR"
    },
    "africa": {
        "ZA", "EG", "NG", "KE", "MA", "DZ", "TN", "GH", "ET", "UG", "TZ", "SN", "CM", "AO", "CI"
    },
    "oceania": {
        "AU", "NZ", "FJ", "PG", "WS", "TO"
    }
}

# Mapping to common English country names for search queries
CONTINENT_TO_NAMES = {
    "europe": [
        "United Kingdom", "France", "Germany", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
        "Sweden", "Denmark", "Norway", "Finland", "Ireland", "Austria", "Portugal", "Poland", "Czech Republic"
    ],
    "asia": [
        "Japan", "South Korea", "China", "India", "Singapore", "Malaysia", "Thailand", "Vietnam", "Indonesia",
        "Taiwan", "Hong Kong"
    ],
    "north america": [
        "United States", "Canada", "Mexico", "Costa Rica", "Panama"
    ],
    "south america": [
        "Brazil", "Argentina", "Colombia", "Chile", "Peru"
    ],
    "africa": [
        "South Africa", "Egypt", "Nigeria", "Kenya", "Morocco"
    ],
    "oceania": [
        "Australia", "New Zealand"
    ]
}

# Standardize continent names to match keys
def normalize_name(name: str) -> str:
    n = name.strip().lower()
    if n in ["north america", "north_america", "na"]:
        return "north america"
    if n in ["south america", "south_america", "sa"]:
        return "south america"
    return n

def is_continent(name: str) -> bool:
    return normalize_name(name) in CONTINENT_TO_ISO

def expand_continents_to_countries(names_list: list) -> list:
    """
    Expands a list of country/continent names to country names.
    e.g., ["Spain", "europe"] -> ["Spain", "United Kingdom", "France", "Germany", ...]
    """
    expanded = set()
    for name in names_list:
        norm = normalize_name(name)
        if norm in CONTINENT_TO_NAMES:
            expanded.update(CONTINENT_TO_NAMES[norm])
        else:
            expanded.add(name)
    return list(expanded)

def expand_continents_to_iso(names_list: list) -> set:
    """
    Expands a list of country/continent names to a set of ISO-2 country codes.
    """
    iso_set = set()
    import pycountry
    
    for name in names_list:
        norm = normalize_name(name)
        if norm in CONTINENT_TO_ISO:
            iso_set.update(CONTINENT_TO_ISO[norm])
        else:
            # Try to resolve country name to ISO
            try:
                res = pycountry.countries.get(name=name.title())
                if res:
                    iso_set.add(res.alpha_2)
                else:
                    res = pycountry.countries.search_fuzzy(name)
                    if res:
                        iso_set.add(res[0].alpha_2)
            except Exception:
                pass
    return iso_set
