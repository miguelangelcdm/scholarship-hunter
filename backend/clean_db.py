import sys
from sqlalchemy.orm import Session
from database import SessionLocal, init_db
from models import TargetProgram, Scholarship

def clean_database():
    print("Initializing Database connection...")
    init_db()
    db: Session = SessionLocal()
    try:
        # Delete invalid programs
        invalid_programs = db.query(TargetProgram).filter(TargetProgram.university == 'Unknown University').all()
        invalid_count = len(invalid_programs)
        
        for prog in invalid_programs:
            db.delete(prog)
            
        # Delete invalid scholarships
        invalid_scholarships = db.query(Scholarship).filter(Scholarship.provider == 'Unknown Provider').all()
        invalid_scholarship_count = len(invalid_scholarships)
        
        for sch in invalid_scholarships:
            db.delete(sch)
            
        db.commit()
        print(f"Cleanup complete! Deleted {invalid_count} invalid programs and {invalid_scholarship_count} invalid scholarships.")
        sys.exit(0)
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
