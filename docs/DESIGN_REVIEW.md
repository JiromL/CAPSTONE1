# Design Review — Counseling Management System

**Reviewed:** July 2026 · **Scope:** All user-facing pages (student, IC, counselor, psychologist, case manager, office assistant, admin, DPO)
**Lens:** Layout, navigation, visual hierarchy, components, consistency, mental-health UX, accessibility, workflows.
**Principle applied:** *If a component does not clearly help the user complete their task, it should be simplified or removed.*

Each finding lists what is wrong, why it matters, the recommended fix, and a priority.
Findings marked ✅ **Fixed** were implemented in this change set; the rest are recommendations for follow-up.

---

## 1. Critical

### 1.1 Half-finished green→blue theme migration ✅ Fixed
- **What:** A bulk rename replaced `text-green-*` with `text-blue-*` (and some dark-mode `bg-green-*` with `bg-blue-*`) but left the paired green backgrounds, rings, and borders. Result: every success-state badge in the app — *Confirmed*, *Approved*, *Completed*, *Active*, health-check *OK*, success toasts — rendered **blue text on a green tint** (123 occurrences across 62 files). Several primary buttons hovered from blue to **dark green** (`bg-[#2563eb] hover:bg-[#16451f]`), and loading spinners were still green.
- **Why it matters:** Mismatched hue pairs read as visual bugs and erode trust — in a counseling product, trust is the product. Blue-on-green also has poor contrast in several combinations.
- **Fix applied:** Restored the semantic color system: **blue = brand/primary action, green = success, amber = pending, red = danger.** Success badges are green-on-green again (`text-green-700` on `bg-green-50`), dark-mode variants harmonized, all spinners use brand blue, and every blue button hovers to `blue-700`. 80+ files repaired.

### 1.2 Login and auth pages still on the old green brand ✅ Fixed
- **What:** The login, forgot-password, and reset-password pages used the old green identity end-to-end (green hero panel, green focus rings, green links) — and the sign-in button literally changed from green to blue on hover (`bg-green-600 hover:bg-blue-700`).
- **Why it matters:** The login page is the front door. Arriving at a green app that turns blue after sign-in reads as two different products; a button that changes hue on hover reads as broken.
- **Fix applied:** Auth pages converted to the blue brand (panel, buttons, focus rings, links). Semantic greens kept where correct — the "email sent" success checkmark stays green.

### 1.3 Loaded font never used ✅ Fixed
- **What:** `layout.tsx` loads Geist via `next/font`, but `globals.css` overrode `body` and all headings with `'Heiders Sans R', 'Inter', …` — neither font is loaded anywhere, so the entire app silently fell back to per-OS system fonts while still downloading Geist.
- **Why it matters:** Typography was inconsistent across operating systems, and the font payload was wasted.
- **Fix applied:** `body` now uses `var(--font-geist-sans)` with a system fallback stack; the redundant heading font override was removed.

---

## 2. High

### 2.1 Hardcoded hex colors instead of design tokens (partially fixed)
- **What:** ~350 occurrences of `#2563eb` as arbitrary values (`bg-[#2563eb]`, inline `style={{ backgroundColor: '#2563eb' }}`) instead of `bg-blue-600`. Inline styles also blocked hover/focus states (e.g. the student "Book an Appointment" button had no hover feedback).
- **Why it matters:** A future rebrand repeats exactly the migration accident fixed in 1.1. Inline styles can't express interaction states, so primary CTAs felt inert.
- **Fix applied:** Shared components (DashboardLayout, StudentDashboard) converted to Tailwind classes with hover states restored; stray brand hexes (`#16451f`, `#163d20` hovers, indigo `theme-color`) eliminated.
- **Recommended follow-up:** Sweep the remaining `bg-[#2563eb]` arbitrary values to `bg-blue-600` (mechanical, low-risk), or define a `--color-primary` token in `globals.css`.

### 2.2 Sidebar/dashboard has no dark mode, but a theme toggle exists
- **What:** `PageShell` and the auth pages support dark mode; `DashboardLayout` (used by every dashboard page) hardcodes light surfaces (`bg-white`, `bg-gray-100`) while page *content* inside it often carries `dark:` classes.
- **Why it matters:** Toggling dark mode produces a light shell around dark content — worse than no dark mode. Users with light sensitivity (relevant in a mental-health context) get an inconsistent experience.
- **Recommendation:** Either add `dark:` variants to `DashboardLayout` (sidebar, header, content background) or hide the theme toggle on dashboard routes until dark mode is complete. Shipping a visibly broken toggle is worse than shipping no toggle.

### 2.3 User's name displayed in ALL CAPS ✅ Fixed
- **What:** The header rendered "DELA CRUZ, JUAN" in bold caps on every page.
- **Why it matters:** All-caps reads as institutional/shouting — the opposite of the calm, welcoming tone a counseling service needs. Screen readers may also spell out caps strings letter-by-letter.
- **Fix applied:** Header now shows "Juan dela Cruz" in normal case.

### 2.4 Icon-only controls without accessible names ✅ Fixed (shared layout)
- **What:** The header bell, calendar shortcut, hamburger, and sidebar close button had no `aria-label`; the notification count was a bare number with no context.
- **Why it matters:** Screen-reader users hear "link" with no name; keyboard users had no visible focus indication on these controls.
- **Fix applied:** All four controls now have `aria-label`s (the bell announces "Reminders (N unread)"), `focus-visible` outlines, and the decorative avatar is `aria-hidden`.
- **Recommended follow-up:** Audit page-level icon-only buttons (table row actions, modal close buttons) for the same pattern.

