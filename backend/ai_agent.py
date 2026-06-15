import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

class ScoreResponse(BaseModel):
    probability_score: float = Field(description="Score out of 100 on how likely the user is to win based on requirements vs profile")
    desire_score: float = Field(description="Score out of 100 on how much this matches the user's field and interests")

def get_llm():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: No GEMINI_API_KEY found in environment variables.")
        return None
    return ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key)

def score_scholarship(profile_data: dict, scholarship_data: dict):
    llm = get_llm()
    if not llm:
        # Fallback fake scoring if no API key is provided
        return {"probability_score": 88.0, "desire_score": 92.0}
    
    parser = PydanticOutputParser(pydantic_object=ScoreResponse)
    
    prompt = PromptTemplate(
        template="""
        You are an expert scholarship matcher. 
        Evaluate the following user profile against the scholarship requirements.
        Return realistic probability and desire scores.
        
        User Profile:
        {profile}
        
        Scholarship Description:
        {scholarship}
        
        {format_instructions}
        """,
        input_variables=["profile", "scholarship"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    try:
        result = chain.invoke({
            "profile": str(profile_data),
            "scholarship": str(scholarship_data)
        })
        return result.model_dump()
    except Exception as e:
        print(f"Error scoring: {e}")
        return {"probability_score": 50.0, "desire_score": 50.0}

class ProfileExtraction(BaseModel):
    name: Optional[str] = Field(None, description="The user's full name if found in the text")
    major: Optional[str] = Field(None, description="Field of study or major (e.g. Computer Science)")
    gpa: Optional[float] = Field(None, description="Cumulative GPA (e.g. 3.8)")
    demographics: Optional[str] = Field(None, description="Comma-separated demographic tags or background characteristics (first-generation, minority, etc.)")
    extracurriculars: Optional[str] = Field(None, description="Brief summary of clubs, student activities, or leadership positions")
    hobbies: Optional[str] = Field(None, description="Brief summary of hobbies, interests, or personal projects")
    volunteer_work: Optional[str] = Field(None, description="Brief summary of volunteer activities, community service, or non-profit involvement")
    projects: Optional[str] = Field(None, description="Brief summary of important academic, technical, or personal projects")
    experience: Optional[str] = Field(None, description="Brief summary of work experience, internships, or research roles")
    awards: Optional[str] = Field(None, description="List of awards, academic honors, or notable achievements")
    languages: Optional[str] = Field(None, description="Spoken languages, test scores like TOEFL/IELTS")
    publications: Optional[str] = Field(None, description="Academic publications, research papers, or conference presentations")
    financial_need: Optional[str] = Field(None, description="Mentions of financial constraints, working part-time, or socioeconomic background")
    career_goals: Optional[str] = Field(None, description="Career or educational aspirations")

def parse_profile_from_document(text: str) -> dict:
    llm = get_llm()
    if not llm:
        # Fallback mock data for local testing if API key is not set
        return {
            "name": "Jane Doe",
            "major": "Computer Science & Engineering",
            "gpa": 3.92,
            "demographics": "Woman in STEM, First-generation",
            "extracurriculars": "VP of Women in Tech Club, Hackathon Organizer",
            "hobbies": "Competitive programming, reading sci-fi, hiking",
            "volunteer_work": "Coding tutor for local middle school students",
            "projects": "Built an open-source health tracker app with React and FastAPI",
            "experience": "Software Engineering Intern at TechCorp, Research Assistant at AI Lab",
            "awards": "Dean's List 2024-2025, Regional Hackathon Winner",
            "languages": "English (Native), Spanish (Conversational), IELTS 8.0",
            "publications": "Co-authored 'Machine Learning in Medical Imaging' in IEEE Trans",
            "financial_need": "Funded studies through part-time tutoring jobs",
            "career_goals": "Pursue a PhD in Artificial Intelligence and teach"
        }
    
    parser = PydanticOutputParser(pydantic_object=ProfileExtraction)
    prompt = PromptTemplate(
        template="""
        You are an expert document parser. Extract the user's scholarship profile information from the following document text (which is typically a resume, CV, or academic profile).
        Provide a summary of details for each of the requested fields if available in the text.
        
        Document Text:
        {text}
        
        {format_instructions}
        """,
        input_variables=["text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    chain = prompt | llm | parser
    try:
        result = chain.invoke({"text": text})
        # Return only fields that are NOT null so we don't overwrite user fields with nulls
        return {k: v for k, v in result.model_dump().items() if v is not None}
    except Exception as e:
        print(f"Error parsing document: {e}")
        return {}

def draft_essay(profile_data: dict, scholarship_data: dict):
    llm = get_llm()
    if not llm:
        return "Please configure GEMINI_API_KEY in the .env file to generate an essay draft."
        
    prompt = PromptTemplate(
        template="""
        You are an expert essay writer helping a student win a scholarship.
        Write a compelling 3-paragraph essay outline and draft based on their profile.
        Make sure to weave in their hobbies, volunteer activities, key projects, and academic/career goals where relevant to make the essay highly personalized and impactful.
        
        User Profile:
        {profile}
        
        Scholarship:
        {scholarship}
        """,
        input_variables=["profile", "scholarship"]
    )
    
    chain = prompt | llm
    try:
        result = chain.invoke({
            "profile": str(profile_data),
            "scholarship": str(scholarship_data)
        })
        return result.content
    except Exception as e:
        return f"Error generating essay: {e}"
