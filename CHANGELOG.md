# Changelog

All notable changes to the **Educational Pathfinder (formerly Scholarship Hunter)** platform, organized by repository commits.

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
- **Original Template:** Archived original Orbix Health Dashboard under `orbix-original-template/`.
- **docs/ Scaffold:** Added Database Schema details, research foundations, and token cost analysis.
