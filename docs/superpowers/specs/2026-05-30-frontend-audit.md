# Auditoría de Frontend — MundoPet

**Fecha:** 2026-05-30
**Método:** 4 auditores en paralelo (tipografía/headers, modales/animaciones, inputs de fecha/forms, espaciado/bordes/tokens), cada hallazgo verificado leyendo el archivo.
**Agente:** `.claude/agents/frontend-auditor.md` (reutilizable para re-auditar)

---

## Resumen ejecutivo

La app es mayormente coherente en su núcleo nuevo (catálogos, vacunas, perfil), pero arrastra **inconsistencias sistemáticas** en cuatro frentes:

1. **Modales** — la mitad usa el componente `Dialog` (con animación) y la otra mitad son overlays `fixed inset-0` hechos a mano (sin animación, `bg-white` hardcodeado, sin focus trap). **Esta es la causa de "algunos modales abren con animación y otros no".**
2. **Inputs de fecha** — coexisten 3 estilos: `DateInput` (nacimiento), `<input type="date">` nativo (vacunas/desparasitación) y un popover inline (citas). **Esta es la causa de "los campos de fecha funcionan diferente".**
3. **Tipografía/headers** — los títulos de página usan 3 tamaños distintos (`text-2xl` / `text-3xl` / `text-xl`) y el "overline" tiene 2 anchos. **Esta es la causa de "títulos en tamaños y ubicaciones diferentes".**
4. **Tokens de color** — zonas heredadas (medical-records, super-admin) usan `slate-*`/`zinc-*`/`bg-white` en vez de los tokens semánticos; los badges de estado de cita tienen 3 definiciones distintas.

Prioridad de impacto visible: **Modales > Fechas > Headers/tipografía > Tokens/badges > Espaciado/radios**.

---

## 1. Tipografía y headers de página

**Estándar canónico:** título de página `<h1 className="text-2xl font-bold tracking-tight text-foreground">` precedido del overline `<div className="flex items-center gap-2"><span className="w-6 h-[1.5px] bg-primary/30 rounded-full" /><p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">LABEL</p></div>`.

| Sev | Archivo | Problema | Esperado |
|-----|---------|----------|----------|
| HIGH | `app/super-admin/page.tsx:13` | `<h1 className="text-2xl font-bold mb-6">` — sin `tracking-tight`, sin `text-foreground`, sin overline | título estándar + overline |
| HIGH | `components/ui/form-page-layout.tsx:40` | barra del overline es `w-5` (todas las páginas de formulario salen con eyebrow más corto) | `w-6` |
| MEDIUM | `app/dashboard/owners/page.tsx:31` | título `text-3xl` | `text-2xl` (conservar `flex items-center gap-3` del badge de conteo) |
| MEDIUM | `app/dashboard/pets/page.tsx:51` | título `text-3xl` | `text-2xl` |
| MEDIUM | `app/dashboard/appointments/[appointmentId]/page.tsx:74` | `text-3xl` + `font-heading` (único con `font-heading` en un h1) | `text-2xl font-bold tracking-tight` |
| MEDIUM | `app/dashboard/owners/[ownerId]/page.tsx:64` | título de detalle `text-xl`, sin overline | `text-2xl` + overline |
| MEDIUM | `app/dashboard/pets/[petId]/page.tsx:89` | `text-xl`, sin overline | `text-2xl` + overline |
| MEDIUM | `app/dashboard/pets/[petId]/records/new/page.tsx:85` | `text-xl font-semibold`, sin overline (hand-rolled en vez de `FormPageLayout`) | `FormPageLayout` o estándar |
| MEDIUM | `app/dashboard/pets/[petId]/records/[recordId]/page.tsx:60-61` | overline no canónico (`text-[11px] tracking-widest`, sin barra) + título `text-xl font-semibold` | overline canónico + `text-2xl` |
| MEDIUM | `app/dashboard/historiales/[petId]/page.tsx:85` | overline sin la barra `<span>` | agregar barra `w-6` |

**Títulos de sección (`<h2>/<h3>`):** conviven `text-base font-semibold` (settings, mayoría) vs `text-lg font-bold font-heading` (owners/[ownerId], pets/[petId]) vs `text-sm font-semibold uppercase tracking-wider` (appointment detail). Converger a `text-base font-semibold text-foreground`.