### 2.5 Two competing shell components
- **What:** `PageShell` (top-nav, dark-mode aware, "CPS System" wordmark) and `DashboardLayout` (sidebar, light-only, DLSU seal) both serve as page chrome. Pages under `/ic/*` and `/staff/*` use different shells than the main dashboard.
- **Why it matters:** Users moving between (e.g.) `/new-intakes` and `/ic/intake/pending` see the navigation model change — position, contents, and branding — which breaks spatial memory.
- **Recommendation:** Standardize on `DashboardLayout` for all authenticated pages and reserve `PageShell` for public/unauthenticated pages (or delete it). This is a routing/refactor task; not attempted here to avoid regressions.

---

## 3. Medium

### 3.1 "In Crisis" status copy was system-centric ✅ Fixed
- **What:** A student whose PERMA label is *In Crisis* was told "You've been flagged for immediate support."
- **Why it matters:** "Flagged" describes what the system did, not what the student needs, and can feel surveilling/stigmatizing at the most vulnerable moment. Supportive language measurably increases help-seeking.
- **Fix applied:** Now reads "It looks like you may need support right now — you don't have to face this alone…" with the crisis hotlines kept immediately below.

### 3.2 Emoji used as icons (📌 📅 🔒 ✓)
- **What:** Pins, calendars, and checks appear as raw emoji in announcements, booking gates, and selection markers, alongside the Lucide icon set.
- **Why it matters:** Emoji render differently per OS, can't be styled or recolored, and mix visual languages with the SVG icons used everywhere else.
- **Recommendation:** Replace decorative emoji with the already-imported Lucide equivalents (`Pin`, `Calendar`, `Lock`, `Check`) — or drop them entirely where the text carries the meaning (e.g. "📅 Mon, Jul 6" → "Mon, Jul 6").

### 3.3 Border-radius scale drifts
- **What:** `rounded`, `rounded-lg`, `rounded-xl`, and `rounded-2xl` are used interchangeably for the same component class (cards are mostly `rounded-xl`, some modals `rounded-2xl`, some panels `rounded-lg`).
- **Why it matters:** Radius is one of the strongest "one product" signals; drift reads as sloppiness even when users can't name it.
- **Recommendation:** Adopt a two-step scale — `rounded-lg` for controls (buttons, inputs, badges), `rounded-xl` for containers (cards, modals) — and normalize during routine edits rather than a big-bang sweep.

### 3.4 `localStorage.clear()` on logout
- **What:** Logout removes four named cache keys and then calls `localStorage.clear()` anyway — which also wipes the user's theme preference and the last-login display.
- **Why it matters:** A user who chose dark mode gets flashed back to light on every re-login; the named removals are dead code.
- **Recommendation:** Remove only auth/cache keys and preserve `theme`; drop the redundant individual `removeItem` calls.

### 3.5 "Last login" is fabricated client-side
- **What:** The sidebar's "Last login" timestamp is whatever the browser stored on the previous page load — not an authentication event from the server.
- **Why it matters:** It looks like a security affordance but isn't one; on a shared machine it's simply wrong.
- **Recommendation:** Either surface the real last-login timestamp from the backend (it exists in the audit log) or remove the line — a false security signal is worse than none.

---

## 4. Low

### 4.1 Sidebar chevrons imply submenus that don't exist
`HAS_CHEVRON` adds a right chevron to Profile/Services/Cases/Admin items, but clicking navigates like any other item — nothing expands. Remove the chevrons (an affordance that promises interaction it doesn't deliver) or implement the grouping.

### 4.2 Dead nav-item code path
`DashboardLayout` supports an `onMenuClick` handler and `id`-only menu items, but every consumer passes `href` items. Remove the button branch when convenient.

### 4.3 PWA `theme-color` was indigo ✅ Fixed
`#4f46e5` (a third brand color) — now `#2563eb` to match the app chrome on mobile.

### 4.4 Landing spinner duplication
Four near-identical full-screen spinner blocks exist (`app/page.tsx`, `(dashboard)/layout.tsx`, `DashboardPageWrapper`, feedback page). Extract one `<FullPageSpinner />` with `role="status"` and an sr-only "Loading" label.

---

## 5. What was deliberately *not* changed

- **Navigation structure** (`navigation.ts`) — already well-designed: short, role-scoped menus (6–8 items) ordered by task frequency, no filler entries. No changes needed.
- **Booking workflow** — has proper eligibility gates, a confirmation step before submission, ticket feedback after booking, and inline validation. Structure is sound.
- **Dashboards** — the student dashboard is appropriately minimal (next appointment, announcements, calendar — no vanity stats). Staff dashboards surface queues, which is what those roles need. No widgets were added or removed.
- **Copy tone elsewhere** — intake placeholders ("What brings you to CPS?…") and empty states ("No announcements at this time.") already use plain, supportive language.

---

## 6. Design system reference (as now enforced)

| Token | Use |
|---|---|
| `blue-600` (hover `blue-700`) | Brand, primary actions, active nav, links |
| `green-50/700` | Success, confirmed, completed, healthy |
| `amber-50/700` | Pending, awaiting action |
| `orange-50/700` | Reschedules, notices |
| `red-50/700` | Errors, destructive actions, cancellations |
| `gray-100` page bg, white cards, `gray-200` borders | Surfaces |
| Geist (via `next/font`) | All text |
