from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="My Profile")
    major = Column(String, nullable=True)
    degree_level = Column(String, nullable=True)
    gpa = Column(String, nullable=True)
    demographics = Column(String, nullable=True)
    nationalities = Column(String, nullable=True)
    extracurriculars = Column(String, nullable=True)
    resume_text = Column(String, nullable=True)
    
    # New Subsections for Scholarship details
    hobbies = Column(String, nullable=True)
    volunteer_work = Column(String, nullable=True)
    projects = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    awards = Column(String, nullable=True)
    languages = Column(String, nullable=True)
    publications = Column(String, nullable=True)
    financial_need = Column(String, nullable=True)
    career_goals = Column(String, nullable=True)
    
    # Wizard Preferences
    target_countries = Column(String, nullable=True)
    undesired_countries = Column(String, nullable=True)
    target_continents = Column(String, nullable=True)
    undesired_continents = Column(String, nullable=True)
    target_areas = Column(String, nullable=True)
    target_tags = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    target_universities = Column(String, nullable=True)
    
    # New Modality & Psychology Preferences
    has_dependents = Column(Boolean, default=False)
    primary_goal = Column(String, nullable=True) # Migrate, Local Growth, Entrepreneurship, Brain-Circulation
    preferred_modality = Column(String, nullable=True) # Online, Hybrid, In-Person (Local), In-Person (Abroad)
    relocation_feasibility_score = Column(Integer, nullable=True) # 0-100
    target_diaspora_regions = Column(String, nullable=True) # JSON array string
    target_degree_level = Column(String, default="Masters", nullable=True)
    target_study_type = Column(String, default="Taught", nullable=True)
    
    requirements = relationship("UserRequirement", back_populates="profile")
    documents = relationship("ProfileDocument", back_populates="profile", cascade="all, delete-orphan")

class ProfileDocument(Base):
    __tablename__ = "profile_documents"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    doc_type = Column(String)  # 'cv', 'recommendation_letter_1', 'recommendation_letter_2', 'recommendation_letter_3', 'bachelor_diploma'
    filename = Column(String)
    filepath = Column(String)
    is_uploaded = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    parsed_text = Column(String, nullable=True)
    
    profile = relationship("Profile", back_populates="documents")

class UserRequirement(Base):
    __tablename__ = "user_requirements"
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    requirement_name = Column(String)  # e.g., "3D Modeling Portfolio"
    requirement_value = Column(String) # e.g., "Link to artstation"
    
    profile = relationship("Profile", back_populates="requirements")

class Scholarship(Base):
    __tablename__ = "scholarships"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    provider = Column(String)
    amount = Column(String, nullable=True)
    deadline = Column(DateTime, nullable=True)
    description = Column(String)
    url = Column(String)
    
    desire_score = Column(Float, default=0.0)
    probability_score = Column(Float, default=0.0)
    improvement_projection = Column(String, nullable=True)
    
    target_program_id = Column(Integer, ForeignKey("target_programs.id"), nullable=True)
    
    status = Column(String, default="Discovered") # Discovered, To Apply, Drafting, Applied, Rejected, Won
    
    # Research metrics
    benefits_summary = Column(String, nullable=True)
    prestige_tier = Column(Integer, nullable=True)
    award_count = Column(Integer, nullable=True)
    requires_outreach = Column(Boolean, default=False)
    
    requirements = relationship("ScholarshipRequirement", back_populates="scholarship")
    program = relationship("TargetProgram", back_populates="scholarships")

class ScholarshipRequirement(Base):
    __tablename__ = "scholarship_requirements"
    id = Column(Integer, primary_key=True, index=True)
    scholarship_id = Column(Integer, ForeignKey("scholarships.id"))
    description = Column(String)
    
    scholarship = relationship("Scholarship", back_populates="requirements")

class TargetProgram(Base):
    __tablename__ = "target_programs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    university = Column(String)
    country = Column(String)
    url = Column(String, nullable=True)
    
    is_online = Column(Boolean, default=False)
    is_hybrid = Column(Boolean, default=False)
    accepts_international = Column(Boolean, default=True)
    
    # New detailed extraction fields
    details = Column(String, nullable=True)
    steps = Column(String, nullable=True)
    important_info = Column(String, nullable=True)
    next_steps = Column(String, nullable=True)
    
    # Multilingual & International details
    instruction_languages = Column(String, nullable=True) # JSON array string
    offers_language_training = Column(Boolean, default=False)
    foreigner_friendly = Column(Boolean, default=True)
    
    desire_score = Column(Float, default=0.0)
    probability_score = Column(Float, default=0.0)
    improvement_projection = Column(String, nullable=True)
    
    status = Column(String, default="Discovered") # Discovered, Preparing, Applied, Rejected, Accepted, Discarded
    
    created_at = Column(DateTime, default=datetime.utcnow)
    is_checked = Column(Boolean, default=False)
    is_targeted = Column(Boolean, default=False)
    
    scholarships = relationship("Scholarship", back_populates="program")

class ScannedUniversity(Base):
    __tablename__ = "scanned_universities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    scanned_at = Column(DateTime, default=datetime.utcnow)
    profile_cache = Column(String, nullable=True)

class BlacklistedUniversity(Base):
    __tablename__ = "blacklisted_universities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    blacklisted_at = Column(DateTime, default=datetime.utcnow)
