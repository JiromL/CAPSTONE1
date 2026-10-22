---
name: DLSU CPS
description: Counseling and Psychological Services system. Calm for students, fast and clear for staff.
colors:
  primary: "#2352CC"
  primary-hover: "#1A3DB0"
  primary-surface: "#EBF0FF"
  bg: "#F5F7FB"
  surface: "#FFFFFF"
  sidebar: "#0F1729"
  border: "#E4E7F0"
  border-strong: "#CBD0DC"
  text-primary: "#0D1526"
  text-secondary: "#475569"
  text-muted: "#6B7280"
  success: "#059669"
  success-surface: "#ECFDF5"
  success-text: "#065F46"
  warning: "#D97706"
  warning-surface: "#FFFBEB"
  warning-text: "#92400E"
  danger: "#DC2626"
  danger-surface: "#FEF2F2"
  danger-text: "#991B1B"
  info: "#2563EB"
  info-surface: "#EFF6FF"
  info-text: "#1E40AF"
  perma-excelling: "#00704A"
  perma-thriving: "#2FA27A"
  perma-surviving: "#A3A9B3"
  perma-struggling: "#E7892A"
  perma-crisis: "#BF2D2A"
  perma-nodata: "#D5DAE1"
typography:
  display:
    fontFamily: "Figtree, Noto Sans, sans-serif"
    fontSize: "clamp(1.625rem, 2.6vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Figtree, Noto Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Figtree, Noto Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Noto Sans, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  label:
    fontFamily: "Noto Sans, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  caption:
    fontFamily: "Noto Sans, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1.125rem"
  overline:
    fontFamily: "Noto Sans, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: "1rem"
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.bg}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  input-focus:
    backgroundColor: "{colors.surface}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  badge:
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.caption}"
  nav-sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "#FFFFFF"
    width: "240px"
---

# Design System: DLSU CPS

## Overview

**Creative North Star: "The Steady Hand"**

CPS is the calm, reliable presence a counseling office needs to be. A student in distress should feel held, not processed. A counselor at the end of a long day should find what needs attention next without hunting for it. The system does this by staying quiet: cool near-white surfaces, one confident cobalt accent, soft rounded cards, and color that carries meaning rather than decoration.

There are two densities inside one world. Student screens breathe, with larger type, fewer items and gentle language. Staff screens are compact and easy to scan, with queues, tables and status badges. They share the same tokens, so the student and staff sides still look like one system. A dark navy sidebar anchors every page, and light and dark themes come from swapping a single set of variables.

Status color is the one place the system raises its voice. Risk levels, PERMA wellbeing labels and crisis flags use a dedicated, colorblind-checked palette, and never get softened for the sake of looks.

**Key Characteristics:**
- One brand accent (Steady Cobalt) on cool, quiet neutrals
- A dark Midnight Ink sidebar as the fixed anchor
- Rounded, gently shadowed cards (16px radius)
- Meaningful color reserved for status, risk and wellbeing
- Figtree headings over Noto Sans body text
- Light and dark themes through CSS variables, never scattered `dark:` overrides

## Colors

A cool, low-chroma base with a single cobalt voice, plus a strict set of status colors.

### Primary
- **Steady Cobalt** (`primary`): primary buttons, links, the active navigation item, focus rings and the EMA button. It's the only color that says "act here."
- **Deep Cobalt** (`primary-hover`): hover and pressed states of cobalt elements.
- **Cobalt Mist** (`primary-surface`): selected rows, soft chips, text selection and avatar fills.

### Neutral
- **Midnight Ink** (`sidebar`): the sidebar background. The darkest surface, and the frame around everything else.
- **Cool Paper** (`bg`): the page background behind cards, and the resting background of inputs.
- **Clean White** (`surface`): cards, panels, modals and focused inputs.
- **Hairline Grey** (`border`) / **Firm Grey** (`border-strong`): default dividers and card edges, and hover or emphasis borders.
- **Ink** (`text-primary`), **Slate** (`text-secondary`), **Fog** (`text-muted`): the three-step text hierarchy. All three meet WCAG AA in both themes.

### Status
- **Success / Warning / Danger / Info**: each has a solid color, a pale surface and a dark text shade. Pair the surface with the text shade for badges and alerts. Use the solid color for icons, buttons and chart marks.
- **PERMA wellbeing labels** (`perma-*`), from best to worst: Excelling (deep green), Thriving (green), Surviving (neutral grey), Struggling (orange), In Crisis (red). There's also a pale grey for "no data." The order and colors were checked for color blindness and are fixed.

### Named Rules
**The One Voice Rule.** Cobalt is the only brand color. Never add a second decorative accent. If something needs to stand out and it isn't an action, it's a status, so use a status color.

**The Never-Soften Rule.** Danger and In Crisis colors always appear at full strength wherever they apply. Don't mute, fade or hide a crisis signal to keep a screen pretty.

## Typography

**Display Font:** Figtree (with Noto Sans as the fallback)
**Body Font:** Noto Sans (with system UI fonts as the fallback)
**Mono:** ui-monospace, SF Mono

**Character:** Figtree is friendly, round and modern, warm enough for students. Noto Sans is neutral and very readable at small sizes, so dense staff tables stay legible.

