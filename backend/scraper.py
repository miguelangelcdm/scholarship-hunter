from datetime import datetime, timedelta

def fetch_scholarships():
    """
    Hybrid Scraper: In a real environment, this would use BeautifulSoup or Scrapy.
    To prevent IP bans during development, we return a realistic mock dataset.
    """
    return [
        {
            "title": "Women in Tech Fund",
            "provider": "TechCorp Foundation",
            "amount": "$5,000",
            "deadline": datetime.now() + timedelta(days=5),
            "description": "A scholarship dedicated to supporting female students pursuing degrees in Computer Science or Engineering.",
            "url": "https://example.com/women-in-tech"
        },
        {
            "title": "STEM Leadership Grant",
            "provider": "National Science Board",
            "amount": "$2,500",
            "deadline": datetime.now() + timedelta(days=12),
            "description": "Awarded to STEM majors with a GPA above 3.5 who demonstrate leadership in their communities.",
            "url": "https://example.com/stem-grant"
        },
        {
            "title": "First-Gen College Scholar Award",
            "provider": "Education First",
            "amount": "$10,000",
            "deadline": datetime.now() + timedelta(days=30),
            "description": "For first-generation college students from underrepresented backgrounds.",
            "url": "https://example.com/first-gen"
        },
        {
            "title": "Future Medical Professionals Grant",
            "provider": "HealthCare Partners",
            "amount": "$3,000",
            "deadline": datetime.now() + timedelta(days=45),
            "description": "For pre-med or nursing students aiming for a career in healthcare.",
            "url": "https://example.com/medical-grant"
        }
    ]
