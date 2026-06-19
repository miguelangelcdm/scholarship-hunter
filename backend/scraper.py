from datetime import datetime, timedelta

def fetch_scholarships(search_params=None):
    """
    Dynamic Scraper Mock: Simulates Google Custom Search API seeding followed by Scrapy crawling.
    In a real environment, this would:
    1. Seed URLs using Google Custom Search: e.g., 'Master {major} scholarship in {desired_countries}' or '{target_continents}'
    2. Exclude results from {undesired_countries} and {undesired_continents}
    3. Pass URLs to Scrapy.
    4. Scrapy uses lightweight NLP to filter out pages not in {spoken_languages}.
    
    For development, we return a mocked dataset based on the parameters.
    """
    if search_params is None:
        search_params = {}
        
    major = search_params.get("major", "STEM")
    desired = search_params.get("desired_countries", [])
    
    # Just returning a mock payload to prove integration
    location_mock = desired[0] if desired else "International"
    major_mock = major if major else "General"
    
    return [
        {
            "title": f"{major_mock} Excellence Scholarship",
            "provider": f"{location_mock} University",
            "amount": "$5,000",
            "deadline": datetime.now() + timedelta(days=5),
            "description": f"A scholarship dedicated to supporting students pursuing degrees in {major_mock}.",
            "url": f"https://example.com/excellence-{major_mock.lower().replace(' ', '-')}"
        },
        {
            "title": "Global Innovators Grant",
            "provider": "Tech Foundation",
            "amount": "$2,500",
            "deadline": datetime.now() + timedelta(days=12),
            "description": f"Awarded to majors with a GPA above 3.5 who want to study in {location_mock}.",
            "url": "https://example.com/global-innovators"
        }
    ]
