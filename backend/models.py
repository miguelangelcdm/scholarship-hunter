from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="My Profile")
    major = Column(String, nullable=True)
    gpa = Column(Float, nullable=True)
    demographics = Column(String, nullable=True)
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
    
    status = Column(String, default="Discovered") # Discovered, To Apply, Drafting, Applied, Rejected, Won
    
    requirements = relationship("ScholarshipRequirement", back_populates="scholarship")

class ScholarshipRequirement(Base):
    __tablename__ = "scholarship_requirements"
    id = Column(Integer, primary_key=True, index=True)
    scholarship_id = Column(Integer, ForeignKey("scholarships.id"))
    description = Column(String)
    
    scholarship = relationship("Scholarship", back_populates="requirements")
