# Changelog

All notable changes to the **Educational Pathfinder** platform, organized by repository commits.

---

## [Phase 2] - Query Optimization, Continent Expansion & Scan Control
### Added
- **Active Job Status Endpoint:** Added `GET /discovery/active-job` to `main.py` to allow client-side progress recovery on page mount/reload.
- **Backend Scan Failsafe:** Added verification checks to `POST /discovery/mass-scan` that block starting a new scan if a scan job is already `"running"` or `"pending"`, returning `400 Bad Request`.
- **Continent Mapping Helper:** Created `continent_mapper.py` which maps continents (e.g. `europe`, `asia`, `north america`) to constituent countries and ISO-2 codes.
- **Dynamic Country ISO Resolution:** Integrated `expand_continents_to_iso` in `worker.py` to correctly filter ROR universities based on continent selections.
- **Scanned Domain Registry:** Created `ScannedUniversity` table/model to record domains analyzed by Scout AI. Scans now auto-exclude registered domains to prevent redundant processing.
- **Asynchronous Cancel Scan Button:** Added a "Cancel Search" button on the dashboard progress bar. It calls `POST /discovery/mass-scan/{job_id}/cancel`, revoking the Huey queue task and signalling the worker loops to abort safely while preserving partial scan matches.
- **Interactive Discard & Blacklist UI:** Added a "Not Interested" button to modal opportunities. Discarded programs are moved to a collapsible, discrete "Blacklisted Opportunities" panel at the bottom of the dashboard, supporting instant restoration.
- **Next Steps Optimization Roadmap:** Added a detailed roadmap to `README.md` to document next steps for local model speed enhancements.

### Removed
- **Quick Scan Deprecation:** Deprecated and completely expunged the synchronous `POST /scholarships/scan` and `POST /discovery/scan` endpoints, frontend mutations, and buttons from the codebase.

### Changed
- **Elapsed Time Formatting:** Updated the crawler progress messages in `worker.py` to format elapsed time in minutes (or `< 1m`) instead of raw seconds, avoiding visual clutter on the UI.
- **Active Polling Recovery Hook:** Refactored the dashboard frontend trigger mutation and added a `useEffect` hook to fetch and resume tracking active scan progress on reload/browser restarts.
- **Standardized Funding Endpoints:** Renamed all `/scholarships` endpoints (for getting matches, discarding, generating drafts, and outbound outreach) to `/funding` on the backend API and updated all matching API client helpers and frontend queries, completely removing all generic scholarship references from the routes.
- **Optimized DuckDuckGo Queries:** `search_seeder.py` constructs targeted queries by combining target disciplines, degree level keywords (bachelor, master, phd), and expanded target countries.
- **Scout Link Cap & Serialization:** Reduced link caps (`SCOUT_MAX_LINKS`) from 200 to 40. Changed serialization from JSON format to a bulleted plain-text string, reducing prompt tokens by 90% and local prefill CPU times from 11 minutes to under 20 seconds.
- **Spoiler-Free Progress Messages:** The progress bar now displays generic counts (e.g. *Scout AI analyzing website 5 of 50...*) instead of exposing raw university names or domains to keep findings a surprise.

---

## [8836813] - Phase 1: Critical Bug Fixes & LLM Dependency Enforcement
### Fixed
- **Scout AI Crash:** Resolved a `NameError` crash in `evaluate_navigation_links` by removing the stale reference to `target_info` and injecting chronological experience years directly into `profile_data`.
- **Silent Fake URL/Score Fallbacks:** Stopped serving mock `example.edu` URLs and hardcoded fake `88%/92%` scores on failures.
- **Fail-Fast Scanner Validations:** Added checks to scan and mass-scan API endpoints to return `400 Bad Request` if no LLM is running/available.

### Changed
- **Cached Ollama Health Check:** Added a cached tags check with a 5-minute TTL to skip polling `localhost:11434` on every page call when Ollama is offline.
- **Dynamic Model Matching:** Extended local Ollama checks in `ai_agent.py` to match `llama3` and custom `OLLAMA_MODEL` environment variable.
- **Configurable Gemini Model:** Swapped hardcoded `gemini-3.5-flash` for the standard `gemini-1.5-flash`, parameterized through the `GEMINI_MODEL` environment variable.

