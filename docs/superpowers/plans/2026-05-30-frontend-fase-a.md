# Frontend Fase A — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar las inconsistencias de mayor impacto visible de la auditoría de frontend: títulos de página unificados, inputs de fecha unificados a `DateInput`, y modales custom migrados al componente `Dialog` (animación consistente).

**Architecture:** Tres frentes independientes. (1) Ediciones de clases en los `<h1>`/overlines. (2) Reemplazar `<input type="date">` por el componente controlado `DateInput` (integrado con react-hook-form vía `watch`/`setValue`, no `register`). (3) Reemplazar los overlays `fixed inset-0` hechos a mano por `@/components/ui/dialog` (que aporta animación, focus trap, escape, backdrop estándar).

**Tech Stack:** Next.js 16 App Router, Tailwind v4, base-ui Dialog, react-hook-form, date-fns.

**Spec:** `docs/superpowers/specs/2026-05-30-frontend-audit.md` (Fase A).

**Nota:** Proyecto sin tests. Cada tarea termina con verificación (tsc / browser) + commit. No Co-Authored-By.

**Referencia — `DateInput` (componente controlado):**
```tsx
// value: string 'YYYY-MM-DD'  ·  onChange: (v: string | undefined) => void  ·  disabled?: (date: Date) => boolean
<DateInput value={watch('campo')} onChange={v => setValue('campo', v ?? '')} />
```

**Referencia — patrón canónico de `Dialog`:**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-sm">{/* override solo el max-width */}
    <DialogHeader><DialogTitle>Título</DialogTitle></DialogHeader>
    {/* cuerpo idéntico al actual */}
  </DialogContent>
</Dialog>
```
`DialogContent` ya aporta: backdrop `bg-black/50` animado (sin blur), animación entrada/salida, `rounded-xl`, `bg-background`, `border`, `p-6`, `shadow-lg`, focus trap, escape y click-outside. **No** reimplementar nada de eso.

---

### Task 1: Unificar el overline del layout de formularios

**Files:**
- Modify: `veterinaias/components/ui/form-page-layout.tsx`

- [ ] **Step 1: Corregir el ancho de la barra del overline**

En `components/ui/form-page-layout.tsx`, busca la barra del eyebrow (actualmente `w-5`) y cámbiala a `w-6` para que coincida con todas las páginas del dashboard:

```tsx
<span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
```
(Era `w-5`. Esto corrige el eyebrow en todas las páginas de formulario: owners/new, owners/edit, pets/new, pets/edit.)

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/ui/form-page-layout.tsx
git commit -m "fix: unify form-page overline bar width to w-6"
```

---

### Task 2: Unificar títulos de página a text-2xl

**Files:**
- Modify: `veterinaias/app/dashboard/owners/page.tsx`
- Modify: `veterinaias/app/dashboard/pets/page.tsx`
- Modify: `veterinaias/app/dashboard/appointments/[appointmentId]/page.tsx`

- [ ] **Step 1: owners/page — text-3xl → text-2xl**

En `app/dashboard/owners/page.tsx`, en el `<h1>` del header de página, cambia `text-3xl` por `text-2xl` (conserva el resto, incluido `flex items-center gap-3` del badge de conteo):

```tsx
<h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
```

- [ ] **Step 2: pets/page — text-3xl → text-2xl**

En `app/dashboard/pets/page.tsx`, mismo cambio en el `<h1>`:

```tsx
<h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
```

- [ ] **Step 3: appointments/[appointmentId] — quitar text-3xl y font-heading**

En `app/dashboard/appointments/[appointmentId]/page.tsx`, el `<h1>` usa `text-3xl ... font-heading`. Cámbialo a:

```tsx
<h1 className="text-2xl font-bold tracking-tight text-foreground">
```

- [ ] **Step 4: Verificar y commit**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0.
```bash
git add veterinaias/app/dashboard/owners/page.tsx veterinaias/app/dashboard/pets/page.tsx "veterinaias/app/dashboard/appointments/[appointmentId]/page.tsx"
git commit -m "fix: unify dashboard page titles to text-2xl"
```

---

### Task 3: Overline + título en páginas de detalle y super-admin

**Files:**
- Modify: `veterinaias/app/dashboard/owners/[ownerId]/page.tsx`
- Modify: `veterinaias/app/dashboard/pets/[petId]/page.tsx`
- Modify: `veterinaias/app/dashboard/historiales/[petId]/page.tsx`
- Modify: `veterinaias/app/super-admin/page.tsx`

