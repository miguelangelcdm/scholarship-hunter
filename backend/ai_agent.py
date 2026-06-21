import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import Optional, List
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace

class ScoreResponse(BaseModel):
    probability_score: float = Field(description="Score out of 100 on how likely the user is to win based on requirements vs profile")
    desire_score: float = Field(description="Score out of 100 on how much this matches the user's field and interests")

def get_llm():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: No GEMINI_API_KEY found in environment variables.")
        return None
    return ChatGoogleGenerativeAI(model="gemini-3.5-flash", google_api_key=api_key)

def get_hf_llm():
    api_key = os.getenv("HUGGINGFACEHUB_API_TOKEN")
    if not api_key:
        print("Warning: No HUGGINGFACEHUB_API_TOKEN found. Check your .env file.")
        return None
    
    try:
        # Using a highly capable open-source model that fully supports Chat endpoints
        llm = HuggingFaceEndpoint(
            repo_id="Qwen/Qwen2.5-7B-Instruct",
            max_new_tokens=4000,
            temperature=0.1,
            huggingfacehub_api_token=api_key
        )
        return ChatHuggingFace(llm=llm)
    except Exception as e:
        print(f"Error initializing HuggingFace model: {e}")
        return None

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

class ExtractedScholarship(BaseModel):
    title: str = Field(description="Name of the scholarship, program, or grant")
    provider: str = Field(description="Name of the University, Institution, or Foundation")
    amount: Optional[str] = Field(None, description="Amount of money, or 'Full Tuition', 'Partial', etc.")
    description: str = Field(description="A 2-3 sentence summary of the grant and its core requirements")
    probability_score: float = Field(description="Score out of 100 on how likely the user is to win based on requirements vs profile")
    desire_score: float = Field(description="Score out of 100 on how much this matches the user's field and interests")
    improvement_projection: Optional[str] = Field(None, description="Actionable advice on what hard requirement the user must fulfill to bypass the 30% ceiling and boost probability to 90%+.")
    requires_outreach: bool = Field(False, description="True if the details are too vague and the user should email them to ask for clarification")
    benefits_summary: Optional[str] = Field(None, description="Short summary of what it covers (e.g., 'Tuition + Stipend', 'Family Housing Included')")

class ExtractedProgram(BaseModel):
    title: str = Field(description="Name of the academic program or degree (e.g., MSc Systems Engineering)")
    university: str = Field(description="Name of the University")
    country: str = Field(description="Country where the university is located")
    is_online: bool = Field(False, description="True if the program can be taken fully online")
    is_hybrid: bool = Field(False, description="True if the program is hybrid")
    accepts_international: bool = Field(True, description="True if international students can apply")
    details: Optional[str] = Field(None, description="A 2-3 sentence summary of the program and its core curriculum")
    steps: Optional[str] = Field(None, description="Step-by-step application instructions if available")
    important_info: Optional[str] = Field(None, description="Deadlines, specific constraints, or key requirements")
    next_steps: Optional[str] = Field(None, description="Recommended immediate next actions for the user to apply")
    desire_score: float = Field(description="Score out of 100 on how much this matches the user's field and interests")
    probability_score: float = Field(description="Score out of 100 on how likely the user is to be admitted based on requirements vs profile")
    improvement_projection: Optional[str] = Field(None, description="Actionable advice on what hard requirement the user must fulfill to bypass the 30% ceiling and boost probability to 90%+.")

class ExtractedPageData(BaseModel):
    is_valid: bool = Field(description="True ONLY if this page actually contains ANY relevant university program, scholarship, or financial aid grant. False if it is just a generic article or unrelated page.")
    scholarships: List[ExtractedScholarship] = Field(default_factory=list, description="List of relevant scholarships found on the page")
    programs: List[ExtractedProgram] = Field(default_factory=list, description="List of relevant academic programs/degrees found on the page")

