# Scholarship Hunter

An AI-powered scholarship discovery, matching, and tracking platform built on top of the Orbix Health Dashboard architecture.

## What We Are Doing
We are transforming a robust dashboard base into a personalized AI assistant. The system uses a Python (FastAPI) backend for scraping and LLM logic, paired with a Vite (React) frontend. 

Crucially, the UI/UX development is guided by a specific suite of AI agent personas to ensure a premium, non-generic aesthetic.

## Architecture Map
```mermaid
graph TD;
    A[App.tsx / Layout] --> B[Dashboard /];
    A --> C[Profile /profile];
    A --> D[Tracker /tracker];
    B --> E[Desire Matches];
    B --> F[Probability Matches];
    C --> G[Academic Core];
    C --> H[Demographics & Need];
    C --> J[Experience & Goals];
    C --> K[Highlights & Projects];
    C --> L[Documents Checklist];
    L --> M[Gemini AI Resume Parser];
    D --> I[Kanban Board];
```

## Directory Scaffold
For AI agents navigating the codebase, here is the master directory layout:

```text
Scholarship-hunter/
├── backend/                  # FastAPI Backend (Python)
│   ├── database.py           # DB Config
│   ├── models.py             # SQLAlchemy Models (Profile, ProfileDocument, Scholarship, etc.)
│   ├── schemas.py            # Pydantic Schemas
│   ├── uploads/              # Local uploaded files (CVs, Recommendations, Diplomas)
│   ├── main.py               # API Endpoints (Upload, Parse, Scan, Draft, etc.)
│   └── ai_agent.py           # LangChain + Gemini LLM integration for scoring, parsing, drafting
├── docs/
│   └── agents/               # AI Persona Rules (Taste, Impeccable, Memanto, etc.)
├── frontend/                 # Vite + React (Orbix Base)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── dashboard/    # Header, Sidebar, MetricCards
│   │   │   └── layout/       # App Layout wrapper
│   │   ├── pages/            # React Router Views (Dashboard, Profile, Tracker)
│   │   ├── index.css         # Tailwind & Theme Variables (Dark Mode included)
│   │   └── App.tsx           # Router Configuration
│   └── package.json          # Frontend Dependencies
├── .memanto/                 # Project memory ledger
├── AGENTS.md                 # Master orchestration instructions for AI
└── README.md                 # This file
```

## How to Run the Project (Unified Developer Menu)

We provide a cross-platform Developer Menu automation system at the root level of the project. This system handles directory traversal, Python virtual environment activation, log merging, and automatic process tree termination when exiting.

### Quick Start (Recommended)
You can run the interactive developer menu using either `npm` (cross-platform, requires Node.js) or `make` (Unix, macOS, or Windows with Git Bash/WSL).

#### Option A: Using NPM (Cross-Platform)
From the root of the project, run:
```bash
npm start
```
or
```bash
npm run dev
```

#### Option B: Using Make (Unix / Git Bash / WSL)
If you have `make` installed on your system, run:
```bash
make
```
or
```bash
make menu
```

This will launch the interactive **Scholarship Hunter Developer Menu**:
```text
==================================================
       ★  SCHOLARSHIP HUNTER DEVELOPER MENU  ★    
==================================================
  [1] Run Full Project (Frontend + Backend Concurrently)
  [2] Run FastAPI Backend Only
  [3] Run React Frontend Only
  [4] Run Playwright E2E Tests
  [5] Exit
==================================================
```

### Direct CLI Shortcuts
You can also bypass the menu and execute targets directly from your shell at the root level:

| Task / Feature | NPM command | Makefile command | Description |
|---|---|---|---|
| **Run Full Project** | (Use Option 1 from `npm start`) | `make run` | Runs Vite and FastAPI concurrently, merging and color-coding output logs in one terminal. |
| **Run Backend Only** | `npm run backend` | `make run-backend` | Starts FastAPI on port 8000 using the python virtual environment. |
| **Run Frontend Only** | `npm run frontend` | `make run-frontend` | Starts Vite development server on port 5173. |
| **Run E2E Tests** | `npm run test:e2e` | `make test` | Runs the Playwright E2E test suite. |

> [!TIP]
> **Process Cleanup**: When you terminate the runner (using `Ctrl+C` or exiting the menu), the utility automatically kills the entire spawned process tree (including uvicorn and node). This prevents orphaned processes from locking up ports `8000` or `5173` on Windows and Unix systems.

---

### Manual / Separate Run Instructions (Legacy)
If you prefer running the servers manually in separate terminal windows:

> [!IMPORTANT]
> **Python Version Requirement**: While the main FastAPI backend can run on Python 3.14, some dependencies in the workspace (such as `crewai` in `external_repos/memanto/examples/crewai-memory/requirements.txt`) do not yet support Python 3.14. It is **highly recommended to use Python 3.12** for the Python environment in this workspace to avoid installation failures.

#### 1. Running the Backend (FastAPI)
The backend requires Python and uvicorn to serve the API.

1. **Open a terminal** and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. **Activate the virtual environment**:
   - On Windows (PowerShell):
     ```powershell
     .\venv\Scripts\activate
     ```
   - On Windows (Command Prompt):
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Environment**:
   Ensure you have a `.env` file in the `backend` directory containing your API keys (e.g., `GEMINI_API_KEY`).
5. **Start the Server**:
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   The backend API will run at `http://127.0.0.1:8000`.

#### 2. Running the Frontend (Vite + React)
The frontend uses Vite for fast development builds.

1. **Open a new terminal** and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. **Install node packages**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The frontend will run at `http://localhost:5173` (or check terminal output for the specific port).

---

