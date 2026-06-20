import sys
import os
import argparse
from datetime import datetime

# Add the parent/backend folder to path so database, models, etc. can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, init_db
from models import Scholarship, TargetProgram, ScholarshipRequirement

def clear_data(db):
    print("Clearing existing mock data...")
    # Delete from child tables first to respect foreign keys
    db.query(ScholarshipRequirement).delete()
    db.query(Scholarship).delete()
    db.query(TargetProgram).delete()
    db.commit()
    print("Database tables cleared.")

def seed_data(db):
    print("Seeding mock programs and scholarships...")
    
    # 1. Mock Target Programs
    mock_programs = [
        TargetProgram(
            title="MSc in Artificial Intelligence",
            university="Technical University of Munich",
            country="Germany",
            url="https://www.tum.de/en/studies/degree-programs/detail/informatics-master-of-science-msc/",
            is_online=False,
            is_hybrid=False,
            accepts_international=True,
            status="Discovered"
        ),
        TargetProgram(
            title="Master of Computer Science",
            university="ETH Zurich",
            country="Switzerland",
            url="https://ethz.ch/en/studies/master/degree-programmes/engineering-sciences/computer-science.html",
            is_online=False,
            is_hybrid=False,
            accepts_international=True,
            status="Discovered"
        ),
        TargetProgram(
            title="MSc in Advanced Computer Science",
            university="University of Oxford",
            country="United Kingdom",
            url="https://www.ox.ac.uk/admissions/graduate/courses/msc-computer-science",
            is_online=False,
            is_hybrid=False,
            accepts_international=True,
            status="Preparing"
        ),
        TargetProgram(
            title="Online Master of Computer and Information Technology",
            university="University of Pennsylvania",
            country="United States",
            url="https://online.upenn.edu/degrees/mcit-online",
            is_online=True,
            is_hybrid=False,
            accepts_international=True,
            status="Applied"
        ),
        TargetProgram(
            title="Master in Data Sciences and Business Analytics",
            university="ESSEC & CentraleSupélec",
            country="France",
            url="https://www.essec.edu/en/program/msc/master-data-sciences-business-analytics/",
            is_online=False,
            is_hybrid=True,
            accepts_international=True,
            status="Accepted"
        )
    ]
    
    for prog in mock_programs:
        db.add(prog)
    db.commit()
    print(f"Seeded {len(mock_programs)} target programs.")
    
    # 2. Mock Scholarships / Applications
    # We will also create some associated requirements for testing
    mock_scholarships = [
        Scholarship(
            title="DAAD Postgraduate Scholarship",
            provider="German Academic Exchange Service (DAAD)",
            amount="€1,200 / month + travel",
            description="Funding for postgraduate courses at German universities.",
            url="https://www.daad.de",
            desire_score=85.0,
            probability_score=75.0,
            status="To Apply",
            prestige_tier=1,
            award_count=150,
            requires_outreach=False,
            benefits_summary="Monthly stipend, travel allowance, health insurance"
        ),
        Scholarship(
            title="Fulbright Foreign Student Program",
            provider="US Department of State",
            amount="Full Tuition & Living Stipend",
            description="Enables graduate students and young professionals to study and conduct research in the US.",
            url="https://foreign.fulbrightonline.org",
            desire_score=90.0,
            probability_score=60.0,
            status="Drafting",
            prestige_tier=1,
            award_count=4000,
            requires_outreach=True,
            benefits_summary="Full tuition, living stipend, airfare, health insurance"
        ),
        Scholarship(
            title="Eiffel Excellence Scholarship Program",
            provider="French Ministry for Europe and Foreign Affairs",
            amount="€1,181 / month + transport",
            description="Developed by the Ministry of Foreign Affairs to support French centers of higher education in attracting elite foreign students.",
            url="https://www.campusfrance.org",
            desire_score=78.0,
            probability_score=65.0,
            status="Discovered",
            prestige_tier=2,
            award_count=350,
            requires_outreach=False,
            benefits_summary="Monthly stipend, return trip ticket, social security cover"
        ),
        Scholarship(
            title="Gates Cambridge Scholarship",
            provider="Bill & Melinda Gates Foundation",
            amount="Full Cost of Study",
            description="Full-cost scholarships for postgraduate study at the University of Cambridge.",
            url="https://www.gatescambridge.org",
            desire_score=95.0,
            probability_score=45.0,
            status="Applied",
            prestige_tier=1,
            award_count=80,
            requires_outreach=True,
            benefits_summary="University Composition Fee, maintenance allowance, travel, family allowance"
        ),
        Scholarship(
            title="Swiss Government Excellence Scholarships",
            provider="Federal Commission for Scholarships for Foreign Students",
            amount="CHF 1,920 / month",
            description="Postgraduate scholarships for foreign researchers and artists in Switzerland.",
            url="https://www.sbfi.admin.ch",
            desire_score=65.0,
            probability_score=70.0,
            status="Discovered",
            prestige_tier=2,
            award_count=100,
            requires_outreach=False,
            benefits_summary="Monthly payment, tuition fees waived, health insurance"
        )
    ]
    
    for schol in mock_scholarships:
        db.add(schol)
    db.commit()
    
    # Add requirements to the first two scholarships
    daad_id = mock_scholarships[0].id
    fulbright_id = mock_scholarships[1].id
    
    reqs = [
        ScholarshipRequirement(scholarship_id=daad_id, description="Bachelor's degree completed within the last 6 years"),
        ScholarshipRequirement(scholarship_id=daad_id, description="English language proficiency (IELTS/TOEFL)"),
        ScholarshipRequirement(scholarship_id=fulbright_id, description="Must be a citizen of a participating Fulbright country"),
        ScholarshipRequirement(scholarship_id=fulbright_id, description="Minimum undergraduate GPA of 3.0 or equivalent")
    ]
    
    for req in reqs:
        db.add(req)
    db.commit()
    
    print(f"Seeded {len(mock_scholarships)} scholarships and their requirements.")

def main():
    parser = argparse.ArgumentParser(description="Database Seeding and Unseeding Utility")
    parser.add_argument("--seed", action="store_true", help="Clear and seed the database with mock data")
    parser.add_argument("--unseed", action="store_true", help="Clear all mock data from the database")
    
    args = parser.parse_args()
    
    db = SessionLocal()
    try:
        if args.seed:
            clear_data(db)
            seed_data(db)
            print("Successfully seeded the database!")
        elif args.unseed:
            clear_data(db)
            print("Successfully unseeded the database!")
        else:
            parser.print_help()
    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