**Títulos de modal:** `DialogTitle` default = `text-base font-semibold` (mayoría). Desviados: `ShareConsultationModal` (`text-sm`), `OwnerResolutionModal`/`AppointmentQuickModal` (`text-lg`), `NewAppointmentModal` (h2 hand-rolled). Converger a `DialogTitle`.

---

## 2. Modales y animaciones

**Estándar canónico:** `@/components/ui/dialog` (base-ui) — backdrop `bg-black/50` animado (sin blur), animación `zoom-in-95 + slide` de entrada/salida, focus trap, escape, click-outside, `rounded-xl`, `bg-background`, `p-6`, `shadow-lg`, `role/aria` correctos.

| Componente | Tipo | Animación | Backdrop | bg | Problemas |
|-----------|------|-----------|----------|-----|-----------|
| `VaccinationsModal` | Dialog ✓ | sí | `bg-black/50` | `bg-background` | nested dialog (doble backdrop) |
| `DewormingsModal` | Dialog ✓ | sí | `bg-black/50` | `bg-background` | nested dialog |
| `VaccineCatalogTab` / `MedicationCatalogTab` | Dialog ✓ | sí | `bg-black/50` | `bg-background` | OK |
| `ShareConsultationModal` | **custom** ✗ | **no** | `bg-black/40 blur` | `bg-card` | **sin escape, sin role/aria** |
| `AppointmentQuickModal` | **custom** ✗ | **no** | `bg-black/40 blur` | **`bg-white`** | sin focus trap, `rounded-2xl` |
| `DashboardTwoColumn` (modal inline) | **custom** ✗ | **no** | `bg-black/40 blur` | **`bg-white`** | **duplica AppointmentQuickModal** |
| `OwnerResolutionModal` | **custom** ✗ | **no** | `bg-black/40 blur` | **`bg-white`** | sin focus trap |
| `NewAppointmentModal` | **custom** ✗ | **no** | `bg-black/50 blur` | `bg-card` | el más grande; `rounded-2xl shadow-2xl` |

**Migrar a `Dialog` (prioridad):**
1. `ShareConsultationModal` (HIGH — sin escape ni a11y)
2. `AppointmentQuickModal` + `DashboardTwoColumn` inline → extraer **un** `AppointmentDetailDialog` compartido (hoy están duplicados, ambos `bg-white`)
3. `OwnerResolutionModal` (HIGH — `bg-white`, sin focus trap)
4. `NewAppointmentModal` (MEDIUM — preservar `max-h-[90vh] overflow-y-auto` en `DialogContent`)

**Aplica a todos:** quitar `backdrop-blur-sm` (el estándar no lo tiene), `bg-white`→`bg-background`, `rounded-2xl shadow-2xl`→`rounded-xl shadow-lg`, `bg-black/40`→`bg-black/50`.

---

## 3. Inputs de fecha y controles de formulario

**Estándar canónico de fecha:** `@/components/ui/date-input` (`DateInput`) — máscara `DD/MM/AAAA` + popover de calendario, guarda `YYYY-MM-DD`, acepta predicado `disabled`.

**Native `<input type="date">` a reemplazar por `DateInput` (todos HIGH):**
- `components/pets/DewormingsModal.tsx:135,139` (aplicación, próxima)
- `components/pets/VaccinationsModal.tsx:199,204`
- `components/medical-records/DewormingsField.tsx:29,33`
- `components/medical-records/VaccinationsField.tsx:66,70`

**Tercer estilo de fecha (MEDIUM):** `components/appointments/NewAppointmentModal.tsx:371-400` — popover + Calendar inline (cita). Reconciliar hacia `DateInput` (que ya soporta `disabled` para filtrar días/horario).

**Controles que faltan como componente compartido:**
- **Textarea** (MEDIUM) — no existe `@/components/ui/textarea`; el mismo string de ~190 chars está duplicado en `MedicalRecordForm.tsx:18`, `WalkInConsultationPage.tsx:24` y inline en `PetForm.tsx:197`. Crear `Textarea` y reemplazar.
- **Checkbox** (MEDIUM) — no existe `@/components/ui/checkbox`; raw `<input type="checkbox">` en `PetForm.tsx:177,187`. Crear `Checkbox` y reemplazar.

