# Unified Lists Design System

**Date:** 2026-06-07
**Status:** Approved — ready for implementation
**Scope:** All 6 list/table components. Excludes `ActiveBoardingStays` and `VaccineCatalogTab` (different types).

---

## Goal

Unify visual style across all list components so that padding, typography, avatar size, hover states, skeleton loaders, empty states, section headers, and footers are identical by token. Structural differences between families are preserved; the tokens that define how they look are shared.

---

## Affected Components

| Component | File | Family |
|-----------|------|--------|
| GroomingSessionsTable | `components/servicios/GroomingSessionsTable.tsx` | Operacional |
| SurgeryTable | `components/servicios/SurgeryTable.tsx` | Operacional |
| HospitalizationTable | `components/servicios/HospitalizationTable.tsx` | Operacional |
| BoardingHistoryTable | `components/servicios/BoardingHistoryTable.tsx` | Operacional |
| Owners page list | `app/dashboard/owners/page.tsx` | Directorio |
| Pets page list | `app/dashboard/pets/page.tsx` | Directorio |

Consultas (`app/dashboard/consultas/page.tsx`) follows the Agenda template when implemented.

---

## Shared Design Tokens

These values apply to every component regardless of family.

### Avatar
- Size: `w-9 h-9` (36px) — uniform across all lists (previously 44/48/56px)
- Shape: `rounded-[10px]`
- Background: `bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef]`
- Border: `border border-[#d0d8e0]`
- On row hover: border changes to `border-primary/30`, name text changes to `text-primary`

### Padding
- Header padding: `px-6` everywhere (previously `px-6` in some, `px-10` in Dueños/Mascotas)
- Row padding: `px-6 py-3`

### Column Headers
- `text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60`
- Background: `bg-[#f3f5f7]` with `border-b border-[#e7ebef]`

### Row Hover State
- Left green accent: `3px wide`, `28px tall`, `bg-primary`, revealed on hover with `opacity-0 group-hover:opacity-100 transition-opacity`
- Row background: `bg-primary/[0.01]` on hover
- Avatar border: `border-primary/30`
- Pet/patient name: `text-primary`
- Chevron: gains `border border-[#e7ebef] shadow-sm`

### Chevron Button
- Size: `w-9 h-9 rounded-[9px]`
- Default: `bg-[#fafbfc] border border-transparent`
- On hover: `border-[#e7ebef] shadow-sm`
- Icon: `text-muted-foreground/40 text-[15px]` → `text-primary` on row hover

### Skeleton Loader
- Same skeleton component in all lists — 5 rows of avatar + 2 text lines at `rounded-[6px]`
- No more "Cargando..." plain text fallback

### Empty State
- Floating icon: `text-4xl opacity-20 rotate-6`
- Heading: `text-sm font-semibold text-muted-foreground`
- Subtext: contextual message, `text-xs text-muted-foreground/60`

### Footer
- All 6 lists get a footer (currently only 4 have it)
- Layout: count on left `font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground` · status indicator on right
- Status: green dot `bg-primary` + `"Actualizado"` label in `text-[9px] font-bold text-primary uppercase tracking-[0.05em]`

### Section Headers (pill/band pattern)
Three variants — use based on semantic meaning:

| Variant | Usage | Background | Border | Dot |
|---------|-------|------------|--------|-----|
| `amber` | En curso / active cases | `bg-[#fffbeb]` | `border-[#fde68a]` | `bg-amber-400` |
| `blue` | Hoy (Agenda only) | `bg-[#F3F8FC]` | `border-[rgba(15,76,129,0.1)]` | `bg-[#337DB9]` |
| `muted` | Historial / Próximas | `bg-[#fafbfc]` | `border-[#e7ebef]` | none |

All section headers: `flex items-center gap-2 px-4 py-[9px]` · title `text-[9px] font-bold uppercase tracking-[0.15em]` · count badge `font-mono text-[10px] font-bold px-[7px] py-[1px] rounded-[4px]`

### Animation
- Row stagger: 30ms delay per row (`style={{ animationDelay: `${index * 30}ms` }}`)
- Entry: `opacity-0 translate-y-1` → `opacity-100 translate-y-0`, `ease-out 200ms`
- No side-stripe borders. No scale transforms on active.

---

## Family Templates

### Operacional — Estética, Cirugía, Hospitalización, Boarding History

**Structure:**
1. Amber section header "En curso" + 2-column card grid (active cases only)
2. Muted section header "Historial" + compact rows

**Active cards (2-column grid):**
- `bg-white border border-[#fde68a] rounded-[8px] p-[11px]`
- Avatar 36px + name + species/owner line + reason + day-count badge
- Day-count: `text-[10px] font-bold px-2 py-[2px] bg-[#fef3c7] text-[#92400e] rounded-[20px] border border-[#fde68a]`
- Max 2 active cards visible; if > 2, show "+ N más" link

**History rows (compact):**
Columns (left→right): Mascota (avatar + name + species) · Motivo · Responsable (mini avatar + name) · Fecha · Chevron

**HospitalizationTable migration note:** The `<table>` HTML element must be replaced with the same flex-row pattern used by the other Operacional lists. No `<thead>`/`<tr>`/`<td>` elements.

### Agenda — Consultas

**Structure:**
1. Blue section header "Hoy — [date]" + rows for today's appointments
2. Muted section header "Próximas" + rows for future appointments (opacity 0.85)

**Row columns:** Mascota · Motivo · Responsable · Hora (monospace font-semibold) · Estado badge · Chevron

**Upcoming rows:** Same layout, slightly muted (`opacity-85`), date shown as relative ("mañana", "lun 9 jun") instead of time.

### Directorio — Dueños, Mascotas

**Structure:**
- Single flat list, no section headers, no states
- No En curso / Historial split

**Mascotas row columns:** Mascota (avatar with sex badge overlay) · Especie + Raza · Dueño · Chevron

**Sex badge on avatar:**
- `absolute bottom-[-2px] right-[-2px] w-[14px] h-[14px] rounded-full border-[1.5px] border-white text-[8px] font-bold`
- Male: `bg-[#3B82F6] text-white` → "♂"
- Female: `bg-[#EC4899] text-white` → "♀"

**Dueños row columns:** Dueño (circular avatar + name) · Contacto (monospace phone) · Mascotas (green pill chips, max 3 then "+ N más") · Chevron

**Owner avatar:** `rounded-full` (not `rounded-[10px]`) to distinguish humans from animals.

---

## What Changes Per Component

| Component | Changes |
|-----------|---------|
| GroomingSessionsTable | Avatar 48px → 36px; add left-accent hover; unify section headers to amber/muted tokens; pagination stays |
| SurgeryTable | Avatar 48px → 36px; remove existing left-stripe; add new accent pattern; add Responsable column |
| HospitalizationTable | Replace `<table>` with flex-rows; add skeleton loader; add footer; add 2-col active grid; align section headers |
| BoardingHistoryTable | Avatar 48px → 36px; unify section header to muted token; add Responsable column |
| Owners page | px-10 → px-6; avatar stays circular; add footer; align OwnerCard to shared row anatomy |
| Pets page | Avatar 56px → 36px (keep sex badge); px-10 → px-6; simplify species/breed to inline text (drop icon chips) |

---

## Out of Scope

- `ActiveBoardingStays` component — intentionally different (operations board style)
- `VaccineCatalogTab` — catalog/admin pattern, not a clinical list
- Any changes to the data fetched, API routes, or business logic
- Pagination logic changes (GroomingSessionsTable keeps its pagination)
- Mobile/responsive breakpoints (not in scope for this pass)