---

## [Unreleased] - Rebranding & White-labeling
### Changed
- **Rebranding:** Renamed all instances of "Scholarship Hunter" to "Educational Pathfinder" across the codebase (documentation, backend, UI, and tooling).
- **Template Scrubbing:** Removed legacy template strings (Orbix Studio Dashboard) from the initial Vite/React integration and replaced them with Educational Pathfinder branding.

---

## [bd670cb] - CV Parsing Pipeline Refinement & Business Rules Configuration
### Added
- **Structured Experience Tracking:** `Profile.tsx` now captures exact Start/End Month/Year and Employment Type (Full-time, Freelance, Internship, etc.) for each work experience entry via Shadcn `Select` components.
- **Chronological Experience Calculation:** `calculate_experience_years()` in `ai_agent.py` merges overlapping employment periods to compute accurate total chronological years, preventing double-counting concurrent roles.
- **Future Pinning Logic:** Programs where the user lacks required years of experience are surfaced with a capped `probability_score` (20%) and an `improvement_projection` instructing the user to "pin for the future."
- **Business Rules Configuration Docs:** Created `docs/business_rules_configuration.md` — full reference for all `.env` variables governing AI scoring caps, gatekeeper thresholds, and token limits.
- **Pipeline Architecture Docs:** Created `docs/pipeline_architecture.md` — flowcharts and sequence diagrams explaining the hybrid logic/LLM routing design.

### Fixed
- **Mock Data Leakage Prevention:** `parse_profile_from_document()` now explicitly clears any profile fields not present in the uploaded CV, preventing stale mock values from persisting.
- **PDF Spacing Normalization:** `clean_pdf_spaces()` detects and heals single-character letter spacing anomalies in PDF-extracted text before feeding it to the LLM.
- **3-Pass CV Extraction:** Sequential focused extraction passes (core profile → work experience → highlights) replace the previous single-pass approach to prevent smaller local models from being overwhelmed.

### Changed
- Extracted all hardcoded scoring and gatekeeper constants from Python source into `.env` variables (`SCORE_CAP_MISSING_REQUIREMENTS`, `SCORE_CAP_MISSING_EXPERIENCE`, `SCORE_CAP_LANGUAGE_BARRIER`, `GATEKEEPER_MIN_DENSITY`, etc.).

---

## [e613005] - App-Wide Input & Dropdown Standardization
### Changed
- **HeroUI Input Migration:** Migrated all native `<input>` and `<textarea>` elements in `Profile.tsx` to HeroUI `<Input>` and `<Textarea>` components for consistent, premium styling.
- **Shadcn Select Enforcement:** Enforced the Shadcn `<Select>` component for every dropdown in the application (experience type, degree level, GPA, language level), replacing any remaining native `<select>` tags and HeroUI selects.
- **HeroUI Accordion:** Integrated HeroUI `<Accordion>` for the collapsible Experience entry section in the Profile page.
- **AGENTS.md Rule:** Added a global rule to `AGENTS.md` mandating Shadcn `Select` for all future dropdown implementations.
- **`frontend_ui_standards.md`:** Updated the components section to document the Shadcn/HeroUI enforcement rules.

---

## [02205b1] - ROR University Database, Background Worker & Profile Forms
### Added
- **`backend/worker.py`:** Full asynchronous background worker using **Huey + SQLite** (`SqliteHuey`) for mass discovery scans. Implements country filtering, Scout AI link routing, Tier 1 gatekeeper, and Tier 2 LLM extraction in a background process decoupled from FastAPI.
- **`backend/fetch_ror.py`:** Script to download and process the latest **Research Organization Registry (ROR)** Zenodo data dump into a local `universities.json` file (~24,000 verified educational institution domains).
- **`backend/universities.json`:** Committed the processed ROR dataset as the master university domain source, replacing the deprecated Hipolabs API entirely.
- **`frontend/src/lib/majors.ts`:** Added `CATEGORIZED_MAJORS` constant dictionary grouping 40+ globally recognized academic disciplines, used by the LLM to anchor program matching.
- **`ecosystem.config.js`:** Added PM2 process entry for the Huey background worker (`worker.py`).
- **`backend/migrate.py`:** Lightweight standalone migration utility for adding columns to existing SQLite databases.

