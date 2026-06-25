# Frontend UI/UX Standards and Patterns

This document outlines the core frontend guidelines, styles, performance practices, and UI patterns used in the Educational Pathfinder application to ensure a premium, non-generic aesthetic.

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

## UI Patterns & Components

* **Component Selection & Styling Constraints**: 
  - **Inputs & Textareas**: Use `@heroui/react` (`Input`, `Textarea`, `Checkbox`, `Accordion`) to achieve consistent, beautiful form controls and collapsible sections with minimal manual styling.
  - **Dropdowns & Selects**: **Strictly** use the Shadcn `Select` component (`@/components/ui/select`) for ALL dropdowns. Do NOT use the HeroUI `Select` or native `<select>`. The project relies on Shadcn's specific styling (particularly the `focus:bg-accent` neon green highlight) for its primary dropdown aesthetic.
* **Sticky Action Panels**: For long forms like the Profile tabs, always use sticky panels at the bottom of the viewport for action buttons (e.g., "Save Profile"). Ensure the panel floats above the content with `z-40`, has `pointer-events-none` on the wrapper, and `pointer-events-auto` on the button itself so it does not block the user from interacting with the content behind it.
* **Responsive Data Rendering**: When presenting AI-generated tags (like Target Disciplines), use CSS Multi-Column layout (`columns-1 md:columns-2`) or responsive grids to maximize screen real-estate instead of long vertical single columns. Use LocalStorage caching (`scholarship_suggested_pivots`) to persist generated options across tab changes.
* **Form Integrity Lock**: During asynchronous processes like AI extraction, all input fields, textareas, and save buttons must be programmatically disabled to prevent conflict. On input-centric tabs, use a translucent glassmorphic loader overlay that visually blocks edits while keeping the inputs underneath readable. Users should be able to freely navigate through tabs to monitor progress in real-time.
* **Dashboard Safelocks**: If a user's profile lacks critical data (e.g., Modality or Geographic Targets), visually obscure the actionable lanes behind a frosted glass layer. Clicking disabled buttons should trigger a modal with a direct CTA to complete the Profile.

## Frontend E2E Testing & Performance Tuning

To ensure maximum UI responsiveness and prevent regressions:

* **Playwright E2E Suite**: We use Playwright to test tab transitions, stepper node redirects, and to capture visual screenshots under `frontend/e2e-screenshots/`.
* **Latency Optimization**: The frontend and tests are configured to query the backend via explicit IPv4 loopback (`127.0.0.1`) instead of `localhost`. This bypasses IPv6 resolution timeouts, reducing page load latency significantly (from ~7.5 seconds to sub-100ms).
* **Onboarding Wizard Bypass**: To prevent the onboarding wizard modal overlay from blocking UI interactions during test runs, the component detects automated runs via `window.navigator.webdriver` (and support for the `?bypass_wizard=true` query parameter), allowing Playwright tests to access and test the underlying tabs seamlessly.

### Running Frontend Tests
```bash
cd frontend
npm run test:e2e
```