## Profile & Documents Feature (New)
The Profile section features a premium **Interactive Overview Landing Dashboard**:
- **Profile Strength Gauge**: Dynamically calculates setup completeness (0% to 100%) based on filled inputs and documents.
- **Interactive Progress Stepper**: Displays a clickable stepper line with dots and checks (Academic Core, Experience & Goals, Personal Highlights, Documents Checklist). Clicking any step navigates directly to that section.
- **AI Quick Start Cards**: Includes CTA cards for CV/Resume and Bachelor's Diploma. Uploading a CV here uploads the file and automatically triggers the Gemini AI parser, completing the fields in a single step.

The Profile details can also be managed manually across four subcategories:
1. **Academic Core**: Full name, major, GPA, and demographic traits.
2. **Experience & Goals**: Text summaries of professional roles, long-term career aspirations, and financial need statements.
3. **Personal & Highlights**: Volunteer details, personal hobbies/interests, key projects, awards/honors, languages, and publications.
4. **Documents Checklist**: Tracks and accepts uploads for:
   - **CV / Resume** (Supports PDF, TXT, DOCX)
   - **Recommendation Letters (1, 2, 3)**
   - **Bachelor's Diploma / Transcript**

### Gemini-Powered AI Autofill
When a user uploads their CV/Resume, they can click the **AI Extract** button. The backend extracts text from the document (using `pypdf`) and prompts Gemini (`gemini-3.5-flash`) to parse all details. The database profile is automatically populated, and the UI values update instantly.

- **Form Integrity Lock**: During the AI extraction process, all input fields, textareas, and save buttons are programmatically disabled to prevent conflict. On the input-centric tabs (*Academic Core*, *Experience & Goals*, and *Highlights & Projects*), a translucent glassmorphic loader overlay is displayed, visually blocking edits while keeping the inputs underneath readable. Users can freely navigate through all tabs to monitor the AI autofill progress in real-time.

These profile categories are passed to the AI drafting agent to compile rich, context-aware scholarship essays.

### E2E Testing & Performance Tuning
To ensure maximum UI responsiveness and prevent regressions:
- **Playwright E2E Suite**: Tests Profile Manager tab transitions, stepper node redirects, and captures visual screenshots under `frontend/e2e-screenshots/`.
- **Latency Optimization**: Configured the frontend and tests to query the backend via explicit IPv4 loopback (`127.0.0.1`) instead of `localhost`. This bypassed IPv6 resolution timeouts, reducing page load latency from ~7.5 seconds to **sub-100ms** (75ms).

To run the E2E tests:
```bash
cd frontend
npm run test:e2e
```

## UI Design Standard: Skeleton Loaders

For a premium, non-generic look, this project avoids full-page spinners and empty states during loading. Instead, always implement visual skeletons that mimic the exact layout of the target component to prevent layout shifts.

* **Usage**: Import the `Skeleton` primitive from `@/components/ui/skeleton`:
  ```tsx
  import { Skeleton } from "@/components/ui/skeleton";
  ```
* **Best Practices**:
  - Keep heights and widths matching or approximating the expected loaded card/content dimensions (e.g., `<Skeleton className="h-5 w-2/3" />`).
  - Use container skeletons inside layouts (e.g., sidebars, forms, card lists) to render early layout frameworks while data fetches.

## UI Design Standard: Smooth Transitions & Interactive States

To maintain a fluid, premium tactile feel, all page transitions, tab switches, and hover interactions must use smooth animation profiles:

* **Tab Switching**: Use the `.animate-tab-content` utility class on the root element of any tab page panel. This applies a `0.35s` slide-up and fade-in animation using a premium cubic-bezier ease (`cubic-bezier(0.16, 1, 0.3, 1)`).
* **Interactive Elements**: All interactive controls (`button`, `a`, `input`, `textarea`, `select`) have global transition behaviors configured in `index.css`. This ensures hover and focus states (backgrounds, borders, shadows, scales) transition smoothly over `0.25s` rather than snapping instantly.
* **Containers & Cards**: Glassmorphic card surfaces (`.bg-card`, `.card-surface`) transition background-colors, borders, box-shadows, and transforms smoothly over `0.3s` using the same custom bezier easing.

## Progress & TODOs

### Already Done
- [x] Initial FastAPI backend setup with Database models (Profile, Scholarship).
- [x] Cloned and integrated the Orbix Health Dashboard base as the new Vite/React frontend.
- [x] Installed and orchestrated visual AI skills (`impeccable`, `huashu-design`, `ui-ux-pro-max`, `taste`).
- [x] Installed frontend dependencies and configured React Router.
- [x] Migrated the custom Scholarship UI (Desire vs Probability matches, Kanban Tracker) into the Orbix layout.
- [x] Added Dark Mode toggle and horizontal scrolling to the Kanban tracker.
- [x] Setup Memanto memory logging.
- [x] Created advanced profile subsections (hobbies, volunteer, projects, experience, awards, publications, goals, financial need).
- [x] Created `ProfileDocument` table & logic to handle CV, recommendations, and diploma uploads.
- [x] Added PDF text extractor (`pypdf`) and python-multipart server dependencies.
- [x] Created Gemini-powered structured extraction endpoint to parse CVs and auto-populate user profiles.
- [x] Integrated all extended profile fields into the AI essay drafting context.
- [x] Redesigned the Profile manager with tabs, upload cards, status badges, and autofill actions.
- [x] Installed Playwright and created performance & visual E2E tests.
- [x] Resolved IPv6 DNS loopback resolution lag to bring page load speeds down to sub-100ms.

### TODOs
- [ ] Build the Python web scraper to feed the `scholarships` table.
- [ ] Connect the remaining frontend UI components to the FastAPI backend endpoints (Dashboard and Tracker).