### Changed
- Extended `Profile` model with `undesired_countries`, `target_continents`, and `undesired_continents` columns to support the globe map's avoidance and continent-level preference logic.
- Standardized Profile form layout with two-column masonry sections, localStorage caching for AI-generated Target Disciplines, and sticky "Save Profile" action panels.

---

## [bc1dfb8] - Docker Compose Host Ollama & Scraper/Seeder Refactor
### Changed
- **Docker Compose:** Finalized `docker-compose.yml` to connect backend containers to the host-machine Ollama daemon via `host.docker.internal:11434`, enabling GPU-accelerated local model inference from inside Docker.
- **`scraper.py` Tuning:** Refined `StealthyFetcher` behavior; added automatic detection and redirect to official English-language versions of foreign university pages (`/en`, `?lang=en`).
- **`search_seeder.py` Cleanup:** Simplified DDGS query builder, removed legacy code, added graceful fallback mock URLs when DDG is blocked.
- **`requirements.txt`:** Added `httpx` (used by the Wikidata deep-dive API endpoint).

---

## [14cd063] - Docker Containerization & Gemma 4 Offline AI Engine
### Added
- **`backend/Dockerfile`** and **`frontend/Dockerfile`:** Full containerization of both services.
- **`docker-compose.yml`:** Multi-service Docker Compose setup orchestrating the FastAPI backend, Vite frontend, and host-Ollama bridge.

### Changed
- **AI Agent Routing:** Updated `ai_agent.py` to target **Gemma 4** (`gemma4:e2b`, 7.2GB) as the primary local model via Ollama for both Scout AI and Tier 2 extraction, enabling 100% private, offline, GPU-accelerated inference without any API costs.

---

## [4450ea0] - PM2 Orchestration, Fallback AI Architecture & Background Scraping
### Added
- **3-Tier LLM Fallback Architecture:** Implemented `get_primary_llm()` → `get_ollama_llm()` (tries `llama3.1` first, then `gemma2:2b`) → `get_hf_llm()` (`Qwen2.5-7B-Instruct` via HuggingFace). Gemini is now the last-resort cloud fallback, not the primary model.
- **PM2 Process Manager:** Integrated `ecosystem.config.js` to manage frontend, FastAPI backend, Huey worker, and Ollama service as supervised PM2 processes with automatic restarts.
- **`start_ollama.js`:** Health-check and auto-launcher script for the Ollama model service.
- **Developer Menu Options:** Added `[5] Seed Database`, `[6] Unseed Database`, `[7] Clean Invalid Programs`, `[8] Wipe All Discovered Programs` to `menu.js`.
- **`clean_db.py`:** Utility script to purge discovered programs and scholarships with `Unknown` provider/institution (artifacts of incomplete AI extraction).

### Changed
- Added `target_program_id` FK column to `Scholarship` model, enabling the nested funding relationship (scholarships linked to their parent academic program).
- Extended `database.py` with automatic column-add migrations to handle schema evolution without data loss.

---

## [f73eba5] - Wave 2: Concurrent Deep Program Scan & Financial Aid Extraction
### Added
- **`extract_deep_program_details()` in `ai_agent.py`:** Dedicated focused extraction function for a single known program, returning `details`, `steps`, `important_info`, and `next_steps` fields.
- **`POST /programs/{program_id}/deep-scan` endpoint:** Uses DDGS to find the official program URL (if missing), then scrapes it via Scrapling and runs `extract_deep_program_details()`.
- **Concurrent Wave 2 Execution:** The `UniversityDeepDiveModal` triggers both the deep program scan and the targeted funding scan in parallel via `Promise.all`, halving Wave 2 completion time.

---

## [1751a25] - Deep Dive Modal Polish & Database Cleanup Tooling
### Added
- **DB Cleanup Script (`clean_db.py`):** Standalone utility to delete programs and scholarships with `Unknown` or empty institution names.
- **Menu Options #7 and #8:** Developer Menu now includes `[7] Clean Invalid Programs` and `[8] Wipe ALL Discovered Programs & Funding Data`.

