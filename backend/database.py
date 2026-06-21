from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from models import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./scholarship_hunter.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migrations(engine):
    inspector = inspect(engine)
    
    # Define columns that need to exist on profiles table
    profiles_cols = {
        "degree_level": "VARCHAR",
        "target_countries": "VARCHAR",
        "undesired_countries": "VARCHAR",
        "target_continents": "VARCHAR",
        "undesired_continents": "VARCHAR",
        "target_areas": "VARCHAR",
        "target_tags": "VARCHAR",
        "experience_level": "VARCHAR",
        "target_universities": "VARCHAR",
        "has_dependents": "BOOLEAN DEFAULT 0",
        "primary_goal": "VARCHAR",
        "preferred_modality": "VARCHAR",
        "relocation_feasibility_score": "INTEGER",
        "target_diaspora_regions": "VARCHAR",
        "nationalities": "VARCHAR"
    }
    
    # Define columns that need to exist on scholarships table
    scholarships_cols = {
        "benefits_summary": "VARCHAR",
        "prestige_tier": "INTEGER",
        "award_count": "INTEGER",
        "requires_outreach": "BOOLEAN DEFAULT 0",
        "improvement_projection": "VARCHAR",
        "target_program_id": "INTEGER"
    }
    
    # Define columns that need to exist on target_programs table
    target_programs_cols = {
        "details": "VARCHAR",
        "steps": "VARCHAR",
        "important_info": "VARCHAR",
        "next_steps": "VARCHAR",
        "desire_score": "FLOAT DEFAULT 0.0",
        "probability_score": "FLOAT DEFAULT 0.0",
        "improvement_projection": "VARCHAR"
    }
    
    with engine.begin() as conn:
        # Check profiles table
        if "profiles" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("profiles")}
            for col, col_type in profiles_cols.items():
                if col not in existing_cols:
                    conn.execute(text(f"ALTER TABLE profiles ADD COLUMN {col} {col_type}"))
                    
        # Check scholarships table
        if "scholarships" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("scholarships")}
            for col, col_type in scholarships_cols.items():
                if col not in existing_cols:
                    conn.execute(text(f"ALTER TABLE scholarships ADD COLUMN {col} {col_type}"))

        # Check target_programs table
        if "target_programs" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("target_programs")}
            for col, col_type in target_programs_cols.items():
                if col not in existing_cols:
                    conn.execute(text(f"ALTER TABLE target_programs ADD COLUMN {col} {col_type}"))

def init_db():
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