**Botones/links hand-styled:**
- HIGH `app/(auth)/accept-invite/[token]/page.tsx:60` — CTA "Crear cuenta" reimplementa el look de `Button` a mano → usar `buttonVariants({ className: 'w-full' })`.

(Selects y comboboxes están limpios — `Select`, `FreeTextCombobox`, `BreedCombobox` usados consistentemente.)

---

## 4. Espaciado, bordes, radios, tokens de color

**Tokens de color — violaciones (usar tokens semánticos `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-primary`):**
- HIGH `components/medical-records/RecordDetailClient.tsx` — card entera en `slate-*` + `bg-white`
- HIGH `components/medical-records/MedicalRecordCard.tsx` — pervasivo `zinc-*`
- HIGH `components/medical-records/PatientDataSection.tsx` — `zinc-*`, `bg-white`, `rounded-2xl`
- HIGH `components/medical-records/AddendumForm.tsx` — `slate-*`, textarea raw
- HIGH `app/super-admin/page.tsx` — `slate-*`, `bg-white`
- MEDIUM `app/super-admin/layout.tsx` — sidebar `bg-slate-900` ad-hoc
- MEDIUM `components/onboarding/TenantSetupForm.tsx` — `slate-*`, selección `border-blue-500 bg-blue-50` (debería ser `border-primary bg-primary/5`)
- MEDIUM `app/dashboard/pets/page.tsx:200` — fallback `bg-gray-400`
- MEDIUM (extendido) `bg-white` donde va `bg-card`: list pages (owners, pets), OwnerCard, PetCard, modales, `app/dashboard/layout.tsx:68,73`. `AppointmentCard` usa `bg-card` correctamente — ese es el token correcto.

**Radios — converger:** controles/inputs `rounded-lg`, cards/rows `rounded-xl`, superficies grandes `rounded-2xl`. Desviados: `PatientDataSection` inputs `rounded-2xl`; list containers `rounded-[1.5rem]`; empty states `rounded-[2rem]` vs `rounded-xl`; `AddendumForm` textarea `rounded-md`.

**Empty states — converger a `border-2 border-dashed border-border/60 bg-muted/10`:** hoy hay `bg-zinc-50/50` (token violation en `MedicalTimeline`, `appointments/page`), `bg-muted/[0.02]`, `bg-muted/10`, `bg-muted/20`; algunos `border` simple en vez de `border-2`; `team/page.tsx:62` sin caja.

**Loading — converger:** skeleton para páginas, `text-sm text-muted-foreground "Cargando..."` centrado para modales/tabs (hoy mezclado).

**Badges — HIGH:** el estado de cita tiene **3 definiciones** distintas:
1. `lib/constants/appointment-status.ts` (canónico: muted/primary)
2. `components/dashboard/DashboardTwoColumn.tsx:30-34` (amber/emerald — el peor desvío, hasta cambia labels)
3. `app/dashboard/appointments/[appointmentId]/page.tsx:10-15` (re-declara el mapa)
→ Todos deben importar `APPOINTMENT_STATUS_CONFIG`. Además unificar `green` vs `emerald` para "éxito". Los badges de vigencia (vacunas/desparasitación/stock) **sí** están bien estandarizados — usarlos como referencia de forma: `text-xs font-medium px-2 py-0.5 rounded-full border`.

---

## Plan de remediación sugerido (por fases)

**Fase A — Causas de las quejas explícitas (mayor impacto visible):**
1. Migrar los 5 modales custom a `Dialog` (anima todos igual; extraer `AppointmentDetailDialog` compartido).
2. Reemplazar todos los `<input type="date">` por `DateInput`; reconciliar el picker de citas.
3. Unificar títulos de página a `text-2xl font-bold tracking-tight` + overline `w-6` (arreglar `FormPageLayout` y las páginas desviadas).

**Fase B — Sistema de componentes:**
4. Crear `Textarea` y `Checkbox` compartidos; reemplazar duplicados.
5. Importar `APPOINTMENT_STATUS_CONFIG` en los 3 lugares; eliminar mapas duplicados.

**Fase C — Tokens y ritmo:**
6. Migrar `slate-*`/`zinc-*`/`bg-white` a tokens en medical-records y super-admin.
7. Unificar radios, empty states y loading.

**Nota:** Fase A resuelve directamente lo que el usuario notó (animaciones de modal, fechas, títulos). Las fases B y C son higiene de consistencia.
