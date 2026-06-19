# Discovery Engine Technical Breakdown

The Discovery Engine in the Scholarship Hunter project is responsible for finding new scholarships and determining their relevance and likelihood of success for the current user. 

## High-Level Workflow
The process is initiated via the `/scholarships/scan` POST endpoint in `backend/main.py`. The workflow integrates worldwide targeted web scraping, de-duplication, AI-driven scoring, and data persistence.

```mermaid
sequenceDiagram
    participant User as User / Client
    participant API as FastAPI (main.py)
    participant Search as Google Custom Search API
    participant Scrapy as Scrapy Spider
    participant LLM as Gemini AI (ai_agent.py)
    participant DB as SQLite DB

    User->>API: POST /scholarships/scan
    Note over API: Extract: Desired Countries,<br/>Undesired Countries, Languages,<br/>and Major from Profile
    API->>Search: Find University Programs for {Major} in {Desired Countries}
    Search-->>API: List of Seed URLs
    API->>Scrapy: Trigger Spiders with Seed URLs
    activate Scrapy
    Note over Scrapy: Exclude {Undesired Countries} domains<br/>Filter content not in {Languages}<br/>Extract raw data
    Scrapy-->>API: Return scraped items (JSON/Dict)
    deactivate Scrapy

    loop For each scraped scholarship
        API->>DB: Check if URL exists
        alt Is New Scholarship
            API->>LLM: score_scholarship(profile, scholarship)
            activate LLM
            Note over LLM: Prompt Gemini with<br/>user profile & requirements
            LLM-->>API: probability_score, desire_score
            deactivate LLM
            API->>DB: Insert Scholarship + Scores
        end
    end
    API-->>User: Return success message & count
```

## Deep Dive: The Worldwide Discovery Process
To avoid being limited to standard scholarship portals, we utilize a **Two-Phase Discovery Process** to search for university programs and financial aid worldwide.

### Phase 1: Search Seeding
Instead of running blindly, the backend compiles actionable parameters from the user's Profile:
- **Desired Locations (Pros):** Extracted from the Interactive Map to focus the search (e.g. `site:.edu`, `site:.ca`).
- **Undesired Locations (Cons):** Extracted from the map to construct absolute exclusion filters (`-site:.ru`, `-site:.cn`) to ensure no time is wasted on restricted regions.
- **Languages:** Limits the search to programs taught in languages the user actually speaks.
- **Major/Keywords:** Used as the primary search query.

These parameters are sent to a Search API (like Google Custom Search) to generate a high-quality list of seed URLs pointing directly to university program and financial aid pages.

### Phase 2: Dynamic Scrapy Crawling
The generated seed URLs are passed to Scrapy (`CrawlerProcess`).

```mermaid
flowchart TD
    Start[FastAPI triggers Scrapy] --> Param[Inject Parameters: Languages, Exclusions]
    Param --> Spider[Scholarship Spider]
    Spider --> Request[Crawl Seed URLs]
    Request --> Response[Receive HTML Responses]
    Response --> NLP[Lightweight NLP Filter: Is language supported?]
    NLP -- No --> Drop[Drop Item]
    NLP -- Yes --> Parse[Parse with XPath/CSS Selectors]
    Parse --> Items[Extract Data: Title, Provider, Amount, etc.]
    Items --> Pipeline[Item Pipeline: Clean & Validate Data]
    Pipeline --> Output[Yield structured Dictionary/JSON]
    Output --> Engine[Return to FastAPI Engine]
```

## Payload and AI Scoring
The AI Agent no longer just scores "scholarships"; it evaluates whether a given university program matches the candidate and if financial aid is plausible.

The payload sent to the `gemini-3.5-flash` model contains:
- `major`: Field of study
- `gpa`: Grade Point Average
- `demographics`: Background characteristics
- `experience`: Work history
- `languages`: Language proficiency
- `financial_need`: Socioeconomic background constraints
- `career_goals`: Aspirations
- `preferred_modality`: Online vs In-Person

**Token consumption** occurs only *after* the Scrapy pipeline has filtered out undesired countries and unsupported languages, saving significant AI resources.
