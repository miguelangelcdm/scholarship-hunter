from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ProfileBase(BaseModel):
    name: str
    major: Optional[str] = None
    gpa: Optional[float] = None
    demographics: Optional[str] = None
    extracurriculars: Optional[str] = None

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: int
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