- [ ] **Step 1: owners/[ownerId] — título de detalle a text-2xl**

En `app/dashboard/owners/[ownerId]/page.tsx`, el `<h1>` del nombre del dueño (dentro del card de perfil) es `text-xl`. Cámbialo a `text-2xl`:

```tsx
<h1 className="text-2xl font-bold tracking-tight text-foreground">
```

- [ ] **Step 2: pets/[petId] — título de detalle a text-2xl**

En `app/dashboard/pets/[petId]/page.tsx`, el `<h1>` del nombre de la mascota es `text-xl`. Cámbialo a `text-2xl`:

```tsx
<h1 className="text-2xl font-bold tracking-tight text-foreground">
```

- [ ] **Step 3: historiales/[petId] — agregar la barra del overline**

En `app/dashboard/historiales/[petId]/page.tsx`, el overline "Paciente" es un `<p>` suelto sin la barra. Envuélvelo con el patrón canónico. Reemplaza:

```tsx
<p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em] mb-1">Paciente</p>
```
por:
```tsx
<div className="flex items-center gap-2 mb-1">
  <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
  <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Paciente</p>
</div>
```
(Si el texto del label o las clases del contenedor difieren ligeramente, conserva el label real del archivo; solo aplica el envoltorio con la barra.)

- [ ] **Step 4: super-admin/page — overline + título estándar**

En `app/super-admin/page.tsx`, el `<h1>` es `text-2xl font-bold mb-6` sin overline. Reemplázalo por el patrón estándar. Sustituye el `<h1>` por:

```tsx
<div className="space-y-1 mb-6">
  <div className="flex items-center gap-2">
    <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
    <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Super Admin</p>
  </div>
  <h1 className="text-2xl font-bold tracking-tight text-foreground">Tenants</h1>
</div>
```
(Conserva el texto real del `<h1>` que ya tenía la página si es distinto de "Tenants".)

- [ ] **Step 5: Verificar y commit**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0.
```bash
git add "veterinaias/app/dashboard/owners/[ownerId]/page.tsx" "veterinaias/app/dashboard/pets/[petId]/page.tsx" "veterinaias/app/dashboard/historiales/[petId]/page.tsx" veterinaias/app/super-admin/page.tsx
git commit -m "fix: standardize detail-page and super-admin titles with overline"
```

---

### Task 4: Títulos de las páginas de expediente (records)

**Files:**
- Modify: `veterinaias/app/dashboard/pets/[petId]/records/new/page.tsx`
- Modify: `veterinaias/app/dashboard/pets/[petId]/records/[recordId]/page.tsx`

- [ ] **Step 1: records/new — título a text-2xl + overline**

En `app/dashboard/pets/[petId]/records/new/page.tsx`, el `<h1>` es `text-xl font-semibold` sin overline. Léelo primero para ver su contenedor actual. Cambia el `<h1>` a `text-2xl font-bold tracking-tight text-foreground` y antepón el overline canónico (label "Nueva consulta"):

```tsx
<div className="flex items-center gap-2 mb-1">
  <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
  <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Nueva consulta</p>
</div>
<h1 className="text-2xl font-bold tracking-tight text-foreground">
  {/* conservar el texto/expresión del título actual */}
</h1>
```

- [ ] **Step 2: records/[recordId] — overline canónico + título a text-2xl**

En `app/dashboard/pets/[petId]/records/[recordId]/page.tsx`, el eyebrow "Consulta" usa `text-[11px] ... tracking-widest text-muted-foreground/50` (no canónico) y el `<h1>` es `text-xl font-semibold`. Reemplaza el eyebrow por el canónico y el título a `text-2xl font-bold`. Sustituye:

```tsx
<p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Consulta</p>
<h1 className="text-xl font-semibold tracking-tight text-foreground">{record.reason}</h1>
```
por:
```tsx
<div className="flex items-center gap-2 mb-1">
  <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
  <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Consulta</p>
</div>
<h1 className="text-2xl font-bold tracking-tight text-foreground">{record.reason}</h1>
```

- [ ] **Step 3: Verificar y commit**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0.
```bash
git add "veterinaias/app/dashboard/pets/[petId]/records/new/page.tsx" "veterinaias/app/dashboard/pets/[petId]/records/[recordId]/page.tsx"
git commit -m "fix: standardize record page titles with canonical overline"
```

