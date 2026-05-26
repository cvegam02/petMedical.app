<!-- SEED: Re-run /impeccable document once the core UI is built to extract actual tokens from rendered components. -->
---
name: VeterinaIAs
description: Veterinary practice management — clinical precision for the professionals who care for living beings
colors:
  forest: "oklch(0.44 0.115 152)"
  forest-deep: "oklch(0.37 0.105 152)"
  forest-tint: "oklch(0.97 0.012 152)"
  bg: "oklch(0.985 0.003 85)"
  surface: "oklch(1 0 0)"
  ink: "oklch(0.135 0.006 85)"
  ink-muted: "oklch(0.540 0.010 85)"
  ink-subtle: "oklch(0.700 0.007 85)"
  border: "oklch(0.900 0.005 85)"
  border-strong: "oklch(0.780 0.008 85)"
  danger: "oklch(0.577 0.245 27.325)"
  danger-foreground: "oklch(0.985 0.003 85)"
typography:
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  mono:
    fontFamily: "ui-monospace, 'Geist Mono', monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.forest-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
---

# Design System: VeterinaIAs

## 1. Overview

**Creative North Star: "The Precision Record"**

VeterinaIAs is software built around clinical documentation — medical records, patient histories, diagnostic notes. The visual system draws from that origin: everything is organized, unambiguous, and immediately legible under the scanning eye of a professional between consultations. The aesthetic is closer to a well-designed medical chart than to a startup's landing page. Clean surfaces, controlled density, a palette that earns trust rather than demands attention.

The brand accent is a deep forest green — not the hospital teal or consumer-health green that reflexively reads as "medical app," but a darker, more specific hue that reads as precision and care. It appears on interactive elements only: primary buttons, active navigation states, focus rings, confirmation states. Everywhere else, the interface is warm near-white and controlled typography. The one-color doctrine is strict: green appears where it means "you can act here," and nowhere else.

This system rejects the three categories that would betray the product's purpose: the SaaS cliché (purple-blue gradients, hero-metric cards, glass blur panels), the consumer pet aesthetic (pawprint icons, pastel washes, playful rounded everything), and the generic healthcare look (teal sidebars, heavy grid tables, 2005-era UI density). The people using this software are experts. The UI acknowledges that by staying out of their way.

**Key Characteristics:**
- Light theme, warm neutrals tinted slightly toward the forest hue
- One accent color, used with strict restraint (≤10% of any given surface)
- Typography-led hierarchy — Inter at tight letter-spacing, strong weight contrast
- Flat surfaces with a single-step elevation model for cards
- Data-forward density: enough breathing room to scan quickly, not enough to waste space

## 2. Colors: The Precision Palette

A warm achromatic base with one forest green accent. The neutrals are not gray — they are slightly warm (hue ~85°) so the interface reads organic rather than clinical-cold.