### Hierarchy
- **Display** (600, about 26–32px, 1.2): page greetings and the main title on dashboards.
- **Headline** (700, 20px, 28px): page titles.
- **Title** (600, 16px, 24px): card and panel section headings.
- **Body** (400, 15px, 24px): standard text. Supporting text uses 14px.
- **Label** (500, 13px, 20px): form labels and table headers.
- **Caption** (500, 12px, 18px): timestamps, helper text and badges. Never go smaller for information people need to read.
- **Overline** (700, 11px, 0.08em, uppercase): decorative section separators only. Never use it for data.

### Named Rules
**The 12px Floor Rule.** No informational text below 12px. The 11px overline is for decoration only.

## Layout

A fixed left sidebar (240px, or 64px collapsed; a slide-in drawer on mobile), with content on the Cool Paper background in white cards. Spacing follows a 4px base, mostly in 8, 16 and 24px steps. Staff dashboards use multi-column grids of cards and tables. Student pages use a single column or a simple two-column layout, with more space between sections. The "Talk to EMA" button floats at the bottom right of every page, and the EMA chat opens as a panel docked to the right side.

## Elevation & Depth

Mostly flat, with soft, layered shadows. Cards sit just above the page with a faint shadow and a hairline border. Interactive cards lift 2px and gain a deeper shadow on hover. Modals and the EMA panel use the deepest shadow. Shadows are tinted with Ink, never pure black, and are softer in dark mode.

### Shadow Vocabulary
- **Card** (`0 1px 3px 0 rgba(13,21,38,0.06), 0 1px 2px -1px rgba(13,21,38,0.04)`): every resting card.
- **Card raised** (`0 10px 15px -3px rgba(13,21,38,0.08), 0 4px 6px -4px rgba(13,21,38,0.05)`): hovered interactive cards and floating elements.
- **Modal** (`0 20px 25px -5px rgba(13,21,38,0.12), 0 8px 10px -6px rgba(13,21,38,0.08)`): dialogs and docked panels.
- **Focus glow** (`0 0 0 3px rgba(35,82,204,0.15)`): focused inputs.

### Named Rules
**The Lift-on-Intent Rule.** Surfaces are flat at rest. Extra depth appears only for something the user can act on (hover) or something on top of the page (modals and panels).

## Shapes

Soft and friendly, never sharp. Cards use 16px corners. Buttons and inputs use 12px. Small elements like skeletons use 8px. Badges, avatars and the floating EMA button are fully round. Borders are always 1px hairlines.

## Components

### Buttons
Confident but quiet: solid cobalt for the main action, and white outlined buttons for everything else.
- **Shape:** gently rounded (12px), at least 40px tall, 13px semibold text.
- **Primary:** Steady Cobalt fill, white text, a faint shadow. On hover it turns Deep Cobalt.
- **Ghost:** a white button with a hairline border and Ink text. On hover the background turns Cool Paper and the border turns Firm Grey.
- **Outline:** a transparent button with a cobalt border and cobalt text. On hover it fills with Cobalt Mist.
- **Danger:** solid red, used only for destructive actions.
- **Press / disabled:** shrinks to 98% when pressed. Disabled buttons are 55% opacity with a not-allowed cursor.

### Chips / Badges
- **Style:** fully round pills with 12px semibold text. They pair a status surface with its status text shade (for example, the danger surface with the danger text).
- **Use:** risk levels (RED, YELLOW, GREEN), appointment and case statuses, and PERMA labels.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Clean White on Cool Paper.
- **Shadow Strategy:** the Card shadow at rest, and Card raised on hover for interactive cards.
- **Border:** a 1px hairline.
- **Internal Padding:** usually 16–24px.

### Inputs / Fields
- **Style:** Cool Paper fill, hairline border, 12px corners, 14px text.
- **Focus:** the fill turns white, the border turns cobalt, and a soft cobalt glow appears.
- **Labels:** 13px medium, in Ink, above the field.

### Navigation
- **Sidebar:** Midnight Ink background, with items in 60% white that turn full white on hover. The active item gets a single cobalt highlight that slides to the current page. The sidebar collapses to icons only (64px), and becomes a drawer on mobile.

### EMA Floating Button and Chat Panel (signature component)
A fully round cobalt button with a gradient, fixed at the bottom right. It holds a white circle with a chat-bubble-and-heart icon (and a small green "available" dot), the title "Talk to EMA" and the subtitle "Wellbeing chatbot." It opens a panel docked to the right side (440px, or 760px when widened) with the Modal shadow and 16px corners.

## Do's and Don'ts

### Do:
- **Do** use the CSS variables (`var(--color-*)`), never raw hex values, so dark mode keeps working.
- **Do** keep cobalt for actions and the current location. Use status colors for meaning.
- **Do** show risk and PERMA labels with their fixed colors and order, from Excelling to In Crisis.
- **Do** use the `type-*` classes for text sizes, and keep information at 12px or larger.
- **Do** give student screens more space and plainer language than staff screens.

### Don't:
- **Don't** add a second brand accent color.
- **Don't** fade, mute or hide crisis and danger states for the sake of looks.
- **Don't** use near-black filled buttons. The system shows them as outlined ghost buttons.
- **Don't** use sharp corners or heavy, pure-black shadows.
- **Don't** use the uppercase overline style for data or labels people need to read.