---

### Task 5: DateInput en los modales de cartilla (Vacunas / Desparasitación)

**Files:**
- Modify: `veterinaias/components/pets/VaccinationsModal.tsx`
- Modify: `veterinaias/components/pets/DewormingsModal.tsx`

Estos modales usan `useForm` con `register`/`watch`/`setValue` ya disponibles. `DateInput` es controlado, así que los campos de fecha pasan de `register` a `watch`+`setValue`.

- [ ] **Step 1: VaccinationsModal — importar DateInput y reemplazar los dos date inputs**

En `components/pets/VaccinationsModal.tsx`:

1. Agrega el import:
```tsx
import { DateInput } from '@/components/ui/date-input'
```

2. Reemplaza el bloque de fechas (los dos `<Input type="date" {...register(...)} />`) por `DateInput` controlado. Sustituye:
```tsx
<div className="space-y-1">
  <Label>Fecha de aplicación <span className="text-destructive">*</span></Label>
  <Input type="date" {...register('application_date')} />
</div>
<div className="space-y-1">
  <Label>Próxima fecha</Label>
  <Input type="date" {...register('next_due_date')} />
</div>
```
por:
```tsx
<div className="space-y-1">
  <Label>Fecha de aplicación <span className="text-destructive">*</span></Label>
  <DateInput value={watch('application_date')} onChange={v => setValue('application_date', v ?? '')} />
</div>
{!isHistorical && (
  <div className="space-y-1">
    <Label>Próxima fecha</Label>
    <DateInput value={watch('next_due_date')} onChange={v => setValue('next_due_date', v ?? undefined)} />
  </div>
)}
```
**Importante:** conserva la condición `{!isHistorical && ...}` que ya envuelve el campo de próxima fecha (registro de carnet). Verifica en el archivo cómo está estructurado el grid de fechas y mantén el layout; lo esencial es cambiar el control nativo por `DateInput`.

- [ ] **Step 2: DewormingsModal — igual**

En `components/pets/DewormingsModal.tsx`:

1. Agrega el import `import { DateInput } from '@/components/ui/date-input'`.
2. Reemplaza los dos `<Input type="date" {...register('application_date')} />` y `next_due_date` por:
```tsx
<DateInput value={watch('application_date')} onChange={v => setValue('application_date', v ?? '')} />
```
y
```tsx
<DateInput value={watch('next_due_date')} onChange={v => setValue('next_due_date', v ?? undefined)} />
```
Confirma que `watch` y `setValue` estén desestructurados del `useForm` del componente (si falta `watch`, agrégalo a la desestructuración).

- [ ] **Step 3: Verificar y commit**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0. Verifica en browser: abre Vacunas/Desparasitaciones en una mascota → "Agregar" → el campo de fecha ahora es el calendario `DateInput` (igual que fecha de nacimiento).
```bash
git add veterinaias/components/pets/VaccinationsModal.tsx veterinaias/components/pets/DewormingsModal.tsx
git commit -m "fix: use DateInput for vaccination and deworming date fields"
```

---

### Task 6: DateInput en los field-arrays de la consulta

**Files:**
- Modify: `veterinaias/components/medical-records/VaccinationsField.tsx`
- Modify: `veterinaias/components/medical-records/DewormingsField.tsx`
- Modify: `veterinaias/components/medical-records/MedicalRecordForm.tsx`

Estos usan `useFieldArray` + `control.register(...)`. Para `DateInput` (controlado) se usa `useWatch` (ya importado en VaccinationsField) para leer y `setValue` para escribir por índice. `VaccinationsField` ya recibe `setValue` como prop; `DewormingsField` hay que pasárselo.

- [ ] **Step 1: VaccinationsField — DateInput en application_date y next_due_date**

En `components/medical-records/VaccinationsField.tsx`:

1. Agrega `import { DateInput } from '@/components/ui/date-input'`.
2. El componente ya tiene `setValue` como prop y `vaccinations = useWatch({ control, name: 'vaccinations' })`. Reemplaza los dos `<Input type="date" {...control.register(\`vaccinations.${index}.application_date\`)} />` y `next_due_date` por:
```tsx
<DateInput
  value={vaccinations?.[index]?.application_date}
  onChange={v => setValue(`vaccinations.${index}.application_date`, v ?? '')}
/>
```
y
```tsx
<DateInput
  value={vaccinations?.[index]?.next_due_date}
  onChange={v => setValue(`vaccinations.${index}.next_due_date`, v ?? '')}
/>
```

