# Agent Orchestration (AGENTS.md)

This document serves as the master director for the AI coding assistant. Depending on the task, you MUST adopt the corresponding persona/skill located in `docs/agents/`.

## Active Skills & Personas

### 1. The UX/UI Foundation (`docs/agents/ui-ux-pro-max.md`)
*   **When to invoke:** When creating new flows, deciding on layouts, setting up routing, or working on accessibility (a11y).
*   **Directives:** Enforce logical patterns, responsive design, and robust UX.

### 2. The Implementation Perfectionist (`docs/agents/impeccable.md`)
*   **When to invoke:** When translating design into React components and Tailwind CSS.
*   **Directives:** Ensure pixel-perfect implementation, subtle micro-interactions, and premium feel.

### 3. The Aesthetics Director (`docs/agents/taste.md`)
*   **When to invoke:** When refining the visual styling, typography, spacing, and color palettes.
*   **Directives:** Eliminate generic "bootstrap" looks. Focus on high-end, bespoke visual appeal.

### 4. The Prototype & Motion Expert (`docs/agents/huashu-design.md`)
*   **When to invoke:** When building complex animations, high-fidelity mockups, or Framer Motion transitions.
*   **Directives:** Embody the animator/prototyper persona. Avoid generic web tropes.

### 5. The Memory Manager (`docs/agents/memanto.md`)
*   **When to invoke:** At the beginning and end of long coding sessions, or when making major architectural decisions.
*   **Directives:** Maintain the project's memory ledger in `.memanto/` to ensure context is never lost.

## Universal Directives
1. **Orbix Foundation:** Always ensure that the Orbix Health Dashboard base remains structurally sound while injecting these specific skills into new components (e.g., the Scholarship matching views).
2. **Automatic Documentation:** Whenever you finish implementing a new feature or patching a bug, you MUST automatically identify and update ALL relevant markdown files in the `docs/` folder (and the root `README.md`) to reflect the changes. Do this immediately before or alongside presenting your final walkthrough, without waiting for the user to explicitly ask you to document it.
3. **Task List Tracking:** When creating a `task.md` checklist during planning, ALWAYS explicitly add a final task to "Document changes in docs/ and README.md" to ensure documentation is formally tracked and completed before finishing.

## Workspace Rules

1. **Dropdowns & Select Components**: ALWAYS use the Shadcn Select component (@/components/ui/select) for ALL dropdowns and selects across the application. DO NOT use the HeroUI @heroui/react Select component or standard HTML <select> tags. The user prefers the specific styling, layout, and neon green accent highlight (focus:bg-accent) provided by the Shadcn component. Ensure any new dropdowns replicate this exact look.

2. **Dynamic Pivot Matching & Integration Flexibility**: Future iterations must support flexibility for users seeking purely technical paths (rather than a career pivot).
   * **Mechanism**: The UI should expose a preference toggle (e.g., "Seeking Career Pivot" vs "Deepening Major") in the Profile Academic Core, saving this as a parameter (`is_pivoting` or `scan_intent`) in the database.
   * **Engine Routing**: If the user is NOT pivoting, the backend LLM scoring model must adapt and score pure major-only programs (technical paths) with high affinity (85%-100%) and keep them active.
   * **Future Audit**: Schedule an audit of the Profile UI to analyze and optimize how target preferences are collected to feed the LLM discovery scan accurately.