def extract_page_content(profile_data: dict, page_data: dict, target_program_context: dict = None):
    llm = get_hf_llm()
    if not llm:
        print("Falling back to Gemini for extraction since HF is not configured...")
        llm = get_llm()
        if not llm:
            return None
        
    parser = PydanticOutputParser(pydantic_object=ExtractedPageData)
    
    if target_program_context:
        # Targeted funding scan logic
        target_info = f"TARGET PROGRAM: {target_program_context.get('title')} at {target_program_context.get('university')}"
        rejection_rule = f"You MUST extract scholarships and financial aid opportunities available at {target_program_context.get('university')}. DO NOT extract new academic programs. Return empty programs list."
    else:
        # General scan logic
        target_info = ""
        rejection_rule = """You MUST strictly reject and discard ANY program or scholarship that does NOT strongly align with the User's major and career goals. 
        CRITICAL INSTITUTION RULE: If the exact, concrete name of the university or institution cannot be found in the text, you MUST discard the program. Do not extract it. Do not use placeholders like 'Unknown University'. We only want concrete opportunities."""

    prompt = PromptTemplate(
        template="""
        You are an expert scholarship and university admissions analyzer.
        You have been given raw text scraped from a university or foundation website.
        
        {target_info}
        
        CRITICAL REJECTION RULE:
        {rejection_rule}
        
        SCORING FORMULAS:
        1. 'desire_score' (Compatibility): Calculate this as 40% Academic Field Match + 30% Location/Modality Match + 30% Career Goals Match.
        2. 'probability_score' (Acceptance Likelihood): Hard requirements act as a ceiling. If the user is missing a mandatory test (like IELTS/GRE) or has a GPA below the minimum, cap the score at a maximum of 30%, regardless of their work experience. If they meet all hard requirements, base the score on their experience and soft factors.
        3. 'improvement_projection': If the user is capped at 30%, explicitly state what hard requirement (IELTS, GRE, documents) they must upload to bypass the ceiling and reach a 90%+ probability.
        
        User Profile:
        {profile}
        
        Scraped Webpage Title: {page_title}
        Scraped Webpage URL: {page_url}
        Scraped Webpage Text:
        {page_text}
        
        {format_instructions}
        """,
        input_variables=["profile", "page_title", "page_url", "page_text", "target_info", "rejection_rule"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    try:
        formatted = prompt.format(
            profile=str(profile_data),
            page_title=page_data.get("title", ""),
            page_url=page_data.get("url", ""),
            page_text=page_data.get("text", ""),
            target_info=target_info,
            rejection_rule=rejection_rule
        )
        response = llm.invoke(formatted)
        
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            input_tokens = response.usage_metadata.get("input_tokens", 0)
            output_tokens = response.usage_metadata.get("output_tokens", 0)
        
        raw_content = response.content
        if "```json" in raw_content:
            raw_content = raw_content.split("```json")[1].split("```")[0].strip()
            
        try:
            parsed = parser.parse(raw_content)
            result_dict = parsed.model_dump()
            result_dict["url"] = page_data.get("url", "")
            result_dict["token_usage"] = {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": (input_tokens * 0.0001 + output_tokens * 0.0002) / 1000
            }
            return result_dict
        except Exception as e:
            print(f"Failed to parse JSON: {e}")
            return None
    except Exception as e:
        print(f"Error extracting/scoring: {e}")
        return None

class ProfileExtraction(BaseModel):
    name: Optional[str] = Field(None, description="The user's full name if found in the text")
    major: Optional[str] = Field(None, description="Field of study or major (e.g. Computer Science)")
    gpa: Optional[float] = Field(None, description="Cumulative GPA (e.g. 3.8)")
    demographics: Optional[str] = Field(None, description="Comma-separated demographic tags or background characteristics (first-generation, minority, etc.)")
    extracurriculars: Optional[str] = Field(None, description="Brief summary of clubs, student activities, or leadership positions")
    hobbies: Optional[str] = Field(None, description="Brief summary of hobbies, interests, or personal projects")
    volunteer_work: Optional[str] = Field(None, description="Brief summary of volunteer activities, community service, or non-profit involvement")
    projects: Optional[str] = Field(None, description="Brief summary of important academic, technical, or personal projects")
    experience: Optional[str] = Field(None, description="Must be a valid JSON array string of objects: [{\"company\": \"...\", \"role\": \"...\", \"dates\": \"...\", \"location\": \"...\", \"multinational_roots\": \"Inferred HQ country (e.g. Vietnam for Bitel, UK for Paysafe)\", \"description\": \"...\"}]")
    awards: Optional[str] = Field(None, description="List of awards, academic honors, or notable achievements")
    nationalities: Optional[str] = Field(None, description="Comma-separated list of citizenships or nationalities")
    languages: Optional[str] = Field(None, description="Must be a valid JSON array string of objects: [{\"language\": \"name\", \"is_native\": true/false, \"level\": \"Native/A1/A2/B1/B2/C1/C2\"}]")
    publications: Optional[str] = Field(None, description="Academic publications, research papers, or conference presentations")
    financial_need: Optional[str] = Field(None, description="Mentions of financial constraints, working part-time, or socioeconomic background")
    career_goals: Optional[str] = Field(None, description="Career or educational aspirations")
    relocation_feasibility_score: Optional[int] = Field(None, description="Score 0-100 evaluating feasibility of studying/working abroad based on languages, multinational experience, and caliber of work history.")
    primary_goal: Optional[str] = Field(None, description="Infer from goals if user wants to 'Migrate', 'Brain-Circulation', or 'Local Growth'.")

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
            "experience": "[{\"company\": \"TechCorp\", \"role\": \"Software Engineering Intern\", \"dates\": \"Summer 2024\", \"location\": \"San Francisco, CA\", \"multinational_roots\": \"United States\", \"description\": \"Developed APIs and maintained services\"}]",
            "awards": "Dean's List 2024-2025, Regional Hackathon Winner",
            "nationalities": "United States",
            "languages": "[{\"language\": \"English\", \"is_native\": true, \"level\": \"Native\"}, {\"language\": \"Spanish\", \"is_native\": false, \"level\": \"B2\"}]",
            "publications": "Co-authored 'Machine Learning in Medical Imaging' in IEEE Trans",
            "financial_need": "Funded studies through part-time tutoring jobs",
            "career_goals": "Pursue a PhD in Artificial Intelligence and teach",
            "relocation_feasibility_score": 85,
            "primary_goal": "Brain-Circulation"
        }
    
    parser = PydanticOutputParser(pydantic_object=ProfileExtraction)
    prompt = PromptTemplate(
        template="""
        You are an expert document parser. Extract the user's scholarship profile information from the following document text (which is typically a resume, CV, or academic profile).
        Provide a summary of details for each of the requested fields if available in the text.
        
        CRITICAL INSTRUCTION: Calculate the 'relocation_feasibility_score' by evaluating the applicant's spoken languages, multinational work experience, and overall career caliber. 0 means impossible, 100 means highly competitive globally. Also infer the 'primary_goal' (e.g. Brain-Circulation vs Migrate).
        CRITICAL INSTRUCTION FOR EXPERIENCE: Use your internal world knowledge to identify the company's global origin/headquarters and populate the 'multinational_roots' field (e.g., if you see Bitel, infer Vietnam; if you see Paysafe, infer UK).
        
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

def draft_outreach_email(profile_data: dict, scholarship_data: dict):
    llm = get_llm()
    if not llm:
        return "Please configure GEMINI_API_KEY in the .env file to generate an outreach email draft."
        
    prompt = PromptTemplate(
        template="""
        You are an expert scholarship advisor.
        Write a professional, concise, and polite outreach email to a university's financial aid office or program director regarding the following scholarship.
        The goal is to ask for clarification, demonstrate keen interest, and present the applicant as a strong candidate without being presumptuous.
        
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
        return f"Error generating email: {e}"