- [ ] **Step 2: DewormingsField — aceptar setValue y usar DateInput**

En `components/medical-records/DewormingsField.tsx`:

1. Agrega imports: `import { DateInput } from '@/components/ui/date-input'` y `import { useWatch, type UseFormSetValue } from 'react-hook-form'` (mantén el import existente de `useFieldArray, Control`).
2. Cambia la interfaz de props para recibir `setValue`:
```tsx
interface DewormingsFieldProps {
  control: Control<MedicalRecordFormValues>
  setValue: UseFormSetValue<MedicalRecordFormValues>
}
export function DewormingsField({ control, setValue }: DewormingsFieldProps) {
```
3. Dentro del componente, agrega el watch del array:
```tsx
const dewormings = useWatch({ control, name: 'dewormings' })
```
4. Reemplaza los dos `<Input type="date" {...control.register(\`dewormings.${index}.application_date\`)} />` y `next_due_date` por:
```tsx
<DateInput
  value={dewormings?.[index]?.application_date}
  onChange={v => setValue(`dewormings.${index}.application_date`, v ?? '')}
/>
```
y
```tsx
<DateInput
  value={dewormings?.[index]?.next_due_date}
  onChange={v => setValue(`dewormings.${index}.next_due_date`, v ?? '')}
/>
```

- [ ] **Step 3: MedicalRecordForm — pasar setValue a DewormingsField**

En `components/medical-records/MedicalRecordForm.tsx`, el `setValue` ya está desestructurado del `useForm` (se usa para VaccinationsField y PrescriptionsFields). Encuentra el render de `<DewormingsField control={control as any} />` y pásale `setValue`:
```tsx
<DewormingsField control={control as any} setValue={setValue as any} />
```

- [ ] **Step 4: Verificar y commit**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0. Verifica en browser: en una consulta nueva, sección "Vacunas y Desparasitación", los campos de fecha son el calendario `DateInput`.
```bash
git add veterinaias/components/medical-records/VaccinationsField.tsx veterinaias/components/medical-records/DewormingsField.tsx veterinaias/components/medical-records/MedicalRecordForm.tsx
git commit -m "fix: use DateInput in consultation vaccination/deworming field arrays"
```

---

### Task 7: Migrar ShareConsultationModal a Dialog

**Files:**
- Modify: `veterinaias/components/medical-records/ShareConsultationModal.tsx`

- [ ] **Step 1: Reemplazar el overlay custom por Dialog**

En `components/medical-records/ShareConsultationModal.tsx`:

1. Agrega el import: `import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'`.
2. El componente renderiza un botón trigger cuando `!open`, y un overlay `fixed inset-0` cuando `open`. Reestructura para que SIEMPRE renderice el botón trigger seguido del `<Dialog>`:

Reemplaza el bloque `if (!open) { return (<button ...>Compartir</button>) }` y el `return (<div className="fixed inset-0 ...">...</div>)` por una sola estructura:

```tsx
return (
  <>
    <button onClick={() => setOpen(true)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
      <Share2 size={14} />
      Compartir
    </button>

    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); else setOpen(true) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
              <MessageCircle size={14} className="text-green-700" />
            </div>
            Compartir por WhatsApp
          </DialogTitle>
        </DialogHeader>

        {/* CONSERVAR EXACTAMENTE el cuerpo actual: el bloque condicional
            !result?.shareUrl ? (formulario de teléfono + botones) : (estado enviado + copiar link).
            Solo eliminar el botón X manual y el <h3> del header (ya están en DialogHeader/DialogTitle). */}
      </DialogContent>
    </Dialog>
  </>
)
```

3. Elimina el `import { X } from 'lucide-react'` si `X` ya no se usa (el botón de cierre manual desaparece — el Dialog cierra con escape/click-outside/su propio mecanismo). Verifica con búsqueda antes de quitar.
4. Mantén intactas las funciones `handleSend`, `copyLink`, `close`, `formatPhone`, `handlePhoneChange` y todo el cuerpo (formulario de teléfono, estado de éxito, copiar link).

- [ ] **Step 2: Verificar y commit**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0. Verifica en browser: en un expediente, "Compartir" abre el modal con animación (igual que los modales de catálogo).
```bash
git add veterinaias/components/medical-records/ShareConsultationModal.tsx
git commit -m "refactor: migrate ShareConsultationModal to Dialog component"
```

