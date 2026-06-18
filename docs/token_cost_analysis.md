# Token Cost Analysis & LLM Strategy

The Educational Pathfinder relies heavily on `gemini-3.5-flash` for high-throughput, low-latency reasoning tasks. This document outlines the expected API usage metrics and cost projections.

## Pricing Model (Gemini 1.5 Flash)
- **Input Tokens**: ~$0.075 / 1 Million tokens
- **Output Tokens**: ~$0.30 / 1 Million tokens
*Note: We assume Gemini 3.5 Flash maintains parity or drops slightly from 1.5 Flash pricing.*

## Application Features & Usage Profile

### 1. CV Parsing & Feasibility Scoring
**Trigger**: When a user uploads a CV and clicks "AI Autofill".
**Input**: Raw text from PDF (~1,000 - 3,000 tokens). System Prompt with strict JSON schema (~500 tokens).
**Output**: JSON object mapping to Profile DB fields (~400 tokens).
**Cost per execution**: 
- Input: 2,500 * $0.075 / 1M = $0.0001875
- Output: 400 * $0.30 / 1M = $0.00012
- **Total**: ~$0.0003 per user onboarding.

### 2. Scholarship / Program Scoring (Batch processing)
**Trigger**: When the discovery engine scans new scholarships/programs.
**Input**: Compressed User Profile string (~800 tokens) + Target description (~500 tokens).
**Output**: JSON object with `desire_score` and `probability_score` (~50 tokens).
**Cost per execution**:
- Input: 1,300 * $0.075 / 1M = $0.0000975
- Output: 50 * $0.30 / 1M = $0.000015
- **Total**: ~$0.00011 per scholarship scored.
*(Scanning 100 scholarships costs ~$0.011)*

### 3. AI Essay Drafting
**Trigger**: Clicking "Draft Essay" in the Kanban tracker.
**Input**: Full User Profile + Scholarship Context + Tone instructions (~2,000 tokens).
**Output**: Full 800-word essay draft (~1,200 tokens).
**Cost per execution**:
- Input: 2,000 * $0.075 / 1M = $0.00015
- Output: 1,200 * $0.30 / 1M = $0.00036
- **Total**: ~$0.00051 per draft.

### 4. Educational Outreach Emails
**Trigger**: Generating an inquiry email to a university.
**Input**: Profile subset + University Program Context (~1,000 tokens).
**Output**: Short, professional email draft (~250 tokens).
**Cost per execution**:
- Input: 1,000 * $0.075 / 1M = $0.000075
- Output: 250 * $0.30 / 1M = $0.000075
- **Total**: ~$0.00015 per email.

---

## Monthly Projections (per 1,000 Active Users)

Assuming an average user per month:
- Uploads 1 CV.
- Scans 200 programs/scholarships.
- Drafts 5 essays.
- Sends 10 outreach emails.

**Cost Breakdown (Per User):**
- Onboarding: $0.0003
- Scanning (200 * 0.00011): $0.022
- Drafting (5 * 0.00051): $0.00255
- Outreach (10 * 0.00015): $0.0015
**Total Estimated Cost per User**: ~$0.026 / month.

**Total for 1,000 users**: **~$26.00 / month**

## Optimization Strategies Implemented
1. **Model Selection**: Using Flash instead of Pro drastically reduces cost without sacrificing JSON structured output quality.
2. **Field Pruning**: The outreach endpoints only pass relevant fields (name, experience, goal) to the LLM, leaving out heavy arrays like `publications` or `hobbies` if unneeded.
3. **Caching**: Future improvements should include caching identical program descriptions in a vector DB to prevent re-submitting standard university data repeatedly.
