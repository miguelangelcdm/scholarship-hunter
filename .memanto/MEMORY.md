# Memanto Project Ledger

## Project Context
The agent is building "Scholarship Hunter": an AI-powered scholarship discovery, matching, and tracking platform built on top of the Orbix Health Dashboard architecture.

## Phase 1 & 2 State (Completed)
* Initial FastAPI backend scaffolded with SQLAlchemy models (`Profile`, `Scholarship`).
* Cloned Orbix Health Dashboard base into `frontend/` as the Vite/React UI foundation.
* Installed visual AI personas (`impeccable`, `taste`, `ui-ux-pro-max`, `huashu-design`) in `docs/agents/` and governed by `AGENTS.md`.

## Phase 3 State (Completed)
* Installed frontend dependencies and configured `react-router-dom`.
* Migrated custom UI logic into Orbix aesthetic:
    * `Dashboard.tsx`: Desire vs Probability matching UI.
    * `Profile.tsx`: Academic and Demographic forms.
    * `Tracker.tsx`: Kanban tracking board.
* Added custom `font-display` scaling for big numbers and titles.
* Fully implemented Dark Mode toggle in `Header.tsx` and horizontal scrollbar in `Tracker.tsx`.

## Phase 4 State (Completed)
* Redesigned the frontend `Profile.tsx` page to default to an interactive Profile Overview landing dashboard.
* Added a dynamic Profile Strength completion score gauge (0-100%).
* Created an interactive 4-step progress stepper with navigation nodes connecting to form tabs.
* Integrated quick-upload cards for CV/Resume and Bachelor's Diploma that execute the file upload and Gemini AI parsing/auto-filling in a single click.
* Updated backend routes and LangChain context templates to support Hobbies, Volunteer Work, Projects, Work Experience, Awards, Languages, Publications, Financial Need, and Career Goals.
* Aligned the Profile outer layout wrapper width with other dashboard pages to ensure identical left grid margins.
* Configured and installed Playwright E2E testing framework (`frontend/playwright.config.ts`, `frontend/e2e/profile.spec.ts`).
* Optimized network requests from ~7.5 seconds to ~75ms by using explicit IPv4 loopbacks (`127.0.0.1`) instead of `localhost` (resolving IPv6 lookup timeouts).

## Current Objective (Phase 5 - Pending)
* Build Python web scraper to feed the `scholarships` table.
* Connect the remaining frontend pages (Dashboard match listings and Kanban Tracker board) to their respective FastAPI endpoints.

