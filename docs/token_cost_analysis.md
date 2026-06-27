# Token Cost Analysis & LLM Strategy

The Educational Pathfinder uses a **3-tier LLM routing strategy** that minimizes costs by preferring free, local, or open-source inference over paid cloud APIs:

1. **Tier 1 — Ollama (Local):** `llama3.1` (8B) → `gemma2:2b` fallback. $0.00 cost. GPU-accelerated on host machine.
2. **Tier 2 — HuggingFace Serverless:** `Qwen2.5-7B-Instruct`. $0.00 within free-tier limits.
3. **Tier 3 — Gemini Flash (Last Resort):** `gemini-3.5-flash`. Only incurs cost if Ollama and HuggingFace are both unavailable.

Cost projections below assume **Gemini is the active inference provider** (worst-case scenario, for SaaS planning purposes).

## Pricing Model (Gemini 1.5 Flash — Worst-Case Baseline)
- **Input Tokens**: ~$0.075 / 1 Million tokens
- **Output Tokens**: ~$0.30 / 1 Million tokens
*Note: In most local development setups, Ollama or HuggingFace handles inference at $0.00.*

## Application Features & Usage Profile

### 1. Multi-Document Onboarding Parsing (CV, LinkedIn, & Diplomas)
**Trigger**: When a user uploads a document (CV, LinkedIn PDF, or Diploma) and triggers the AI autofill extraction.
- **LinkedIn PDF Export**: Highly detailed, structured resume containing full roles, dates, company origins, and skills (~2,000 - 4,000 input tokens). Output returns structured JSON arrays containing detailed experience objects and language proficiencies (~600 output tokens).
- **CV / Resume**: Traditional single-page formats (~1,500 - 3,000 input tokens). Output returns core profile fields (~450 output tokens).
- **Bachelor's Diploma / Transcript**: Grade/credential details and GPA parsing (~500 - 1,500 input tokens). Output returns verified degree title, graduation date, and grade values (~200 output tokens).

**Cost per average LinkedIn / CV parse execution**: 
- Input: 3,000 * $0.075 / 1M = $0.000225
- Output: 600 * $0.30 / 1M = $0.00018
- **Total**: ~$0.0004 per document parse.
*(If a user parses both a LinkedIn profile and a diploma during setup, the onboarding cost is ~$0.0006).*

### 2. Scholarship / Program Scoring (Batch processing)
**Trigger**: When the discovery engine scans new scholarships/programs.

| Inference Tier | Cost Model |
|---|---|
| Ollama (local llama3.1 / gemma2:2b) | **$0.00** — fully local |
| HuggingFace Qwen2.5-7B-Instruct | **$0.00** — within free HF serverless limits |
| Gemini Flash (fallback only) | **~$0.000525 per page** |

In the typical development setup, discovery is handled by the open-source Tier 1/2 models. **Gemini is not called during mass scans** unless both Ollama and HuggingFace are unavailable. The dual-extraction (finding both academic programs and scholarships from a single page) runs natively on whichever model is resolved.

### 3. AI Essay Drafting
**Trigger**: Clicking "Draft Essay" in the Kanban tracker.
**Input**: Full User Profile (including structured work history, languages, nationalities, etc.) + Scholarship Context + Prompt instructions (~2,200 tokens).
**Output**: Full 800-word essay draft (~1,200 tokens).
**Cost per execution**:
- Input: 2,200 * $0.075 / 1M = $0.000165
- Output: 1,200 * $0.30 / 1M = $0.00036
- **Total**: ~$0.000525 per draft.

### 4. Educational Outreach Emails
**Trigger**: Generating an inquiry email to a university admissions office.
**Input**: Profile subset + University Program Context (~1,100 tokens).
**Output**: Short, professional email draft (~250 tokens).
**Cost per execution**:
- Input: 1,100 * $0.075 / 1M = $0.0000825
- Output: 250 * $0.30 / 1M = $0.000075
- **Total**: ~$0.0001575 per email.

---

## Monthly Projections (per 1,000 Active Users)

Assuming an average user per month:
- Uploads and parses 2 documents (e.g. LinkedIn PDF + Diploma).
- Scans 200 programs/scholarships.
- Drafts 5 essays.
- Sends 10 outreach emails.

**Cost Breakdown (Per User) — Gemini-only worst case:**
- Onboarding (2 parses): $0.0008
- Scanning (200 pages × $0.000525): $0.1050 *(if Gemini handles all — extremely unlikely)*
- Scanning (200 pages × $0.00): $0.00 *(if Ollama or HuggingFace active — typical)*
- Drafting (5 × $0.000525): $0.0026
- Outreach (10 × $0.0001575): $0.0016
**Total Estimated Cost per User (Gemini-only)**: ~$0.11 / month.
**Total Estimated Cost per User (Ollama/HF for scanning)**: ~$0.004 / month.

**Total for 1,000 active users (typical setup)**: **~$4.00 / month**

---

## Optimization Strategies Implemented
1. **Model Selection**: Using Flash instead of Pro drastically reduces cost without sacrificing JSON structured output quality.
2. **Field Pruning**: The outreach and scoring endpoints filter out heavy, irrelevant profile fields (like hobbies or publications) from the input prompt payload unless strictly required.
3. **Structured Inputs**: Standardizing experience and languages into compact JSON database arrays reduces delimiters and prompt formatting overhead, lowering input tokens.
4.  **Tier-1 Heuristic Gatekeeper**: During discovery scans, `worker.py` applies a pure-Python keyword density gatekeeper (`calculate_relevance_density()`). Raw web pages that do not meet the minimum keyword density threshold (`GATEKEEPER_MIN_DENSITY`, default: `0.2` per 1000 words) are immediately discarded before *any* AI extraction occurs, preventing thousands of wasted tokens on irrelevant university pages (e.g., faculty directories or campus news) via Scrapling.
5. **Caching**: Future improvements should include caching identical program descriptions in a vector DB to prevent re-submitting standard university data repeatedly.