### Changed
- Polished `UniversityDeepDiveModal.tsx` with glassmorphic panel design, campus photo fade-in animation, and structured program requirement rendering.

---

## [313fa56] - Two-Wave Discovery Architecture & University Deep Dive Modal
### Added
- **`UniversityDeepDiveModal.tsx`:** New full-screen modal component presenting university details, campus image, and deep-dive program extraction results in a structured two-pane layout.
- **`GET /universities/{name}/deep-dive` endpoint:** Fetches the official campus photograph via the **Wikidata Semantic API (Property P18)**, guaranteeing real campus images instead of logos.

### Changed
- Refactored `Dashboard.tsx` to implement the two-wave UX: Wave 1 surfaces university program cards; clicking a card opens the Deep Dive Modal for Wave 2 targeted extraction.

---

## [d21c265] - Documentation: University-Centric Dashboard & Targeted Funding
### Changed
- Updated `README.md` to document the university-centric dashboard layout, targeted funding engine, and soft-delete discard behavior.
- Updated `docs/discovery_engine.md` with Wave 2 architecture details and targeted funding pipeline description.

---

## [c2cafb0] - Targeted Funding Engine & University-Centric Dashboard
### Added
- **`POST /programs/{id}/find-funding` Endpoint:** Isolated SSE scan that queries DDGS for funding opportunities specific to a single university and program, streaming results directly to the frontend.
- **Nested Funding UI:** Targeted scholarships render visually nested beneath the specific academic program they support inside the Dashboard.
- **Soft-Delete Discarding:** Users can discard irrelevant programs via a "Not Interested" button (`PATCH /programs/{id}/discard`). Items are preserved as `status = "Discarded"` to eventually train ML ranking models.

### Changed
- Refactored `Dashboard.tsx` to a **university-centric** layout: Target Programs are grouped under their host institution rather than displayed as a flat global list.
- Extended `search_seeder.py` to accept `targeted_university` and `targeted_program_title` parameters for high-precision funding queries.

---

## [7729a6d] - HuggingFace LLM, Scrapling Stealth Fetcher & TargetProgram Schemas
### Added
- **HuggingFace Serverless Inference:** Integrated `Qwen2.5-7B-Instruct` via `langchain_huggingface` as a free open-source alternative to Gemini for discovery extraction, reducing API costs to $0.00 for the mass scan phase.
- **Scrapling `StealthyFetcher`:** Replaced the legacy HTTP-based scraper with Scrapling's stealth browser fetcher to bypass Cloudflare 403 blocks and rate limits on university websites.
- **`TargetProgram` Model & Schema:** Introduced the `target_programs` database table and Pydantic schemas to store discovered academic degree programs separately from scholarships, enabling parallel dual-entity extraction from a single page.
- **`ErrorBoundary.tsx`:** Glassmorphic React class component that intercepts runtime crashes and displays a recovery UI with error details and stack trace.
- **Robust API Response Handling:** Added `handleResponse` helper in `api.ts` to uniformly raise descriptive errors on non-2xx HTTP responses instead of silently failing.
- **Discovery Scan Execution Logger:** JSON logs of each scan (URLs, tokens, costs, extracted items) saved to `backend/discovery_logs/` for post-analysis.
- **`search_seeder.py`:** New module encapsulating DDGS-based URL seeding, separating concerns from the scraper.
- **`.env.example`:** Template documenting all crawler configuration variables (`SEARCH_MAX_RESULTS`, `SCRAPER_DEPTH_LIMIT`, `SCRAPER_MAX_PAGES`, `SCRAPER_MAX_TEXT_LENGTH`).

### Changed
- Extended `ai_agent.py` to perform **parallel multi-entity extraction**: the LLM extracts both `programs` and `scholarships` simultaneously from a single scraped page.
- Added `details`, `steps`, `important_info`, `next_steps`, `instruction_languages`, `offers_language_training`, and `foreigner_friendly` fields to the `TargetProgram` model for richer program data.
- Implemented **Strict AI Scoring Engine**: Hard ceiling (max 30%) on probability scores if missing hard requirements (tests/GPA); 40/30/30 weighting for desire scores (disciplines/location/career goals).

