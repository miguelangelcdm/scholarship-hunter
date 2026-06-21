import sys
from sqlalchemy.orm import Session
from database import SessionLocal, init_db
from models import TargetProgram, Scholarship, ScholarshipRequirement

def clean_database(wipe_all=False):
    print("Initializing Database connection...")
    init_db()
    db: Session = SessionLocal()
    try:
        if wipe_all:
            print("WARNING: Wiping ALL discovered programs and funding records. Profile data will remain intact.")
            
            # Delete in order to respect foreign keys
            db.query(ScholarshipRequirement).delete()
            db.query(Scholarship).delete()
            db.query(TargetProgram).delete()
            
            db.commit()
            print("Wipe complete! All discovered programs and scholarships have been permanently deleted.")
            sys.exit(0)

        # Define invalid names to catch
        invalid_names = ['Unknown University', 'Not specified', 'Unknown', 'N/A', '', 'Unknown Provider']

        # Delete invalid programs
        invalid_programs = db.query(TargetProgram).filter(
            (TargetProgram.university.in_(invalid_names)) | 
            (TargetProgram.university == None)
        ).all()
        invalid_count = len(invalid_programs)
        
        for prog in invalid_programs:
            db.delete(prog)
            
        # Delete invalid scholarships
        invalid_scholarships = db.query(Scholarship).filter(
            (Scholarship.provider.in_(invalid_names)) | 
            (Scholarship.provider == None)
        ).all()
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
    should_wipe_all = "--wipe-all" in sys.argv
    clean_database(should_wipe_all)
