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
    
    requirements = relationship("UserRequirement", back_populates="profile")

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
