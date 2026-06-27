import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
import requests
from typing import Optional, List
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_ollama import ChatOllama

class ScoreResponse(BaseModel):
    probability_score: float = Field(description="Score out of 100 on how likely the user is to win based on requirements vs profile")
    desire_score: float = Field(description="Score out of 100 on how much this matches the user's field and interests")

def get_llm():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: No GEMINI_API_KEY found in environment variables.")
        return None
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    return ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key)

class ScoutNavigationResponse(BaseModel):
    is_institution_relevant: bool = Field(
        description=(
            "Compare the university name and its link structure against the User Profile's target disciplines/major. "
            "Set to False ONLY if this institution is highly specialized in fields completely unrelated to the user's profile "
            "(e.g., a music conservatory when the user wants IT/engineering, or a medical institute when the user wants Business). "
            "Otherwise, if it is a comprehensive/general university or might contain relevant courses, default to True."
        )
    )
    selected_urls: List[str] = Field(description="The top 2-3 most relevant URLs selected from the list. Return empty list if is_institution_relevant is False.")

def evaluate_navigation_links(links: list, profile_data: dict, university_name: str) -> tuple:
    llm = get_primary_llm()
    if not llm:
        raise RuntimeError("No active LLM available. Please ensure Ollama is running or prioritized cloud LLM is configured.")
            
    parser = PydanticOutputParser(pydantic_object=ScoutNavigationResponse)
    
    # Calculate total experience years and inject into profile_data
    exp_years = calculate_experience_years(profile_data.get("experience", ""))
    profile_data["total_experience_years"] = exp_years

    prompt = PromptTemplate(
        template="""
        You are an intelligent "Scout" AI navigating a university website.
        You have extracted all the navigation links from {university_name}.
        
        The user is looking for a program/degree that matches their profile.
        User Profile: {profile}
        
        CRITICAL INSTITUTION RELEVANCE RULE:
        Evaluate if this university offers ANY education in the user's field.
        - If the institution is highly specialized in fields that do NOT overlap with the user's target disciplines/major (e.g., a purely clinical medical school, a music conservatory, or an art institute, while the user's profile is focused on Systems Engineering/Business/IT), set is_institution_relevant to false.
        - If the institution is a general or comprehensive university (e.g. 'University of Geneva'), or if it has departments that might match the user's target disciplines (e.g. a Tech department, a Business school), set is_institution_relevant to true.
        - This decision MUST adapt dynamically to the user's profile: a music school is irrelevant to a Systems Engineer, but highly relevant to a Music major.
        
        Given the following list of links, identify the top 2-3 most relevant links that are highly likely to contain information about the academic programs, degrees, or admissions for this user's field.
        Do NOT guess or hallucinate links. Only return exact URLs that exist in the provided list.
        
        Links:
        {links}
        
        {format_instructions}
        """,
        input_variables=["university_name", "profile", "links"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    try:
        scout_limit = int(os.getenv('SCOUT_MAX_LINKS', 40))
        links_str = ""
        for item in links[:scout_limit]:
            links_str += f"- {item.get('text', '').strip()} : {item.get('url', '').strip()}\n"
            
        formatted = prompt.format(
            university_name=university_name,
            profile=str(profile_data),
            links=links_str
        )
        
        response = llm.invoke(formatted)
        
        # Some models fail over and use fallback
        raw_content = response.content
        if "```json" in raw_content:
            raw_content = raw_content.split("```json")[1].split("```")[0].strip()
            
        parsed = parser.parse(raw_content)
        return parsed.is_institution_relevant, parsed.selected_urls
    except Exception as e:
        print(f"Error in scout evaluation: {e}")
        return True, []

class PivotSuggestionsResponse(BaseModel):
    suggestions: List[str] = Field(description="A list of 20 to 40 target disciplines or career pivots")

def suggest_target_disciplines(major: str, career_goals: str) -> List[str]:
    llm = get_primary_llm()
    if not llm:
        raise RuntimeError("No active LLM available. Please ensure Ollama is running or prioritized cloud LLM is configured.")
            
    parser = PydanticOutputParser(pydantic_object=PivotSuggestionsResponse)
    
    prompt = PromptTemplate(
        template="""
        You are an expert career and academic advisor specializing in interdisciplinary pivots.
        The user has the following background and goals:
        Major/Current Background: {major}
        Career Goals: {career_goals}
        
        Generate a diverse pool of 20 to 40 specific "Target Disciplines" or Master's Degree fields that this user could plausibly pivot into. 
        Include highly interdisciplinary options (e.g., if they are CS, include Tech MBA, BioInformatics, FinTech).
        Keep the strings concise (1-3 words usually).
        
        {format_instructions}
        """,
        input_variables=["major", "career_goals"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm
    try:
        response = chain.invoke({
            "major": major,
            "career_goals": career_goals or "None provided"
        })
        try:
            parsed = parser.parse(response.content)
            return parsed.suggestions
        except Exception as parse_e:
            raw_content = response.content
            if "```json" in raw_content:
                raw_content = raw_content.split("```json")[1].split("```")[0].strip()
            
            import json
            try:
                data = json.loads(raw_content)
                if "properties" in data and "suggestions" in data["properties"]:
                    return data["properties"]["suggestions"]
                if "suggestions" in data:
                    return data["suggestions"]
            except Exception:
                pass
                
            parsed = parser.parse(raw_content)
            return parsed.suggestions
    except Exception as e:
        print(f"Error suggesting pivots: {e}")
        return []

import time
_ollama_status_cache = {"last_check": 0, "status": False, "models": []}

def check_ollama_status() -> bool:
    global _ollama_status_cache
    now = time.time()
    if now - _ollama_status_cache["last_check"] < 300:
        return _ollama_status_cache["status"]
        
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        res = requests.get(f"{base_url}/api/tags", timeout=1.0)
        if res.status_code == 200:
            models = res.json().get("models", [])
            _ollama_status_cache["models"] = models
            _ollama_status_cache["status"] = True
        else:
            _ollama_status_cache["status"] = False
            _ollama_status_cache["models"] = []
    except Exception:
        _ollama_status_cache["status"] = False
        _ollama_status_cache["models"] = []
        
    _ollama_status_cache["last_check"] = now
    return _ollama_status_cache["status"]

def get_ollama_llm():
    if not check_ollama_status():
        return None
        
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    models = _ollama_status_cache["models"]
    
    # Try OLLAMA_MODEL env first
    env_model = os.getenv("OLLAMA_MODEL")
    if env_model:
        has_env_model = any(env_model in m.get("name", "") for m in models)
        if has_env_model:
            print(f"Local Ollama: routing to configured model {env_model}.")
            return ChatOllama(base_url=base_url, model=env_model, temperature=float(os.getenv('LLM_TEMPERATURE', 0.1)))
            
    # Try llama3/llama3.1
    has_llama3 = any("llama3" in m.get("name", "") for m in models)
    if has_llama3:
        matched_model = next((m.get("name") for m in models if "llama3" in m.get("name")), "llama3")
        print(f"Local Ollama detected with {matched_model}! Routing inference to local hardware.")
        return ChatOllama(base_url=base_url, model=matched_model, temperature=float(os.getenv('LLM_TEMPERATURE', 0.1)))
        
    # Fallback to gemma2:2b
    has_gemma = any("gemma2:2b" in m.get("name", "") for m in models)
    if has_gemma:
        print("Local Ollama detected with gemma2:2b! Routing inference to local hardware.")
        return ChatOllama(base_url=base_url, model="gemma2:2b", temperature=float(os.getenv('LLM_TEMPERATURE', 0.1)))
        
    print("Local Ollama detected but preferred models (llama3, gemma2:2b) are missing.")
    return None

def get_hf_llm():
    api_key = os.getenv("HUGGINGFACEHUB_API_TOKEN")
    if not api_key:
        print("Warning: No HUGGINGFACEHUB_API_TOKEN found. Check your .env file.")
        return None
    
    try:
        llm = HuggingFaceEndpoint(
            repo_id="Qwen/Qwen2.5-7B-Instruct",
            max_new_tokens=int(os.getenv('LLM_MAX_TOKENS', 4000)),
            temperature=float(os.getenv('LLM_TEMPERATURE', 0.1)),
            huggingfacehub_api_token=api_key
        )
        return ChatHuggingFace(llm=llm)
    except Exception as e:
        print(f"Error initializing HuggingFace model: {e}")
        return None

def get_primary_llm():
    prioritize_cloud = os.getenv("PRIORITIZE_CLOUD_LLM", "false").lower() == "true"
    if prioritize_cloud:
        llm = get_llm()
        if llm:
            return llm
        llm = get_hf_llm()
        if llm:
            return llm
    return get_ollama_llm()

def score_scholarship(profile_data: dict, scholarship_data: dict):
    llm = get_primary_llm()
    if not llm:
        raise RuntimeError("No active LLM available. Please ensure Ollama is running or prioritized cloud LLM is configured.")
    
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
    improvement_projection: Optional[str] = Field(None, description=f"Actionable advice on what hard requirement the user must fulfill to bypass the {os.getenv('SCORE_CAP_MISSING_REQUIREMENTS', 30)}% ceiling and boost probability to {os.getenv('SCORE_TARGET_IMPROVEMENT', 90)}%+.")
    requires_outreach: bool = Field(False, description="True if the details are too vague and the user should email them to ask for clarification")
    benefits_summary: Optional[str] = Field(None, description="Short summary of what it covers (e.g., 'Tuition + Stipend', 'Family Housing Included')")

class ExtractedProgram(BaseModel):
    title: str = Field(description="Name of the academic program or degree (e.g., MSc Systems Engineering)")
    university: str = Field(description="Name of the University")
    country: str = Field(description="Country where the university is located")
    is_online: bool = Field(False, description="True if the program can be taken fully online")
    is_hybrid: bool = Field(False, description="True if the program is hybrid")
    accepts_international: bool = Field(True, description="True if international students can apply")
    instruction_languages: List[str] = Field(default_factory=list, description="List of languages the program is taught in (e.g. ['English', 'French'])")
    offers_language_training: bool = Field(False, description="True if the university provides local language courses for foreigners")
    foreigner_friendly: bool = Field(True, description="True if the program explicitly caters to or supports international/foreign students")
    details: Optional[str] = Field(None, description="A 2-3 sentence summary of the program and its core curriculum")
    steps: Optional[str] = Field(None, description="Step-by-step application instructions if available")
    important_info: Optional[str] = Field(None, description="Deadlines, specific constraints, or key requirements")
    next_steps: Optional[str] = Field(None, description="Recommended immediate next actions for the user to apply")
    desire_score: float = Field(description="Score out of 100 on how much this matches the user's field and interests")
    probability_score: float = Field(description="Score out of 100 on how likely the user is to be admitted based on requirements vs profile")
    improvement_projection: Optional[str] = Field(None, description=f"Actionable advice on what hard requirement the user must fulfill to bypass the {os.getenv('SCORE_CAP_MISSING_REQUIREMENTS', 30)}% ceiling and boost probability to {os.getenv('SCORE_TARGET_IMPROVEMENT', 90)}%+.")

class ExtractedPageData(BaseModel):
    is_valid: bool = Field(description="True ONLY if this page actually contains ANY relevant university program, scholarship, or financial aid grant. False if it is just a generic article or unrelated page.")
    relevance_rejection_reason: Optional[str] = Field(None, description="If is_valid is False, provide a brief 1-sentence explanation of why this page is irrelevant or does not contain matching programs/scholarships.")
    scholarships: List[ExtractedScholarship] = Field(default_factory=list, description="List of relevant scholarships found on the page")
    programs: List[ExtractedProgram] = Field(default_factory=list, description="List of relevant academic programs/degrees found on the page")

import json
from datetime import datetime

def calculate_experience_years(experience_json_str: str) -> float:
    if not experience_json_str:
        return 0.0
    try:
        exp_list = json.loads(experience_json_str)
        if not isinstance(exp_list, list): return 0.0
        
        periods = []
        current_date = datetime.now()
        for exp in exp_list:
            if not exp.get("startYear") or not exp.get("startMonth"):
                continue
            try:
                start = datetime(int(exp["startYear"]), int(exp["startMonth"]), 1)
                if exp.get("isCurrentRole"):
                    end = current_date
                elif exp.get("endYear") and exp.get("endMonth"):
                    end = datetime(int(exp["endYear"]), int(exp["endMonth"]), 1)
                else:
                    end = start # Fallback if missing end date
                
                if end < start: end = start
                periods.append((start, end))
            except ValueError:
                pass
                
        if not periods: return 0.0
        
        # Merge overlapping periods
        periods.sort(key=lambda x: x[0])
        merged = [periods[0]]
        for current in periods[1:]:
            prev = merged[-1]
            if current[0] <= prev[1]:
                # Overlap, merge
                merged[-1] = (prev[0], max(prev[1], current[1]))
            else:
                merged.append(current)
                
        total_days = sum((end - start).days for start, end in merged)
        return round(total_days / 365.25, 1)
    except Exception:
        return 0.0

def extract_page_content(profile_data: dict, page_data: dict, target_program_context: dict = None, is_mass_scan: bool = False):
    llm = get_primary_llm()
    if not llm:
        raise RuntimeError("No active LLM available. Please ensure Ollama is running or prioritized cloud LLM is configured.")
        
    parser = PydanticOutputParser(pydantic_object=ExtractedPageData)
    
    if target_program_context and not is_mass_scan:
        # Targeted funding scan logic (Quick Scan on a specific program)
        target_info = f"TARGET PROGRAM: {target_program_context.get('title')} at {target_program_context.get('university')}"
        rejection_rule = f"You MUST extract scholarships and financial aid opportunities available at {target_program_context.get('university')}. DO NOT extract new academic programs. Return empty programs list."
    else:
        # General/Mass scan logic
        target_info = "MASS DISCOVERY SCAN: Prioritize extracting Academic Degree Programs over Scholarships."
        if target_program_context:
            target_info += f" Context provided by Scout AI: This page belongs to {target_program_context.get('university')}."
            
        rejection_rule = """You MUST strictly reject and discard ANY program or scholarship that does NOT strongly align with the User's Target Disciplines (Target Areas) and career goals. 
        CAREER SWITCH RULE: The user is looking to transition from their undergraduate major into their Target Disciplines/Areas (e.g. going from Systems Engineering into Business Management, MBA, or Product Management). Therefore, prioritize programs that match the Target Disciplines/Areas over programs that merely match the user's undergraduate Major. If a program matches the undergraduate Major but has no business/management alignment, it should be scored very low or rejected.
        PROGRAM PRIORITY RULE: Your primary goal is to find Academic Programs (Bachelors, Masters, PhDs). Scholarships are secondary bonuses. Do not reject a valid academic program just because it doesn't have a scholarship attached.
        CRITICAL INSTITUTION RULE: Ensure you associate the extracted program with the correct university. If the context gives you a university name, use it."""

    prompt = PromptTemplate(
        template="""
        You are an expert scholarship and university admissions analyzer.
        You have been given raw text scraped from a university or foundation website.
        You MUST output the JSON summary and analysis entirely in English, even if the scraped webpage is in a foreign language.
        
        {target_info}
        
        CRITICAL REJECTION RULE:
        {rejection_rule}
        
        SCORING FORMULAS:
        1. 'desire_score' (Compatibility): Calculate this as {w_disc}% Target Disciplines Match (does it match what the user wants to study next?) + {w_loc}% Location/Modality Match + {w_goals}% Career Goals Match.
        2. 'probability_score' (Acceptance Likelihood): Hard requirements act as a ceiling. If the user is missing a mandatory test (like IELTS/GRE) or has a GPA below the minimum, cap the score at a maximum of {cap_req}%, regardless of their work experience. If the user does not meet the minimum years of experience required by the program, DO NOT discard the program. Instead, cap the probability_score at {cap_exp}% and explicitly state in the improvement_projection that they lack the required experience but should 'pin this program for the future'. Also consider the 'Employment Type' (e.g. Freelance vs Full-time) when evaluating the caliber of the experience.
        3. 'improvement_projection': If the user is capped at {cap_req}% (or {cap_exp}%), explicitly state what hard requirement (IELTS, GRE, documents, or years of experience) they must fulfill to bypass the ceiling and reach a {cap_imp}%+ probability.
        4. 'language_feasibility': Check the extracted 'instruction_languages'. If none of them are English, check the user's profile languages. If the user does not possess the required proficiency (e.g., B2/C1) in the required languages AND 'offers_language_training' is False, cap the 'probability_score' to a maximum of {cap_lang}% and note the language barrier in the 'improvement_projection'. DO NOT discard the program.
        
        User Profile:
        {profile}
        
        Scraped Webpage Title: {page_title}
        Scraped Webpage URL: {page_url}
        Scraped Webpage Text:
        {page_text}
        
        CRITICAL OUTPUT FORMATTING RULE:
        Your output MUST be a populated JSON instance of the schema. DO NOT output the schema itself. DO NOT use "$ref" or "$defs" in your response.
        Example of a valid populated JSON structure:
        {{
          "is_valid": true,
          "relevance_rejection_reason": null,
          "programs": [
            {{
              "title": "MSc Systems Engineering",
              "university": "Example University",
              "country": "United Kingdom",
              "is_online": false,
              "is_hybrid": false,
              "accepts_international": true,
              "instruction_languages": ["English"],
              "offers_language_training": false,
              "foreigner_friendly": true,
              "details": "A master's course in systems engineering...",
              "steps": "1. Online application. 2. Interview.",
              "important_info": "Deadline: June 1st.",
              "next_steps": "Submit transcript.",
              "desire_score": 85.0,
              "probability_score": 75.0,
              "improvement_projection": "Boost IELTS to 7.0."
            }}
          ],
          "scholarships": [
            {{
              "title": "Excellence Scholarship",
              "provider": "Example University",
              "amount": "Full Tuition",
              "description": "Covers tuition for international students.",
              "probability_score": 60.0,
              "desire_score": 90.0,
              "improvement_projection": "Provide recommendation letter.",
              "requires_outreach": false,
              "benefits_summary": "Full tuition waiver"
            }}
          ]
        }}
        
        If no programs or scholarships are found or the page is irrelevant, set is_valid to false and populate relevance_rejection_reason.
        
        {format_instructions}
        """,
        input_variables=["profile", "page_title", "page_url", "page_text", "target_info", "rejection_rule"],
        partial_variables={
            "format_instructions": parser.get_format_instructions(),
            "w_disc": os.getenv('WEIGHT_TARGET_DISCIPLINES', 40),
            "w_loc": os.getenv('WEIGHT_LOCATION', 30),
            "w_goals": os.getenv('WEIGHT_CAREER_GOALS', 30),
            "cap_req": os.getenv('SCORE_CAP_MISSING_REQUIREMENTS', 30),
            "cap_exp": os.getenv('SCORE_CAP_MISSING_EXPERIENCE', 20),
            "cap_lang": os.getenv('SCORE_CAP_LANGUAGE_BARRIER', 15),
            "cap_imp": os.getenv('SCORE_TARGET_IMPROVEMENT', 90)
        }
    )
    
    try:
        # Smart Content Truncation: Restrict to first ~25000 chars (~6000 tokens) to save credits and ignore footers
        safe_page_text = page_data.get("text", "")
        max_page_len = int(os.getenv('MAX_PAGE_TEXT_LENGTH', 25000))
        if len(safe_page_text) > max_page_len:
            safe_page_text = safe_page_text[:max_page_len] + "\n...[Content Truncated]..."
            
        formatted = prompt.format(
            profile=str(profile_data),
            page_title=page_data.get("title", ""),
            page_url=page_data.get("url", ""),
            page_text=safe_page_text,
            target_info=target_info,
            rejection_rule=rejection_rule
        )
        try:
            response = llm.invoke(formatted)
        except Exception as e:
            print(f"Primary LLM failed ({e}).")
            return None
        
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
    major: Optional[str] = Field(None, description="Field of study or major. Choose the closest matching value from this list: 'Computer Science', 'Software Engineering', 'Systems Engineering', 'Information Technology', 'Data Science', 'Cybersecurity', 'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Chemical Engineering', 'Aerospace Engineering', 'Biomedical Engineering', 'Industrial Engineering', 'Business Administration', 'Finance', 'Economics', 'Accounting', 'Marketing', 'Medicine', 'Nursing', 'Public Health', 'Pharmacy', 'Biology', 'Chemistry', 'Physics', 'Mathematics', 'Statistics', 'Environmental Science', 'Veterinary Medicine', 'Psychology', 'Sociology', 'Political Science', 'International Relations', 'Law', 'History', 'Philosophy', 'English Literature', 'Linguistics', 'Journalism', 'Communications', 'Architecture', 'Graphic Design', 'Fine Arts', 'Music', 'Education', 'Social Work'.")
    degree_level: Optional[str] = Field(None, description="The highest completed degree level of the user. Must be exactly one of: 'Bachelors', 'Masters', or 'PhD'.")
    gpa: Optional[float] = Field(None, description="Cumulative GPA (e.g. 3.8)")
    demographics: Optional[str] = Field(None, description="Comma-separated demographic tags or background characteristics (first-generation, minority, etc.)")
    extracurriculars: Optional[str] = Field(None, description="Brief summary of clubs, student activities, or leadership positions")
    hobbies: Optional[str] = Field(None, description="Brief summary of hobbies, interests, or personal projects")
    volunteer_work: Optional[str] = Field(None, description="Brief summary of volunteer activities, community service, or non-profit involvement")
    projects: Optional[str] = Field(None, description="Brief summary of important academic, technical, or personal projects")
    experience: Optional[str] = Field(None, description="Must be a valid JSON array string of objects: [{\"company\": \"...\", \"role\": \"...\", \"dates\": \"MM/YYYY - MM/YYYY or Present\", \"employmentType\": \"Full-time/Part-time/Freelance/Internship\", \"location\": \"...\", \"multinational_roots\": \"Inferred HQ country (e.g. Vietnam for Bitel, UK for Paysafe)\", \"description\": \"...\"}]")
    awards: Optional[str] = Field(None, description="List of awards, academic honors, or notable achievements")
    nationalities: Optional[str] = Field(None, description="Comma-separated list of citizenships or nationalities")
    languages: Optional[str] = Field(None, description="Must be a valid JSON array string of objects: [{\"language\": \"name\", \"is_native\": true/false, \"level\": \"Native/A1/A2/B1/B2/C1/C2\"}]")
    publications: Optional[str] = Field(None, description="Academic publications, research papers, or conference presentations")
    financial_need: Optional[str] = Field(None, description="Mentions of financial constraints, working part-time, or socioeconomic background")
    career_goals: Optional[str] = Field(None, description="Career or educational aspirations")
    relocation_feasibility_score: Optional[int] = Field(None, description="Score 0-100 evaluating feasibility of studying/working abroad based on languages, multinational experience, and caliber of work history.")
    primary_goal: Optional[str] = Field(None, description="Infer from goals if user wants to 'Migrate', 'Brain-Circulation', or 'Local Growth'.")

class ExperienceOnlyExtraction(BaseModel):
    experience: Optional[str] = Field(None, description="Must be a valid JSON array string of objects: [{\"company\": \"...\", \"role\": \"...\", \"dates\": \"MM/YYYY - MM/YYYY or Present\", \"employmentType\": \"Full-time/Part-time/Freelance/Internship\", \"location\": \"...\", \"multinational_roots\": \"Inferred HQ country (e.g. Vietnam for Bitel, UK for Paysafe)\", \"description\": \"...\"}]")

class HighlightsOnlyExtraction(BaseModel):
    extracurriculars: Optional[str] = Field(None, description="Summary of clubs, student activities, or leadership positions.")
    hobbies: Optional[str] = Field(None, description="Summary of hobbies, interests, or personal projects.")
    volunteer_work: Optional[str] = Field(None, description="Summary of volunteer activities, community service, or non-profit involvement.")
    projects: Optional[str] = Field(None, description="Summary of important academic, technical, or personal projects.")
    awards: Optional[str] = Field(None, description="List of awards, academic honors, or notable achievements.")
    publications: Optional[str] = Field(None, description="Academic publications, research papers, or conference presentations.")
    financial_need: Optional[str] = Field(None, description="Mentions of financial constraints, working part-time, or socioeconomic background.")

import re

def convert_dates_to_fields(experience_list):
    months = {'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
              'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
              'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
              'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'}
    
    for item in experience_list:
        if 'dates' in item and isinstance(item['dates'], str):
            dates_str = item['dates'].lower()
            parts = [p.strip() for p in dates_str.split('-')]
            
            # Start date parsing
            start_part = parts[0]
            start_year_match = re.search(r'\b(19|20)\d{2}\b', start_part)
            if start_year_match:
                item['startYear'] = start_year_match.group()
            
            for m_name, m_num in months.items():
                if m_name in start_part:
                    item['startMonth'] = m_num
                    break
            if 'startMonth' not in item:
                month_match = re.search(r'\b(0?[1-9]|1[0-2])/', start_part)
                if month_match: item['startMonth'] = month_match.group(1).zfill(2)

            # End date parsing
            if len(parts) > 1:
                end_part = parts[1]
                if 'present' in end_part or 'actual' in end_part or 'now' in end_part:
                    item['isCurrentRole'] = True
                else:
                    item['isCurrentRole'] = False
                    end_year_match = re.search(r'\b(19|20)\d{2}\b', end_part)
                    if end_year_match:
                        item['endYear'] = end_year_match.group()
                    
                    for m_name, m_num in months.items():
                        if m_name in end_part:
                            item['endMonth'] = m_num
                            break
                    if 'endMonth' not in item:
                        month_match = re.search(r'\b(0?[1-9]|1[0-2])/', end_part)
                        if month_match: item['endMonth'] = month_match.group(1).zfill(2)
            else:
                item['isCurrentRole'] = True

            del item['dates']
    return experience_list

def clean_pdf_spaces(text: str) -> str:
    words = text.split()
    if len(words) < 10:
        return text
    single_char_words = sum(1 for w in words if len(w) == 1)
    if (single_char_words / len(words)) > 0.6:
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            marked = re.sub(r'\s{2,}', ' || ', line.strip())
            parts = marked.split('||')
            cleaned_parts = []
            for part in parts:
                cleaned_word = part.replace(' ', '')
                if cleaned_word:
                    cleaned_parts.append(cleaned_word)
            cleaned_lines.append(' '.join(cleaned_parts))
        return '\n'.join(cleaned_lines)
    return text

def format_list_to_plain_text(value):
    if value is None:
        return None
    if isinstance(value, str):
        try:
            loaded = json.loads(value)
            if isinstance(loaded, (list, dict)):
                return format_list_to_plain_text(loaded)
        except Exception:
            return value
            
    if isinstance(value, list):
        if not value:
            return ""
        if isinstance(value[0], dict):
            formatted_items = []
            for item in value:
                comp = item.get("company") or item.get("name") or item.get("title")
                role = item.get("role") or item.get("position")
                dates = item.get("dates")
                desc = item.get("description") or item.get("details")
                
                header = ""
                if comp:
                    header += comp
                if role:
                    header += f" ({role})" if header else role
                if dates:
                    header += f" [{dates}]" if header else f"[{dates}]"
                
                item_str = ""
                if header:
                    item_str += f"- {header}"
                if desc:
                    desc_str = format_list_to_plain_text(desc)
                    if "\n" in desc_str:
                        desc_str = "\n  " + desc_str.replace("\n", "\n  ")
                    item_str += f": {desc_str}" if item_str else desc_str
                else:
                    item_str = f"- {comp}" if not item_str else item_str
                
                formatted_items.append(item_str)
            return "\n".join(formatted_items)
        else:
            cleaned_items = []
            for item in value:
                formatted_item = format_list_to_plain_text(item)
                if "\n" in formatted_item:
                    formatted_item = formatted_item.replace("\n", "\n  ")
                cleaned_items.append(formatted_item)
            return "\n".join(f"- {item}" if not str(item).startswith('-') else str(item) for item in cleaned_items)
            
    if isinstance(value, dict):
        formatted_items = []
        for k, v in value.items():
            formatted_val = format_list_to_plain_text(v)
            if "\n" in formatted_val:
                formatted_val = "\n  " + formatted_val.replace("\n", "\n  ")
                formatted_items.append(f"- {k}:{formatted_val}")
            else:
                formatted_items.append(f"- {k}: {formatted_val}")
        return "\n".join(formatted_items)
        
    return value

ALLOWED_MAJORS = [
    "Computer Science", "Software Engineering", "Systems Engineering", "Information Technology",
    "Data Science", "Cybersecurity", "Mechanical Engineering", "Civil Engineering",
    "Electrical Engineering", "Chemical Engineering", "Aerospace Engineering", "Biomedical Engineering",
    "Industrial Engineering", "Business Administration", "Finance", "Economics",
    "Accounting", "Marketing", "Medicine", "Nursing", "Public Health",
    "Pharmacy", "Biology", "Chemistry", "Physics", "Mathematics",
    "Statistics", "Environmental Science", "Veterinary Medicine", "Psychology",
    "Sociology", "Political Science", "International Relations", "Law",
    "History", "Philosophy", "English Literature", "Linguistics",
    "Journalism", "Communications", "Architecture", "Graphic Design",
    "Fine Arts", "Music", "Education", "Social Work"
]

def normalize_major(major_str: str) -> str:
    if not major_str:
        return None
    major_lower = major_str.lower()
    for allowed in sorted(ALLOWED_MAJORS, key=len, reverse=True):
        if allowed.lower() in major_lower:
            return allowed
    for allowed in ALLOWED_MAJORS:
        if allowed.lower() in major_lower or major_lower in allowed.lower():
            return allowed
    return major_str

def normalize_degree_level(degree_str: str) -> str:
    if not degree_str:
        return None
    deg_lower = degree_str.lower()
    if 'bachelor' in deg_lower or 'bachiller' in deg_lower or 'b.s.' in deg_lower or 'b.a.' in deg_lower:
        return 'Bachelors'
    if 'master' in deg_lower or 'magister' in deg_lower or 'm.s.' in deg_lower or 'mba' in deg_lower:
        return 'Masters'
    if 'phd' in deg_lower or 'doctor' in deg_lower:
        return 'PhD'
    return degree_str

def robust_json_load(raw_text: str, parser):
    if "```json" in raw_text:
        raw_text = raw_text.split("```json")[1].split("```")[0].strip()
    try:
        start = raw_text.find('{')
        end = raw_text.rfind('}')
        if start != -1 and end != -1:
            json_str = raw_text[start:end+1]
            return json.loads(json_str)
        return json.loads(raw_text)
    except Exception as e:
        print(f"Direct JSON load failed, using Pydantic parser: {e}")
        try:
            parsed = parser.parse(raw_text)
            return parsed.model_dump()
        except Exception as pe:
            print(f"Pydantic parser also failed: {pe}")
            return {}

def parse_profile_from_document(text: str) -> dict:
    llm = get_primary_llm()
    if not llm:
        raise RuntimeError("No active LLM available. Please ensure Ollama is running or prioritized cloud LLM is configured.")
    
    # Clean spacing issues from PDF text
    text = clean_pdf_spaces(text)
    
    # 1. CORE EXTRACTION PASS
    parser = PydanticOutputParser(pydantic_object=ProfileExtraction)
    prompt = PromptTemplate(
        template="""
        You are an expert document parser. Extract the user's core profile information from the following document text (which is typically a resume, CV, or academic profile).
        Provide a summary of details for each of the requested fields if available in the text.
        
        CRITICAL INSTRUCTION FOR EDUCATION: Identify the user's major and degree level from their educational history (e.g., if you see 'Information and Sysyems Engineering Bachellor', the major is 'Systems Engineering' and the degree level is 'Bachelors'). Choose the closest matching major option from the allowed list.
        CRITICAL INSTRUCTION: Calculate the 'relocation_feasibility_score' by evaluating the applicant's spoken languages, multinational work experience, and overall career caliber. 0 means impossible, 100 means highly competitive globally. Also infer the 'primary_goal' (e.g. Brain-Circulation vs Migrate).
        CRITICAL INSTRUCTION FOR EXPERIENCE: Use your internal world knowledge to identify the company's global origin/headquarters and populate the 'multinational_roots' field (e.g., if you see Bitel, infer Vietnam; if you see Paysafe, infer UK).

        Document Text:
        {text}
        
        {format_instructions}
        """,
        input_variables=["text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    chain = prompt | llm
    try:
        response = chain.invoke({"text": text})
        data = robust_json_load(response.content, parser)
        
        # Normalize core dropdown values
        if 'major' in data:
            data['major'] = normalize_major(data['major'])
        if 'degree_level' in data:
            data['degree_level'] = normalize_degree_level(data['degree_level'])
            
        # 2. EXPERIENCES FOCUSED PASS
        print("Running second-pass focused experience extraction...")
        exp_parser = PydanticOutputParser(pydantic_object=ExperienceOnlyExtraction)
        exp_prompt = PromptTemplate(
            template="""
            You are an expert resume/CV parser. Extract ONLY the user's professional work experience (employment history) from the text.
            
            CRITICAL RULES FOR WORK EXPERIENCE EXTRACTION:
            1. ONLY extract paid employment, jobs, internships, or long-term contract roles.
            2. DO NOT extract academic degrees, universities, certifications, courses, or language institutes (e.g., British-Peruvian Cultural Institute, CoderHouse, San Ignacio de Loyola University) as work experience. These are education and must be ignored.
            3. DO NOT extract volunteer work or unpaid community projects as work experience (e.g., volunteer coordinators or Red Cross volunteer projects).
            4. DO NOT extract companies mentioned under Referrals or Recommendations unless the user actually worked there as an employee.
            5. For the 'dates' field, extract the date string exactly as written in the CV (e.g., 'Jun 2025 - Present', 'Dec 2024 - May 2025', or 'Feb 2024 - Jul 2024'). Do not make up dates or shift them to other years.
            6. Identify the headquarters or global origin country of the company for 'multinational_roots' (e.g., UK for Paysafe, Peru for Electroperu, Peru for Nebulab).

            Document Text:
            {text}
            
            {format_instructions}
            """,
            input_variables=["text"],
            partial_variables={"format_instructions": exp_parser.get_format_instructions()}
        )
        exp_chain = exp_prompt | llm
        try:
            exp_res = exp_chain.invoke({"text": text})
            exp_data = robust_json_load(exp_res.content, exp_parser)
            if 'experience' in exp_data and exp_data['experience']:
                if isinstance(exp_data['experience'], str):
                    try:
                        exp_data['experience'] = json.loads(exp_data['experience'])
                    except Exception:
                        pass
                data['experience'] = exp_data['experience']
            else:
                data['experience'] = []
        except Exception as exp_e:
            print(f"Second pass failed: {exp_e}")
            if 'experience' not in data:
                data['experience'] = []

        # 3. HIGHLIGHTS & PROJECTS PASS
        print("Running third-pass focused highlights extraction...")
        hl_parser = PydanticOutputParser(pydantic_object=HighlightsOnlyExtraction)
        hl_prompt = PromptTemplate(
            template="""
            You are an expert resume/CV parser. Extract the user's highlights, projects, awards, publications, volunteer activities, and hobbies from the following text.
            
            CRITICAL RULES:
            1. Return all fields as clean, human-readable plain text descriptions or list of bullet points.
            2. DO NOT return JSON arrays or stringified lists (like `["Award 1", "Award 2"]`) for awards, projects, or publications. Write them out naturally as plain text.
            3. Extract actual items from the text. If a section is not mentioned, return null.

            Document Text:
            {text}
            
            {format_instructions}
            """,
            input_variables=["text"],
            partial_variables={"format_instructions": hl_parser.get_format_instructions()}
        )
        hl_chain = hl_prompt | llm
        try:
            hl_res = hl_chain.invoke({"text": text})
            hl_data = robust_json_load(hl_res.content, hl_parser)
            for k in hl_data:
                if k in ['extracurriculars', 'hobbies', 'volunteer_work', 'projects', 'awards', 'publications', 'financial_need']:
                    data[k] = hl_data[k]
        except Exception as hl_e:
            print(f"Third pass highlights extraction failed: {hl_e}")

        # Use Python helper to reliably parse dates from small LLMs
        if 'experience' in data and isinstance(data['experience'], list):
            data['experience'] = convert_dates_to_fields(data['experience'])

        # Format and serialize fields appropriately for database vs frontend textareas
        for field in list(data.keys()):
            if field in ['experience', 'languages']:
                if isinstance(data[field], (list, dict)):
                    data[field] = json.dumps(data[field])
            else:
                data[field] = format_list_to_plain_text(data[field])
        
        parsed = ProfileExtraction(**data)
        return parsed.model_dump()
            
    except Exception as e:
        print(f"Error parsing document: {e}")
        return {}

class DeepProgramExtraction(BaseModel):
    details: str = Field(description="Comprehensive summary of the program, curriculum, and academic focus.")
    steps: str = Field(description="Step-by-step application instructions, required portals, and timeline.")
    important_info: str = Field(description="Deadlines, hard requirements, IELTS/TOEFL scores, GPA minimums, and specific constraints.")
    next_steps: str = Field(description="Recommended immediate next actions for the user to start the application process.")

def extract_deep_program_details(page_text: str, profile_data: dict, target_program_context: dict) -> dict:
    llm = get_primary_llm()
    if not llm:
        raise RuntimeError("No active LLM available. Please ensure Ollama is running or prioritized cloud LLM is configured.")
        
    parser = PydanticOutputParser(pydantic_object=DeepProgramExtraction)
    
    prompt = PromptTemplate(
        template="""
        You are an expert university admissions advisor conducting a deep-dive on a specific program.
        You have been given raw text scraped from the official university webpage for the following program:
        TARGET PROGRAM: {target_program}
        UNIVERSITY: {university}
        
        Analyze the text thoroughly and extract the exact details, step-by-step application process, important requirements (like test scores, deadlines), and immediate next steps.
        Tailor the actionable advice slightly to the user's profile if possible, highlighting anything they are missing.
        
        User Profile:
        {profile}
        
        Scraped Webpage Text:
        {page_text}
        
        {format_instructions}
        """,
        input_variables=["target_program", "university", "profile", "page_text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    try:
        safe_page_text = page_text
        max_page_len = int(os.getenv('MAX_PAGE_TEXT_LENGTH', 25000))
        if len(safe_page_text) > max_page_len:
            safe_page_text = safe_page_text[:max_page_len] + "\n...[Content Truncated]..."
            
        formatted = prompt.format(
            target_program=target_program_context.get("title", "Unknown Program"),
            university=target_program_context.get("university", "Unknown University"),
            profile=str(profile_data),
            page_text=safe_page_text
        )
        try:
            response = llm.invoke(formatted)
        except Exception as e:
            print(f"Primary LLM failed ({e}).")
            return {}
        
        raw_content = response.content
        if "```json" in raw_content:
            raw_content = raw_content.split("```json")[1].split("```")[0].strip()
            
        parsed = parser.parse(raw_content)
        return parsed.model_dump()
    except Exception as e:
        print(f"Error during deep extraction: {e}")
        return {}

def draft_essay(profile_data: dict, scholarship_data: dict):
    llm = get_primary_llm()
    if not llm:
        return "Please ensure Ollama is running or configure prioritized cloud LLM."
        
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
    llm = get_primary_llm()
    if not llm:
        return "Please ensure Ollama is running or configure prioritized cloud LLM."
        
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