---

### Task 8: Migrar OwnerResolutionModal a Dialog

**Files:**
- Modify: `veterinaias/components/medical-records/OwnerResolutionModal.tsx`

- [ ] **Step 1: Reemplazar overlay custom por Dialog**

Lee el archivo. Tiene un overlay `fixed inset-0 ... bg-black/40 backdrop-blur-sm` con un card `bg-white rounded-2xl shadow-2xl max-w-sm`, un `<h2 className="text-lg ...">` de título, y manejo manual de escape/click-outside.

Migra:
1. Importa `import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'`.
2. Envuelve el contenido en `<Dialog open={...} onOpenChange={...}><DialogContent className="max-w-sm">`.
3. Mueve el título a `<DialogHeader><DialogTitle>...</DialogTitle></DialogHeader>` (el `DialogTitle` ya es `text-base font-semibold` — quita el `text-lg`).
4. Elimina: el div overlay `fixed inset-0`, el `bg-white rounded-2xl shadow-2xl`, el manejo manual de escape/click-outside, y el botón X manual si existe.
5. Conserva TODO el cuerpo (la lógica de resolución de dueño) idéntico.

Usa el patrón canónico de la cabecera del plan como referencia. La prop de control de apertura (open/onClose) que ya recibe el componente se mapea a `open`/`onOpenChange`.

- [ ] **Step 2: Verificar y commit**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0. Verifica en browser el flujo que abre este modal (resolución de dueño en consulta walk-in).
```bash
git add veterinaias/components/medical-records/OwnerResolutionModal.tsx
git commit -m "refactor: migrate OwnerResolutionModal to Dialog component"
```

---

### Task 9: AppointmentDetailDialog compartido (de-duplicar AppointmentQuickModal + DashboardTwoColumn)

**Files:**
- Create: `veterinaias/components/appointments/AppointmentDetailDialog.tsx`
- Modify: `veterinaias/components/dashboard/AppointmentQuickModal.tsx`
- Modify: `veterinaias/components/dashboard/DashboardTwoColumn.tsx`

`AppointmentQuickModal` y el modal inline dentro de `DashboardTwoColumn` son el MISMO modal de detalle de cita duplicado (ambos custom, `bg-white`, sin animación). Se extrae uno compartido basado en `Dialog`.

- [ ] **Step 1: Leer ambos modales**

Lee `components/dashboard/AppointmentQuickModal.tsx` y la porción de modal inline en `components/dashboard/DashboardTwoColumn.tsx` (el `fixed inset-0` con `bg-white rounded-2xl`). Identifica las props que necesita (datos de la cita, callbacks). Confirma qué muestra cada uno (deberían ser equivalentes: detalle de la cita + acciones).

- [ ] **Step 2: Crear `AppointmentDetailDialog.tsx`**

Crea `components/appointments/AppointmentDetailDialog.tsx` con un componente que reciba las props comunes (la cita y `open`/`onOpenChange` + callbacks de acción) y renderice con `Dialog`:
```tsx
'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
// ...imports de iconos/Button según el contenido actual

interface AppointmentDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // ...las props de datos/acciones que hoy usa AppointmentQuickModal (cita, onComplete, etc.)
}

export function AppointmentDetailDialog({ open, onOpenChange, /* ... */ }: AppointmentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{/* título del detalle de cita */}</DialogTitle></DialogHeader>
        {/* cuerpo: tomar el contenido común de AppointmentQuickModal — datos del paciente/dueño/hora,
            estado, y los botones de acción. Usar tokens (text-foreground, bg-muted) — NADA de bg-white. */}
      </DialogContent>
    </Dialog>
  )
}
```
El cuerpo debe replicar el contenido del modal actual (el más completo de los dos), con tokens semánticos (sin `bg-white`, sin `rounded-2xl` manual).

- [ ] **Step 3: Usar el componente en ambos sitios**

- En `AppointmentQuickModal.tsx`: reemplaza su implementación custom por un wrapper que renderice `<AppointmentDetailDialog .../>` con las props que ya recibe (o, si queda trivial, reemplaza sus usos directamente por `AppointmentDetailDialog`).
- En `DashboardTwoColumn.tsx`: elimina el modal inline `fixed inset-0` y renderiza `<AppointmentDetailDialog open={...} onOpenChange={...} .../>` con el estado que ya maneja.

