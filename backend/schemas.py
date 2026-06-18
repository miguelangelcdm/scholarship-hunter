from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime

class ProfileBase(BaseModel):
    name: str
    major: Optional[str] = None
    gpa: Optional[str] = None
    demographics: Optional[str] = None
    nationalities: Optional[str] = None

    @field_validator("gpa", mode="before")
    @classmethod
    def coerce_gpa(cls, v):
        if v is not None:
            return str(v)
        return v
    extracurriculars: Optional[str] = None
    hobbies: Optional[str] = None
    volunteer_work: Optional[str] = None
    projects: Optional[str] = None
    experience: Optional[str] = None
    awards: Optional[str] = None
    languages: Optional[str] = None
    publications: Optional[str] = None
    financial_need: Optional[str] = None
    career_goals: Optional[str] = None
    target_countries: Optional[str] = None
    target_areas: Optional[str] = None
    target_tags: Optional[str] = None
    experience_level: Optional[str] = None
    target_universities: Optional[str] = None
    has_dependents: Optional[bool] = False
    primary_goal: Optional[str] = None
    preferred_modality: Optional[str] = None
    relocation_feasibility_score: Optional[int] = None
    target_diaspora_regions: Optional[str] = None

class ProfileUpdate(ProfileBase):
    pass

class ProfileDocumentResponse(BaseModel):
    id: int
    doc_type: str
    filename: str
    is_uploaded: bool
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

class ProfileResponse(ProfileBase):
    id: int
    documents: List[ProfileDocumentResponse] = []
    class Config:
        from_attributes = True

class ScholarshipBase(BaseModel):
    title: str
    provider: str
    amount: Optional[str] = None
    deadline: Optional[datetime] = None
    description: str
    url: str
    benefits_summary: Optional[str] = None
    prestige_tier: Optional[int] = None
    award_count: Optional[int] = None
    requires_outreach: Optional[bool] = False

class ScholarshipResponse(ScholarshipBase):
    id: int
    desire_score: float
    probability_score: float
    status: str
    class Config:
        from_attributes = True

class TargetProgramBase(BaseModel):
    title: str
    university: str
    country: str
    url: Optional[str] = None
    is_online: Optional[bool] = False
    is_hybrid: Optional[bool] = False
    accepts_international: Optional[bool] = True

class TargetProgramResponse(TargetProgramBase):
    id: int
    status: str
    class Config:
        from_attributes = True
