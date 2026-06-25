# Business Rules & Configuration Constants

This document outlines the core business logic thresholds, LLM scoring caps, and application limits that drive the **Educational Pathfinder** (formerly Scholarship Hunter) backend.

These variables are defined in the `.env` file. By extracting these from the hardcoded Python logic into the environment configuration, administrators can tune the application's behavior—balancing cost, accuracy, and scoring strictness—without deploying new code.

---

## 1. LLM Scoring Business Rules

These constants directly inject rules into the Langchain LLM prompts, determining how the AI acts as an "Admissions Advisor" when scoring a user's likelihood of acceptance (`probability_score`) and alignment with their goals (`desire_score`).

| Environment Variable | Default Value | Description & Business Impact |
| :--- | :--- | :--- |
| `SCORE_CAP_MISSING_REQUIREMENTS` | `30` | **Hard Requirement Penalty:** If a user is missing a mandatory test (e.g., IELTS/GRE) or fails to meet the minimum GPA, the AI caps their `probability_score` at this value. Raising this makes the AI more optimistic; lowering it makes the system more strictly enforce hard prerequisites. |
| `SCORE_CAP_MISSING_EXPERIENCE` | `20` | **Experience Penalty:** If the user does not meet the minimum years of experience required by the program, their probability is capped here. The AI will advise them to "pin the program for the future". |
| `SCORE_CAP_LANGUAGE_BARRIER` | `15` | **Language Barrier Penalty:** If the program is not taught in English, the user doesn't speak the instruction language, and no language training is offered, the score is capped here. This prevents discarding the program entirely but highlights it as highly unlikely without language training. |
| `SCORE_TARGET_IMPROVEMENT` | `90` | **Projection Goal:** Used to instruct the AI on what threshold the user is aiming for. The AI generates an `improvement_projection` explaining exactly what the user must do (e.g., "Pass the IELTS") to bypass the penalty caps and reach this target score (e.g., 90%+). |

### Desire Score Weighting
The `desire_score` evaluates how well a program matches the user's profile. These weights (which must add up to 100) are injected into the LLM formula:

*   `WEIGHT_TARGET_DISCIPLINES` (Default: `40`): Importance of the academic field matching the user's desired study area.
*   `WEIGHT_LOCATION` (Default: `30`): Importance of the geographic location and modality (online/hybrid).
*   `WEIGHT_CAREER_GOALS` (Default: `30`): Importance of the program aligning with their long-term career aspirations.

---

## 2. Gatekeeper Logic (Cost & Quality Control)

These constants control the "hybrid-filter" pipeline. They dictate how aggressively the system uses standard Python logic to discard useless web pages *before* sending them to the expensive LLMs.

| Environment Variable | Default Value | Description & Business Impact |
| :--- | :--- | :--- |
| `GATEKEEPER_MIN_WORDS` | `50` | The minimum number of words a webpage must have to be considered for scanning. Pages below this are instantly discarded. Increasing this prevents scanning blank pages or image-heavy galleries. |
| `GATEKEEPER_MIN_DENSITY` | `0.2` | The minimum "Keyword Density" (matches per 1,000 words). The system translates the user's major/goals into the target language and counts occurrences. If the density is below this threshold, the page is dropped. **Impact**: Increasing this to `0.5` will drastically reduce LLM costs but might miss niche programs. Lowering to `0.1` will catch more programs but increase token burn. |
| `MASS_DISCOVERY_SCAN_LIMIT` | `100` | The maximum number of university domains to process in a single mass discovery background job. |

---

## 3. LLM Configuration & Token Limits

These settings directly control the Large Language Model's generation parameters and safeguard the system against token limit exhaustion.

| Environment Variable | Default Value | Description & Business Impact |
| :--- | :--- | :--- |
| `LLM_TEMPERATURE` | `0.1` | Controls the creativity of the AI. Kept very low (0.1) to ensure the AI strictly follows the JSON schema extraction and scoring formulas without hallucinating. |
| `LLM_MAX_TOKENS` | `4000` | The maximum number of output tokens the LLM is allowed to generate per response. |
| `SCOUT_MAX_LINKS` | `200` | When the "Scout AI" looks at a university homepage to find the admissions portal, it receives a raw list of all links. This truncates that list to the first X links. If set too high, it may exceed the LLM's context window. |
| `MAX_PAGE_TEXT_LENGTH` | `25000` | **Critical Safety Limit**: Truncates scraped webpage text during Tier 2 mass extraction. 25,000 characters is roughly 6,000 tokens. Increasing this allows the AI to read longer pages but risks hitting context limits or blowing up the Gemini API bill. |
| `DEEP_SCAN_MAX_PAGE_LENGTH` | `40000` | Used during the targeted "Deep Scan" of a single specific program. Allowed to be larger than mass extraction because it's a one-off focused task. |