---

## [6c11620] - Geographic Overrides & Exceptions
### Added
- **Country-level Overrides:** Allowed target country preferences (desired/avoided) to take precedence over continent defaults. Users can mark a continent (e.g. Europe) as Desired, but explicitly mark specific countries (e.g. Russia and Belarus) as Avoided.
- **Enabled Interaction:** Removed disabled blockers on country selection buttons when their continent is selected, enabling users to click and define overrides.
- **Tactile Overrides Indicators:** Added dynamic status descriptions to the custom map overlay card:
  - If inherited: *"Preference inherited from continent {Continent} (click Desired/Avoided to override)."*
  - If overridden: *"Continent default overridden explicitly for {Country}."*
- **E2E Test Run:** Re-ran visual and performance Playwright tests to confirm zero regression on profile page rendering.

### Changed
- **Removed Sidebar Noise:** Cleaned up UI noise by removing repeating `(Inherited)` tags next to continent names in the sidebar country rows, keeping list rows minimal.

---

## [d91280e] - Onboarding Wizard, Maps and Outreach Module
### Added
- **Onboarding Wizard Map:** Integrated `react-svg-worldmap` in the onboarding wizard to allow target preferences and tag settings selections upon first login.
- **Educational Outreach Module:** Created email drafter inside the Tracker Kanban page that explains outreach steps and outputs personalized inquiries.
- **CEFR Language Selector:** Reworked the language settings UI into a full-width component with composite dropdowns for languages and CEFR/custom levels.
- **GPA Class Rank Chips:** Added suggestions chips for relative ranking text formats (e.g. `Top 5%`, `Top 10%`, `Summa Cum Laude`).
- **Map Theme Mutation Sync:** Implemented a mutation observer on the document root class lists to reactively sync map themes (CartoDB Dark Matter vs Positron base stylesheets) with the dark/light mode toggles.

### Fixed
- **wizard_bypass query parameter:** Added automated run bypasses so Playwright E2E tests can interact with tabs without wizard overlays blocking the screen.
- **Sticky Sidebar Positioning:** Fixed main app sidebar offset to `top-[72px] h-[calc(100vh-72px)]` to remain locked in viewport bounds.

---

## [7854b20] - Developer Menu & Resume Loading Locks
### Added
- **Unified Developer Menu:** Implemented `menu.js` and a root `Makefile` to concurrently run backend (FastAPI) and frontend (Vite) servers in one shell window.
- **Autofill Loaders:** Configured form locks and glassmorphic overlays in `PreferencesTab.tsx` to display real-time extraction logs and prevent conflicts while Gemini parses the resume in the background.

---

## [0c38ced] - Document Uploads & Resume AI Extractor
### Added
- **Checklist Upload Cards:** Built a documents upload system accepting PDF/TXT/DOCX for CV/Resume, Recommendation Letters, and Bachelor's Diplomas.
- **Gemini AI Resume Parser:** Added pdf text extraction (`pypdf`) in backend and paired with Gemini (`gemini-3.5-flash`) to auto-populate target countries, profile traits, and languages from CV files.
- **FastAPI Type Coercion:** Configured custom Pydantic `field_validators` to coerce numerical GPA entries into string formats, avoiding backend validation response crashes.
- **Playwright Suite:** Initialized end-to-end performance and visual tests.

---

## [4caec02] - SQLite Database Setup & AI Scoring Models
### Added
- **FastAPI Backend Structure:** Integrated SQLAlchemy database engines and model mappings (`Profile`, `Scholarship`).
- **AI Scoring Agent:** Integrated LangChain + Gemini to score discovered scholarships by suitability and probability, and auto-draft application essays.

---

## [3d595bd] - Project Setup & UI Layout Migration
### Added
- **Project Structure:** Migrated Vite/React UI dashboard into main `frontend/` workspace directories.
- **Original Template:** Archived original template dashboard under `orbix-original-template/`.
- **docs/ Scaffold:** Added Database Schema details, research foundations, and token cost analysis.