Mantén el comportamiento (qué cita muestra, acciones disponibles) idéntico.

- [ ] **Step 4: Verificar y commit**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0. Verifica en browser: en el dashboard, abrir el detalle de una cita (desde la columna y desde donde lo use AppointmentQuickModal) muestra el mismo modal con animación.
```bash
git add veterinaias/components/appointments/AppointmentDetailDialog.tsx veterinaias/components/dashboard/AppointmentQuickModal.tsx veterinaias/components/dashboard/DashboardTwoColumn.tsx
git commit -m "refactor: extract shared AppointmentDetailDialog and migrate to Dialog"
```

---

### Task 10: Migrar NewAppointmentModal a Dialog + reconciliar el date picker

**Files:**
- Modify: `veterinaias/components/appointments/NewAppointmentModal.tsx`

Es el modal más grande. Lee el archivo completo primero. Tiene: overlay `fixed inset-0 bg-black/50 backdrop-blur-sm`, card `bg-card border rounded-2xl shadow-2xl max-w-lg max-h-[90vh] overflow-y-auto`, manejo manual de escape (useEffect) y click-outside, header con `<h2>` + botón X, y un date picker hecho con `Popover`+`Calendar` inline.

- [ ] **Step 1: Migrar el shell a Dialog**

1. Importa `import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'`.
2. Reemplaza el overlay `fixed inset-0` + card por:
```tsx
<Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Nueva cita</DialogTitle>
    </DialogHeader>
    {/* cuerpo del formulario idéntico */}
  </DialogContent>
</Dialog>
```
3. Elimina: el `useEffect` de escape-key (líneas ~72-77), el manejo manual de click-outside (el `onClick` del overlay), el `modalRef.focus()` y el `tabIndex`/`role`/`aria-modal` manuales (el Dialog los aporta), y el botón X manual del header.
4. Conserva TODO el cuerpo del formulario: toggle de modo (registrado/primera visita), búsqueda de dueño, select de mascota, el bloque de fecha/hora, motivo, asignar a, el banner de conflicto de citas, y el footer de botones.

- [ ] **Step 2: Reconciliar el date picker a DateInput**

Dentro del formulario, el campo de Fecha usa un `Popover`+`PopoverTrigger`+`Calendar` inline con estado `selectedDate: Date`. Reemplázalo por `DateInput`, preservando el filtro de días hábiles.

1. Importa `import { DateInput } from '@/components/ui/date-input'`.
2. Reemplaza el bloque del `Popover` de fecha por:
```tsx
<div className="space-y-1">
  <Label>Fecha <span className="text-destructive">*</span></Label>
  <DateInput
    value={selectedDate ? selectedDate.toISOString().split('T')[0] : undefined}
    onChange={v => {
      const d = v ? new Date(v + 'T12:00:00') : undefined
      setSelectedDate(d)
      setSelectedTime('')
    }}
    disabled={(date) => {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const availableDays = businessHours?.days ?? [1, 2, 3, 4, 5, 6]
      return date < today || !availableDays.includes(date.getDay())
    }}
  />
</div>
```
3. Quita los imports de `Popover`/`PopoverContent`/`PopoverTrigger`/`Calendar`/`CalendarIcon`/`format`/`es` si ya no se usan en el archivo (verifica con búsqueda; la hora sigue usando `Select`, no Popover).
4. Conserva la lógica de `combineDateAndTime(selectedDate, selectedTime)` en el submit (sigue funcionando con `selectedDate: Date`).

- [ ] **Step 3: Verificar y commit**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0. Verifica en browser: "Nueva cita" abre con animación; el campo de fecha es el `DateInput` (calendario), respeta días hábiles; crear cita y el warning de conflicto siguen funcionando.
```bash
git add veterinaias/components/appointments/NewAppointmentModal.tsx
git commit -m "refactor: migrate NewAppointmentModal to Dialog and DateInput"
```

---

### Verificación final

- [ ] **Type check global**
```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0.

- [ ] **No quedan date inputs nativos ni overlays custom**
```bash
cd veterinaias && grep -rn "type=\"date\"" components/ app/ --include=*.tsx
cd veterinaias && grep -rln "fixed inset-0 z-50 flex items-center justify-center bg-black" components/ app/ --include=*.tsx
```
Expected: el primer grep sin resultados; el segundo solo (si acaso) en componentes intencionalmente no-modales. Todos los modales de la Fase A deben usar `Dialog`.
