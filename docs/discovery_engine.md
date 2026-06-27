# Discovery Engine Technical Breakdown

The Discovery Engine is the core of the **Educational Pathfinder** platform. It utilizes a **Standardized Pipeline** to find university programs and financial aid worldwide, parse unstructured university web pages, and match them against a user's rich profile.

## The Two-Wave Discovery Architecture

To provide a premium, credible experience while conserving compute, we split the engine into two phases: **Wave 1 (Broad Discovery)** and **Wave 2 (Deep Dive)**. We also provide two modes of execution for Wave 1: **Quick Scan** and **Deep Mass Scan**.

```mermaid
sequenceDiagram
    participant User as User Profile
    participant Wave1 as Wave 1: Broad Scan
    participant AI1 as Phase 1: Filter & Discard
    participant UI as Dashboard UI
    participant Wave2 as Wave 2: Deep Dive
    participant AI2 as Phase 2: Details & Funding

    User->>Wave1: Generate Search Queries or Seed ROR URLs
    Note over Wave1: Quick Scan: DDG seeds → Scrapling StealthyFetcher<br/>Mass Scan: ROR db → requests + BeautifulSoup homepage crawl
    Wave1->>AI1: Initial Evaluation (Heuristic Gatekeeper)
    Note over AI1: CRITICAL RULE: Drops any program<br/>without financial aid keywords.
    AI1-->>UI: Renders Sleek University Cards
    UI->>Wave2: User clicks a University Card
    activate Wave2
    Note over Wave2: Opens Modal. Fetches fading Campus Image (Wikidata P18)
    Wave2->>AI2: User clicks "Run Full Deep Dive"
    Note over AI2: Concurrent Dual Scan triggered
    AI2->>AI2: Task A: Find Funding via targeted Scrape
    AI2->>AI2: Task B: Deep Scan official program URL
    Note over AI2: Program Scan extracts Application Steps,<br/>Deadlines, and Hard Requirements.
    AI2-->>UI: Updates UI with deep program specs and financial aid.
    deactivate Wave2
```

### Wave 1: Broad Discovery Scan (Asynchronous Background Task)
To ensure comprehensive coverage and discover as many opportunities as possible, broad discovery operates exclusively through the background Mass Scan pipeline:
- **Task Queue System**: We utilize **Huey** backed by **SQLite** (`SqliteHuey`). This offloads the heavy AI scraping from FastAPI's request cycle to a background `worker.py` process.
- **University Domain Database (ROR)**: The **Research Organization Registry (ROR)** serves as the database seeding source. A script (`fetch_ror.py`) queries the Zenodo API for the latest ROR dataset, filtering it down to ~24,000 educational domains (`universities.json`).
- **Homepage Crawling**: The Mass Scan worker uses lightweight `requests` + `BeautifulSoup` to fetch each university's homepage and extract all internal `<a href>` navigation links.
- **AI Scout Navigation**: The extracted link list is fed to the Scout AI, which selects the top 2-3 specific URLs most likely to contain academic programs or admissions info matching the user's profile.
- **Frontend Interfacing**: The frontend receives a `job_id` and runs an active polling loop against `GET /discovery/mass-scan/{job_id}/status`, reading static JSON log files without stressing the backend.

> [!NOTE]
> **Quick Scan Deprecation**: The synchronous DuckDuckGo-based broad "Quick Scan" has been fully deprecated as it was prone to search-engine rate limits and provided narrow coverage compared to the systematic ROR-based Mass Scan.

### Phase 2: Tier 1 Heuristic Gatekeeper & Crawling

## Tier 1: AI Scout Guided Crawling & Heuristic Gatekeeper
Before performing a deep extraction, the worker relies on a highly efficient pipeline:
1. **AI Scout Selection**: The AI Scout has already pre-selected the 2-3 most relevant links from the university's homepage structure.
2. **Multilingual Gatekeeper**: It fetches those specific pages and applies a relaxed keyword density heuristic. It translates academic keywords (program, degree, bachelor, major) into the target country's native language.
3. If the density of these translated keywords is below `0.2 per 1000 words` (meaning roughly 0 hits), the page is dropped. This serves as a safety net to ensure the Scout didn't hallucinate an empty page.
This ensures only highly relevant, organically discovered academic pages reach the Deep Extraction LLM.

### Tier 2: Deep Extraction via the Primary LLM
Pages that pass Tier 1 are fed to the primary LLM, resolved through the priority configuration in `ai_agent.py`:

1. **Ollama (Local, Default):** Checks if Ollama is running locally. It dynamically searches for `llama3` first (as well as `llama3.1` or the model configured via `OLLAMA_MODEL` env var), then falls back to `gemma2:2b`. Local inference is **free and private** — no data leaves the machine.
2. **Cloud Inference (Optional):** If the environment variable `PRIORITIZE_CLOUD_LLM=True` is enabled and API keys are provided, the system routes to `gemini-1.5-flash` or HuggingFace (`Qwen2.5-7B-Instruct`).

> [!WARNING]
> **No Silent Fallbacks**: If Ollama is offline and cloud inference is not explicitly prioritized/configured, the scan will fail immediately and report a configuration error instead of executing silently with fake scores or mock data.

**Data Standardization (Pre-LLM)**
To maximize accuracy, we feed the LLM highly curated seed data:
- **Categorized Major Standardization**: The UI explicitly groups 40+ recognized global academic majors (e.g. Engineering, Business). By forcing the user to pick from this structured `CATEGORIZED_MAJORS` dictionary (in `majors.ts`), the LLM avoids misinterpreting niche or non-translatable degree titles, granting it a universally understood anchor point.

**Text Truncation Layers (Pre-LLM)**
To minimize token usage, scraped page text passes through three sequential truncation stages before reaching the LLM:
1. **`SCRAPER_MAX_TEXT_LENGTH`** (default: `50,000` chars) — Raw page text cap applied by `scraper.py` immediately after BeautifulSoup extraction.
2. **`filter_text_with_nltk()`** (default: `2,000` chars) — NLTK sentence tokenizer that keeps only sentences containing financial aid or admissions keywords, discarding irrelevant body copy.
3. **`MAX_PAGE_TEXT_LENGTH`** (default: `25,000` chars) — Final cap applied inside `ai_agent.py` before the text is injected into the LLM prompt.

During extraction:
- The LLM extracts structured data adhering to `ExtractedPageData` and `ExtractedProgram` Pydantic schemas.
- **Language Feasibility**: It checks if the `instruction_languages` match the user's known languages. If not, and no `offers_language_training` is available, it caps the `probability_score` to the `SCORE_CAP_LANGUAGE_BARRIER` value (default: 15%).

#### Strict Scoring Algorithm
During extraction, the LLM uses highly engineered strict logic to calculate scores and discard irrelevant items:
- **Target Disciplines Pivot**: The platform explicitly separates the user's *Past Background* (e.g. Computer Science) from their *Target Disciplines* (e.g. Tech MBA). The AI uses the Target Disciplines field to find interdisciplinary pivots instead of strictly searching for their previous major.
- **Desire Score (Compatibility)**: Calculated as **40%** Target Disciplines Match + **30%** Location/Modality Match + **30%** Career Goals Match.
- **Probability Score (Acceptance Likelihood)**: Operates with a **Hard Ceiling**. If the user is missing a mandatory document or standardized test (IELTS/GRE) or has a low GPA, their probability is capped at **30%**.
- **Actionable Advice (Improvement Projection)**: If a user is capped by the ceiling, the LLM populates the `improvement_projection` field with specific steps to bypass it (e.g., *"Upload an IELTS score of 7.0 to bypass the ceiling"*).

### Phase 4: UI Presentation (University-Centric) & Targeted Funding

To accurately reflect the real-world admissions journey, the UI is heavily **University-Centric**:
1. **University Clusters**: Target Programs are grouped under their host institution.
2. **Targeted Funding Scans**: Financial aid is inherently tied to specific institutions and programs. The global scan discovers programs; then, users trigger a highly specific `POST /api/programs/{id}/find-funding` pipeline.
3. **Nested Secured Funding**: Targeted scholarships render visually nested under the specific academic program they support.

