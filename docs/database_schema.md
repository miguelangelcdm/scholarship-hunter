# Database Schema & Entity Relationship Diagram

This document outlines the SQLite schema (managed via SQLAlchemy) for the Educational Pathfinder platform.

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    Profile ||--o{ ProfileDocument : "owns"
    Profile ||--o{ UserRequirement : "has"
    Scholarship ||--o{ ScholarshipRequirement : "has"

    Profile {
        Integer id PK
        String name
        String major
        String gpa
        String demographics
        String resume_text
        String hobbies
        String volunteer_work
        String projects
        String experience
        String awards
        String languages
        String publications
        String financial_need
        String career_goals
        String target_countries
        String target_tags
        Boolean has_dependents
        String primary_goal
        String preferred_modality
        Integer relocation_feasibility_score
        String target_diaspora_regions
    }

    ProfileDocument {
        Integer id PK
        Integer profile_id FK
        String doc_type
        String filename
        String filepath
        Boolean is_uploaded
        DateTime uploaded_at
        String parsed_text
    }

    UserRequirement {
        Integer id PK
        Integer profile_id FK
        String requirement_name
        String requirement_value
    }

    Scholarship {
        Integer id PK
        String title
        String provider
        String amount
        DateTime deadline
        String description
        String url
        Float desire_score
        Float probability_score
        String status
        String benefits_summary
        Integer prestige_tier
        Integer award_count
        Boolean requires_outreach
    }

    ScholarshipRequirement {
        Integer id PK
        Integer scholarship_id FK
        String description
    }

    TargetProgram {
        Integer id PK
        String title
        String university
        String country
        String url
        Boolean is_online
        Boolean is_hybrid
        Boolean accepts_international
        String status
    }
```

## Data Dictionary

### 1. `profiles` Table
Stores primary user profile details, parsed resume contexts, and target matching preferences.

| Field | Type | Key | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Integer` | `PK` | `No` | *None* | Primary Key. Unique auto-incrementing row ID. |
| `name` | `String` | | `No` | `"My Profile"` | Full name of the user. |
| `major` | `String` | | `Yes` | *None* | Major or primary field of academic study. |
| `gpa` | `String` | | `Yes` | *None* | Academic score or class rank (e.g. `"3.91"` or `"Top 5%"`). |
| `demographics` | `String` | | `Yes` | *None* | Comma-separated list of demographics tags (e.g. `"First-Gen, Woman in STEM"`). |
| `extracurriculars` | `String` | | `Yes` | *None* | Text description listing student activities. |
| `resume_text` | `String` | | `Yes` | *None* | Cached plain text content parsed from the CV/Resume file. |
| `hobbies` | `String` | | `Yes` | *None* | Text description of personal hobbies and interests. |
| `volunteer_work` | `String` | | `Yes` | *None* | Text description of community service and volunteer history. |
| `projects` | `String` | | `Yes` | *None* | Summary descriptions of relevant software/academic projects. |
| `experience` | `String` | | `Yes` | *None* | Summary descriptions of past work or research roles. |
| `awards` | `String` | | `Yes` | *None* | Academic and professional awards or honor titles. |
| `languages` | `String` | | `Yes` | *None* | Languages spoken and related score certificates. |
| `publications` | `String` | | `Yes` | *None* | Academic publications, papers, or co-authored research works. |
| `financial_need` | `String` | | `Yes` | *None* | Explanatory text summarizing student financial need. |
| `career_goals` | `String` | | `Yes` | *None* | Long-term academic and professional aspirations. |
| `target_countries` | `String` | | `Yes` | *None* | JSON array string listing selected location targets (e.g. `[{"country": "Germany"}]`). |
| `target_areas` | `String` | | `Yes` | *None* | Desired fields of study or disciplines. |
| `target_tags` | `String` | | `Yes` | *None* | Comma-separated keywords matching study programs. |
| `experience_level` | `String` | | `Yes` | *None* | Overall professional background tier. |
| `target_universities` | `String` | | `Yes` | *None* | Specific universities targeted for matching. |
| `has_dependents` | `Boolean` | | `No` | `False` | Flag indicating if the user has family dependents. |
| `primary_goal` | `String` | | `Yes` | *None* | User objective: `"Local Growth"`, `"Entrepreneurship"`, `"Emigrate"`, or `"Brain-Circulation"`. |
| `preferred_modality` | `String` | | `Yes` | *None* | Preferences: `"Online"`, `"Hybrid"`, `"In-Person (Local)"`, or `"In-Person (Abroad)"`. |
| `relocation_feasibility_score` | `Integer` | | `Yes` | *None* | Calculated feasibility score (0-100) regarding migration requirements. |
| `target_diaspora_regions` | `String` | | `Yes` | *None* | Explanations regarding family connections or target regions abroad. |

---

### 2. `profile_documents` Table
Manages user uploaded documents and holds parsed raw text blocks.

| Field | Type | Key | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Integer` | `PK` | `No` | *None* | Primary Key. Unique auto-incrementing document ID. |
| `profile_id` | `Integer` | `FK` (to `profiles.id`) | `No` | *None* | Foreign Key referencing the user profile owner. |
| `doc_type` | `String` | | `No` | *None* | Document class: `'cv'`, `'recommendation_letter_1'`, `'recommendation_letter_2'`, `'recommendation_letter_3'`, or `'bachelor_diploma'`. |
| `filename` | `String` | | `No` | *None* | Original uploaded file name. |
| `filepath` | `String` | | `No` | *None* | Server disk storage file path. |
| `is_uploaded` | `Boolean` | | `No` | `False` | Status flag validating upload success. |
| `uploaded_at` | `DateTime` | | `No` | `datetime.utcnow` | Timestamp recording when the document was received. |
| `parsed_text` | `String` | | `Yes` | *None* | Cached plain text block parsed out of the PDF or TXT file. |

---

### 3. `user_requirements` Table
Captures custom custom portfolio or application requirements mapped on profiles.

| Field | Type | Key | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Integer` | `PK` | `No` | *None* | Primary Key. Auto-incrementing identifier. |
| `profile_id` | `Integer` | `FK` (to `profiles.id`) | `No` | *None* | Foreign Key mapping this requirement to a user profile. |
| `requirement_name` | `String` | | `No` | *None* | Name or title of the custom requirement (e.g. `"GitHub Portfolio"`). |
| `requirement_value` | `String` | | `No` | *None* | The contents or url reference details for this requirement. |

---

### 4. `scholarships` Table
Contains financial aid opportunities discovered and rated for matching.

| Field | Type | Key | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Integer` | `PK` | `No` | *None* | Primary Key. Auto-incrementing row ID. |
| `title` | `String` | | `No` | *None* | Scholarship name. Indexed. |
| `provider` | `String` | | `No` | *None* | Host institution or agency funding the scholarship. |
| `amount` | `String` | | `Yes` | *None* | Financial worth representation (e.g. `"$15,000"`, `"Full Tuition"`). |
| `deadline` | `DateTime` | | `Yes` | *None* | Application closing deadline timestamp. |
| `description` | `String` | | `No` | *None* | Detailed text outline of rules, eligibility, and terms. |
| `url` | `String` | | `No` | *None* | Link target pointing to details or application form. |
| `desire_score` | `Float` | | `No` | `0.0` | Fit score rating (0-100) on user interest overlap. |
| `probability_score` | `Float` | | `No` | `0.0` | Win chance score (0-100) calculated on academic/trait matches. |
| `status` | `String` | | `No` | `"Discovered"` | Board column: `"Discovered"`, `"To Apply"`, `"Drafting"`, `"Applied"`, `"Rejected"`, `"Won"`. |
| `benefits_summary` | `String` | | `Yes` | *None* | Extracted list of extra benefits (e.g. travel, housing, health). |
| `prestige_tier` | `Integer` | | `Yes` | *None* | Academic status tier index representing scholarship difficulty/reputation. |
| `award_count` | `Integer` | | `Yes` | *None* | Number of individual awards typically granted. |
| `requires_outreach` | `Boolean` | | `No` | `False` | Toggle flag set if contacting university advisors is recommended. |

---

### 5. `scholarship_requirements` Table
Lists individual requirement constraints mapped to scholarships.

| Field | Type | Key | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Integer` | `PK` | `No` | *None* | Primary Key. Auto-incrementing identifier. |
| `scholarship_id` | `Integer` | `FK` (to `scholarships.id`) | `No` | *None* | Foreign Key mapping to the parent scholarship. |
| `description` | `String` | | `No` | *None* | Statement detailing a specific scholarship requirement constraint. |

---

### 6. `target_programs` Table
Stores targeted university degree program matches found during discovery scans.

| Field | Type | Key | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Integer` | `PK` | `No` | *None* | Primary Key. Auto-incrementing row ID. |
| `title` | `String` | | `No` | *None* | Program study major title. Indexed. |
| `university` | `String` | | `No` | *None* | Name of the higher-education institution hosting the program. |
| `country` | `String` | | `No` | *None* | Target country where the university resides. |
| `url` | `String` | | `Yes` | *None* | Program information web page. |
| `is_online` | `Boolean` | | `No` | `False` | Boolean set to true if the program is fully remote/online. |
| `is_hybrid` | `Boolean` | | `No` | `False` | Boolean set to true if the program is hybrid. |
| `accepts_international` | `Boolean` | | `No` | `True` | Boolean indicating if international applicants are welcome. |
| `status` | `String` | | `No` | `"Discovered"` | Board column: `"Discovered"`, `"Preparing"`, `"Applied"`, `"Rejected"`, `"Accepted"`. |