### Primary
- **Forest** (`oklch(0.44 0.115 152)`): The only interactive accent in the system. Used exclusively for primary buttons, active sidebar items, focus rings, and confirmation badges. Its presence signals "you can take action here."
- **Forest Deep** (`oklch(0.37 0.105 152)`): Hover and pressed state for Forest. Darker, not lighter — keeps the directional cue clear.
- **Forest Tint** (`oklch(0.97 0.012 152)`): The lightest surface tint from the forest hue. Used for hover backgrounds on ghost buttons and low-emphasis active states (e.g. the current nav item's background). Almost invisible but directionally correct.

### Neutral
- **Background** (`oklch(0.985 0.003 85)`): The page background. Not pure white — very slightly warm. This is the canvas that everything sits on.
- **Surface** (`oklch(1 0 0)`): Card and panel backgrounds. Slightly brighter than the page background to create the one-step elevation.
- **Ink** (`oklch(0.135 0.006 85)`): Primary text. Not pure black — very slightly warm.
- **Ink Muted** (`oklch(0.540 0.010 85)`): Secondary text, metadata, supporting labels, placeholder text.
- **Ink Subtle** (`oklch(0.700 0.007 85)`): Tertiary text, dividers-as-text, descriptive subtitles.
- **Border** (`oklch(0.900 0.005 85)`): Default borders — cards, dividers, separators.
- **Border Strong** (`oklch(0.780 0.008 85)`): Input strokes, more visible dividers when emphasis is needed.

### Semantic
- **Danger** (`oklch(0.577 0.245 27.325)`): Destructive actions, error states, critical alerts only. Never used decoratively.

### Named Rules

**The One Voice Rule.** Forest appears on ≤10% of any given screen. Its rarity is the signal. If every interactive element is forest-green, the accent loses its meaning and becomes background noise. Reserve it for primary CTAs, active states, and confirmation — never for decoration.

**The Warmth Rule.** Pure `#000000` and `#ffffff` are forbidden. Every neutral has a chroma of at least 0.003 and a hue near 85°. The result is almost imperceptible but avoids the clinical-cold feeling of pure gray.

## 3. Typography

**Primary Font:** Inter (with `system-ui, sans-serif` fallback)
**Mono Font:** `ui-monospace, 'Geist Mono', monospace` — for microchip IDs, record IDs, and code values

**Character:** Inter is the working professional's typeface — clear at small sizes, economical at larger ones. Used at tight negative letter-spacing for headings and with strong weight contrast (400/600) to create hierarchy without size inflation.

### Hierarchy

- **Headline** (600, 1.5rem, lh 1.25, ls −0.02em): Page titles, modal headers, section names. Used once per page.
- **Title** (600, 1.125rem, lh 1.3, ls −0.015em): Card headers, subsection titles, table column groups. The workhorse of information hierarchy.
- **Body** (400, 0.9375rem, lh 1.6): All prose content, record notes, diagnostic text, descriptions. Line length capped at 70ch.
- **Label** (500, 0.75rem, lh 1.4, ls +0.01em): Form labels, metadata tags, status chips, table column headers. All caps is forbidden — sentence case only.
- **Mono** (400, 0.875rem, lh 1.5): IDs, microchip numbers, timestamps, numeric record identifiers.

### Named Rules

**The Weight-First Rule.** Hierarchy is expressed through weight contrast (400 vs 600), not through dramatic size jumps. Before increasing font size, increase weight. Only reach for the Headline size when the page genuinely has one dominant primary heading.

**The No-All-Caps Rule.** Labels and tags are sentence case. All-caps reads as shouting in dense clinical interfaces.

## 4. Elevation

This system is flat by default with one elevation step for interactive surfaces. Depth is expressed through background contrast (Background → Surface) and border presence, not through shadows.

The clinical note: a veterinary dashboard is used under fluorescent lights and on screens of varying quality. Heavy drop shadows look dirty in bright environments and add visual noise to dense data tables. Flat surfaces read more accurately across environments.

### Shadow Vocabulary

- **Surface lift** (`0 1px 3px oklch(0 0 0 / 8%), 0 1px 2px oklch(0 0 0 / 6%)`): Applied to cards and panels to separate them from the background. Subtle, ambient — not the structural shadow of a tooltip or dialog.
- **Focus ring** (`0 0 0 3px oklch(0.44 0.115 152 / 30%)`): The only colored shadow. Applied to any focused interactive element using the Forest accent at 30% opacity.
- **Overlay** (`0 8px 32px oklch(0 0 0 / 16%), 0 2px 8px oklch(0 0 0 / 10%)`): Dialogs and dropdown menus. Stronger presence to read over the page without being dramatic.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. The Surface lift shadow appears only on cards and panels — elements that represent a distinct content layer. Table rows, list items, and inline elements have no shadow at any state.

**The Forest Focus Rule.** Focus rings use the Forest accent color at 30% opacity. This is the only non-neutral shadow in the system. It provides clear, accessible focus indication without introducing a second color role.

## 5. Components

### Buttons

Buttons are the primary locus of the Forest accent. They have tight corners, no excess padding, and a fast transition.

- **Shape:** Gently rounded (0.5rem / 8px). Not pill-shaped — the clinical context calls for precision, not friendliness.
- **Primary:** Forest background (`oklch(0.44 0.115 152)`), Background-colored text (`oklch(0.985 0.003 85)`), padding `0.5rem 1rem`. The only button with a filled Forest background.
- **Hover / Focus:** Background deepens to Forest Deep (`oklch(0.37 0.105 152)`). Transition: `background-color 120ms ease-out`. Focus ring at 3px Forest / 30% opacity.
- **Outline:** Transparent background, Border stroke (`oklch(0.900 0.005 85)`), Ink text. Hover: Border Strong stroke, slight background tint from Forest Tint.
- **Ghost:** No border, no background, Ink Muted text. Hover: Forest Tint background. Used for destructive secondary actions (e.g. "Cancelar" alongside a primary CTA).
- **Destructive:** Danger background, Background-text. Used only when the action is irreversible. Never used for cancel or back actions.

### Cards / Containers

The primary organizational unit of the dashboard. Cards must never be nested.

- **Corner Style:** Rounded at 0.75rem (12px) — slightly softer than buttons.
- **Background:** Surface (`oklch(1 0 0)`) against the Background page canvas.
- **Shadow:** Surface lift only — `0 1px 3px oklch(0 0 0 / 8%)`.
- **Border:** `1px solid oklch(0.900 0.005 85)`. Cards have both a border AND a subtle shadow — the border provides definition in low-contrast environments, the shadow adds depth.
- **Internal Padding:** `1.5rem` (24px) default. Sections within a card separated by a `1px` horizontal border at `oklch(0.900 0.005 85)`.

### Inputs / Fields

- **Style:** Surface background, Border Strong stroke (`oklch(0.780 0.008 85)`), Ink text, 0.5rem radius. The stronger border at rest distinguishes inputs from surrounding card surfaces.
- **Focus:** Border color shifts to Forest (`oklch(0.44 0.115 152)`). Forest Focus ring at 30% opacity. No background change.
- **Error:** Border shifts to Danger. Error message in Danger color below the field, 0.75rem / Label weight.
- **Disabled:** Border returns to Border (weaker). Text color shifts to Ink Subtle. Cursor `not-allowed`.
- **Placeholder:** Ink Subtle color.

### Navigation (Sidebar)

The sidebar is the spatial anchor of the application. It should feel calm and recede when not in use.

- **Background:** `oklch(0.985 0.003 85)` — same as the page background. The sidebar does not have a distinct background panel — it floats within the layout. A right border `1px solid oklch(0.900 0.005 85)` defines its edge.
- **Default item:** Ink Muted text, no background. 0.75rem padding on all sides.
- **Hover:** Forest Tint background, Ink text.
- **Active / Current route:** Forest Tint background, Forest text (not Forest background — the sidebar accent is tonal, not filled).
- **Active indicator:** No side-stripe border. The background tint alone indicates active state.
- **Nav labels:** Body weight (400), 0.9375rem. No uppercase, no icon-only mode.

### Status Chips / Badges

Used for appointment states, record status, subscription status.

- **Style:** Rounded-full (full pill). 0.75rem font, Label weight. Padding `0.125rem 0.625rem`.
- **Color strategy:** Each status has a background tint + matching text. No filled-dark backgrounds except for the primary "active" state. Example — Scheduled: Forest Tint bg + Forest text. Cancelled: Danger / 15% opacity bg + Danger text. Confirmed: a warm amber tint (not Forest) to visually separate from Scheduled.

### Clinical Record Cards

The signature component. Represents a single consultation entry in a pet's history.

- **Structure:** Card container with header row (reason + date/vet), collapsible body (diagnosis, vitals, prescriptions, attachments). No icon spray — information hierarchy through typography only.
- **Header:** Title-weight reason text, Ink Muted date and vet name at Label size. No side-stripe accent border.
- **Addendum indicator:** When a record has addendums, a Label-weight count badge in Forest Tint appears at the end of the header row. Clicking expands the addendum thread below the main record.

## 6. Do's and Don'ts

### Do:
- **Do** use Forest only for primary buttons, active navigation states, and focus rings. If more than 10% of the visible screen shows Forest, some usage is wrong.
- **Do** use weight contrast (400 vs 600) as the primary hierarchy tool before increasing font size.
- **Do** keep card surfaces at Surface (`oklch(1 0 0)`) against the slightly warm Background. The one-step contrast is the elevation model.
- **Do** use the Forest Focus ring (`oklch(0.44 0.115 152 / 30%)`) on every focused interactive element — it is both the accessibility indicator and the brand signal.
- **Do** use Ink Muted for metadata, timestamps, and supporting labels. Ink is for content the user is reading; Ink Muted is for context they may glance at.
- **Do** cap body text lines at 70ch. Clinical notes are read under time pressure.

### Don't:
- **Don't** use gradient backgrounds, gradient text, or glassmorphism panels. These are SaaS cliché and belong to the anti-reference category explicitly.
- **Don't** use side-stripe borders (a colored `border-left` or `border-right` greater than 1px as an accent). This applies to cards, list items, record entries, and alert callouts. Use background tints, full borders, or leading icons instead.
- **Don't** use pawprint icons, illustrated animal graphics, or pastel color washes. The interface is for professionals, not the pet owners.
- **Don't** use navy and gold, heavy corporate templates, or any layout that reads as "enterprise software from 2012."
- **Don't** use big-number hero metrics in cards (large number + small label + gradient accent). This is the "hero-metric template" anti-pattern and reads as SaaS marketing, not clinical software.
- **Don't** use identical card grids (same-sized cards with icon + heading + body text, repeated). If cards have the same structure, they should earn it through the content, not the template.
- **Don't** apply the hospital teal or generic healthcare green (#2A9D8F, #00897B, anything that reads as "medical app icon"). The Forest accent is a specific, darker hue (152° hue, low-mid lightness). If it looks like a hospital sign, the chroma is too low and the hue is too blue.
- **Don't** use all-caps labels or uppercase transforms on text. Sentence case throughout.
- **Don't** use pure `oklch(1 0 0 0)` white as the page background or pure `oklch(0 0 0)` black for text. Tint every neutral toward hue 85° with chroma ≥ 0.003.
- **Don't** animate layout properties (width, height, padding, margin). Animate opacity and transform only.