**Already-Scanned & Blacklist Filters**:
- **Scanned Domain Registry**: When a university is processed (regardless of success, rejection, or failure), it is added to the `scanned_universities` table. Future scans automatically skip registered domains to prevent redundant crawling and API token usage.
- **University-Level Blacklisting**: Users can block entire universities in the UI (either from dashboard cards or within the Deep Dive modal). This stores the university in the `blacklisted_universities` table and marks all its current programs as `"Discarded"`. Future scans skip blacklisted universities entirely.
- **Scout AI Specialized Skipping (Hybrid Relevance Filter)**: During crawling setup, the Scout AI evaluates the university's name and domain. If it is highly specialized in fields unrelated to the user (e.g. purely medical, conservatory, art, or theology schools), the worker automatically skips the university to save crawl time.
- **Split Blacklist Drawer**: The collapsible drawer at the bottom of the dashboard is split into two columns: **Blacklisted Programs** (individual soft-deleted options) and **Blacklisted Universities** (fully blocked institutions), each supporting immediate restoration.
- **Matches Visibility During Scan**: The dashboard no longer hides matches behind a scanning overlay. Previously discovered matches remain visible and interactive while background mass scans process.

**Asynchronous Job Cancellation**:
- Users can abort enqueued or running scans via the "Cancel Search" button. This triggers `POST /discovery/mass-scan/{job_id}/cancel`, updating the job's status file to `"canceled"`.
- The background worker checks the cancellation flag before processing each university and gracefully exits the loops, saving whatever partial matching results were found prior to cancellation.

**Asynchronous Job Recovery & Failsafe**:
- **Scan Status Recovery:** On mount, the frontend queries `GET /discovery/active-job` to check if a mass discovery scan is already active in the background. If one is found, it automatically displays the progress bar and resumes polling the status endpoint `GET /discovery/mass-scan/{job_id}/status`, allowing seamless page reloads and browser restarts without losing track of progress.
- **Backend Failsafe:** To prevent overloading the local system with multiple concurrent LLM/scraping jobs, `POST /discovery/mass-scan` checks for any existing job logs with a `"running"` or `"pending"` status. If an active job is found, it blocks execution and returns an `HTTP 400 Bad Request` error.
- **Elapsed Time & Processing Metrics Formatting:** Elapsed time tracking during the crawling phase is formatted into a human-readable duration (e.g. `1h 12m 30s`) and includes a real-time average processing speed per page (e.g. `Avg: 33.0s/page`) to give users transparent, precise progress updates.

**Machine Learning Feedback Loop**:
- Discarded opportunities are preserved under the soft-delete status `"Discarded"` to allow offline or asynchronous ML models to search for preference patterns and improve subsequent discovery scores.

---

## CV Profile Autofill Pipeline

Educational Pathfinder includes an AI-assisted onboarding flow where users upload their CV/Resume to automatically populate their matching profiles. To ensure pristine, hallucination-free data extraction, the agent relies on a multi-pass focused pipeline:

### 1. Spacing Normalization (Pre-LLM)
* **Problem**: PDF parser text extractions often yield text with single spaces between every letter (e.g. `C o o r d i n a t e d`). This tokenizes extremely poorly in local models, causing massive hallucinations.
* **Solution**: `clean_pdf_spaces` dynamically merges characters back into proper words before feeding the raw text to the model.

### 2. High-Precision 3-Pass Focused Pipeline
Instead of running a single extraction pass (which overwhelms smaller local models like Llama 3.1 8B), the parser runs three sequential focused passes:
1. **Pass 1: Core Profile**: Extracts name, major, degree level, nationalities, languages, and goals.
2. **Pass 2: Work Experience**: Focused pass under strict rules to extract paid jobs and internships only, enforcing exact CV dates. It explicitly forbids academic degrees, certifications, or volunteer roles from appearing as experience.
3. **Pass 3: Highlights & Projects**: Focused pass to extract projects, awards, publications, volunteer activities, and hobbies.

### 3. Frontend Dropdown Mapping & Typo Tolerance
To ensure extracted values match the strict select options on the frontend, Python helper functions (`normalize_major` and `normalize_degree_level`) dynamically clean and map text variations (e.g., mapping `"Information and Systems Engineering"` to `"Systems Engineering"`, and `"Bachellor"` to `"Bachelors"`).

### 4. Recursive Plain-Text Bullet Formatting
To prevent raw JSON brackets, curly braces, and quotes from displaying inside the textareas, `format_list_to_plain_text` recursively formats nested lists or dictionary elements (e.g. nested lists of project bullet points) into clean, human-readable indented bullet points.

### 5. Mock Data Leakage Prevention
To prevent pre-seeded mock user details from persisting, `parse_profile_from_document` returns a complete model dump of all CV-derived fields. The endpoint `/profile/parse-doc/{doc_type}` explicitly clears and overwrites fields in the database with empty string defaults (or `"[]"` / `None` depending on type) if the uploaded CV does not contain them.
