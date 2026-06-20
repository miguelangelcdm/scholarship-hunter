import os
import json
from ai_agent import extract_page_content
from dotenv import load_dotenv

load_dotenv(".env")

profile_dict = {
    "major": "Systems Engineering",
    "gpa": "Top 20%",
    "demographics": "Latin American",
    "target_countries": "Spain, UK",
    "experience": "2 years software development"
}

# Dummy page text
page_text = """
Welcome to the Universidad de Barcelona. We offer a Master of Science in Systems Engineering.
This is an in-person program located in Spain. It takes 2 years to complete. International students are welcome.
To apply, submit your CV, 2 recommendation letters, and a statement of purpose by March 15th.
We also offer the Excellence in Engineering Scholarship, which covers 50% of tuition for top students from Latin America.
"""

page_data = {
    "url": "https://example.com/systems-engineering",
    "title": "MSc Systems Engineering - UB",
    "text": page_text
}

print("Running extraction test...")
try:
    result = extract_page_content(profile_dict, page_data)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f"Extraction failed: {e}")
