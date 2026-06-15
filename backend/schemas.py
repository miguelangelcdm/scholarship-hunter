from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ProfileBase(BaseModel):
    name: str
    major: Optional[str] = None
    gpa: Optional[float] = None
    demographics: Optional[str] = None
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

class ScholarshipResponse(ScholarshipBase):
    id: int
    desire_score: float
    probability_score: float
    status: str
    class Config:
        from_attributes = True
