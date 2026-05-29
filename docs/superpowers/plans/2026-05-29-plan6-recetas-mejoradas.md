# Plan 6 — Recetas Mejoradas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vincular recetas al catálogo de medicamentos para pre-llenar datos y sugerir dosis automáticamente según el peso más reciente de la mascota.

**Architecture:** Dos columnas nuevas en `prescriptions` (`medication_catalog_id`, `suggested_dose`, `route_of_administration`). El campo de medicamento en el formulario de consulta se convierte en combobox que busca en el catálogo. Si el medicamento tiene `dose_per_kg` y la mascota tiene peso registrado, se muestra la dosis sugerida como texto de ayuda no-bloqueante. El vet siempre puede escribir libremente.

**Prerequisite:** Plan 4 debe estar completo (`medication_catalog` debe existir con datos).

**Tech Stack:** Next.js App Router, Supabase, react-hook-form, useFieldArray, Zod, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-05-29-veterinaias-roadmap-planes4-11.md` §Plan 6

---

### Task 1: Migración — Campos nuevos en `prescriptions`

**Files:**
- Create: `veterinaias/supabase/migrations/20260529000005_prescriptions_enhanced.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260529000005_prescriptions_enhanced.sql

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS medication_catalog_id UUID REFERENCES medication_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suggested_dose TEXT,
  ADD COLUMN IF NOT EXISTS route_of_administration TEXT;
```

- [ ] **Step 2: Aplicar la migración**

```bash
cd veterinaias && npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/supabase/migrations/20260529000005_prescriptions_enhanced.sql
git commit -m "feat: add medication_catalog_id, suggested_dose, route_of_administration to prescriptions"
```

---

### Task 2: Actualizar tipos TypeScript

**Files:**
- Modify: `veterinaias/lib/types/database.ts`

- [ ] **Step 1: Actualizar la interfaz `Prescription`**

En `lib/types/database.ts`, reemplaza la interfaz `Prescription`:

```typescript
export interface Prescription {
  id: string
  medical_record_id: string
  medication_catalog_id: string | null
  medication_name: string
  active_ingredient: string | null
  dosage: string
  suggested_dose: string | null
  route_of_administration: string | null
  frequency: string
  duration: string
  notes: string | null
  created_at: string
}
```

- [ ] **Step 2: Actualizar el tipo `Database` para `prescriptions`**

En `Database.public.Tables`, actualiza la entrada `prescriptions`:

```typescript
prescriptions: {
  Row: {
    id: string; medical_record_id: string; medication_catalog_id: string | null;
    medication_name: string; active_ingredient: string | null; dosage: string;
    suggested_dose: string | null; route_of_administration: string | null;
    frequency: string; duration: string; notes: string | null; created_at: string
  }
  Insert: {
    medical_record_id: string; medication_catalog_id?: string | null;
    medication_name: string; active_ingredient?: string | null; dosage: string;
    suggested_dose?: string | null; route_of_administration?: string | null;
    frequency: string; duration: string; notes?: string | null
  }
  Update: Record<string, never>
  Relationships: []
}
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/lib/types/database.ts
git commit -m "feat: update Prescription type with catalog fields"
```

---

### Task 3: Actualizar schemas Zod de recetas

**Files:**
- Modify: `veterinaias/lib/validations/medical-record.ts`

- [ ] **Step 1: Actualizar `prescriptionSchema`**

En `lib/validations/medical-record.ts`, reemplaza `prescriptionSchema`:

```typescript
export const prescriptionSchema = z.object({
  medication_catalog_id: z.string().uuid().optional(),
  medication_name: z.string().min(1, 'Nombre del medicamento es requerido'),
  active_ingredient: z.string().optional(),
  dosage: z.string().min(1, 'Dosis es requerida'),
  suggested_dose: z.string().optional(),
  route_of_administration: z.string().optional(),
  frequency: z.string().min(1, 'Frecuencia es requerida'),
  duration: z.string().min(1, 'Duración es requerida'),
  notes: z.string().optional(),
})

export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>
```

El `defaultValues` en `PrescriptionsFields` debe actualizarse también en el próximo task.

- [ ] **Step 2: Commit**

```bash
git add veterinaias/lib/validations/medical-record.ts
git commit -m "feat: extend prescriptionSchema with catalog fields and route_of_administration"
```

---

### Task 4: Actualizar `PrescriptionsFields` — combobox y sugerencia de dosis

**Files:**
- Modify: `veterinaias/components/medical-records/PrescriptionsFields.tsx`

- [ ] **Step 1: Reemplazar el componente completo**

El nuevo `PrescriptionsFields` carga el catálogo de medicamentos, usa `FreeTextCombobox` para el nombre y muestra la dosis sugerida cuando aplica.

El peso de la mascota para la sugerencia se recibe como prop (viene del formulario de consulta donde ya se captura `weight_kg`).

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useFieldArray, Control, useWatch } from 'react-hook-form'
import type { MedicalRecordFormValues } from '@/lib/validations/medical-record'
import type { MedicationCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FreeTextCombobox } from '@/components/ui/free-text-combobox'
import { Lightbulb } from 'lucide-react'

const ROUTE_OPTIONS = ['Oral', 'IV', 'IM', 'SC', 'Tópica', 'Oftálmica', 'Ótica']

interface PrescriptionsFieldsProps {
  control: Control<MedicalRecordFormValues>
}

export function PrescriptionsFields({ control }: PrescriptionsFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'prescriptions' })
  const [catalog, setCatalog] = useState<MedicationCatalog[]>([])
  const prescriptions = useWatch({ control, name: 'prescriptions' })
  const weightKg = useWatch({ control, name: 'weight_kg' })

  useEffect(() => {
    fetch('/api/catalog/medications')
      .then(r => r.json())
      .then(j => setCatalog((j.data ?? []).filter((m: MedicationCatalog) => m.active)))
      .catch(() => {})
  }, [])

  const catalogNames = catalog.map(m => m.name)

  function onMedicationSelect(index: number, name: string | undefined) {
    const matched = catalog.find(m => m.name === name)
    if (matched) {
      control._formValues.prescriptions[index].medication_name = matched.name
      control._formValues.prescriptions[index].medication_catalog_id = matched.id
      control._formValues.prescriptions[index].active_ingredient = matched.active_ingredient ?? ''
      control._formValues.prescriptions[index].route_of_administration = matched.default_route ?? ''

      // Calcular dosis sugerida si hay peso y regla de dosis
      const weight = weightKg ?? (control._formValues.weight_kg as number | undefined)
      if (matched.dose_per_kg && weight && weight > 0) {
        const dosis = weight * matched.dose_per_kg
        const dosisStr = `${dosis.toFixed(1)} ${matched.dose_unit ?? ''}`
        const volStr = matched.concentration ? calcVolume(dosis, matched.concentration, matched.dose_unit) : null
        control._formValues.prescriptions[index].suggested_dose = dosisStr
        control._formValues.prescriptions[index].dosage = dosisStr
      }
    } else {
      control._formValues.prescriptions[index].medication_name = name ?? ''
      control._formValues.prescriptions[index].medication_catalog_id = undefined
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Recetas médicas</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({
            medication_name: '',
            medication_catalog_id: undefined,
            active_ingredient: '',
            dosage: '',
            suggested_dose: undefined,
            route_of_administration: '',
            frequency: '',
            duration: '',
            notes: '',
          })}
        >
          + Agregar medicamento
        </Button>
      </div>
      {fields.map((field, index) => {
        const matched = catalog.find(m => m.id === prescriptions?.[index]?.medication_catalog_id)
        const weight = weightKg ?? (control._formValues.weight_kg as number | undefined)
        const suggestion = matched?.dose_per_kg && weight && weight > 0
          ? buildSuggestionText(weight, matched)
          : null

        return (
          <div key={field.id} className="border border-border rounded-lg p-3 mb-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Medicamento *</Label>
                <FreeTextCombobox
                  value={prescriptions?.[index]?.medication_name}
                  onChange={v => onMedicationSelect(index, v)}
                  options={catalogNames}
                  placeholder="Selecciona o escribe..."
                />
              </div>
              <div>
                <Label className="text-xs">Principio activo</Label>
                <Input
                  {...control.register(`prescriptions.${index}.active_ingredient`)}
                  placeholder="Se pre-llena del catálogo"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Dosis *</Label>
                <Input
                  {...control.register(`prescriptions.${index}.dosage`)}
                  placeholder="ej. 250mg"
                />
                {suggestion && (
                  <p className="flex items-center gap-1 text-xs text-amber-700 mt-1">
                    <Lightbulb size={11} />
                    {suggestion}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Vía de administración</Label>
                <Input
                  {...control.register(`prescriptions.${index}.route_of_administration`)}
                  list={`routes-${index}`}
                  placeholder="ej. Oral"
                />
                <datalist id={`routes-${index}`}>
                  {ROUTE_OPTIONS.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Frecuencia *</Label>
                <Input
                  {...control.register(`prescriptions.${index}.frequency`)}
                  placeholder="ej. Cada 8 horas"
                />
              </div>
              <div>
                <Label className="text-xs">Duración *</Label>
                <Input
                  {...control.register(`prescriptions.${index}.duration`)}
                  placeholder="ej. 7 días"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Input
                {...control.register(`prescriptions.${index}.notes`)}
                placeholder="Instrucciones adicionales"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500"
              onClick={() => remove(index)}
            >
              Eliminar
            </Button>
          </div>
        )
      })}
    </div>
  )
}

function buildSuggestionText(weight: number, med: MedicationCatalog): string {
  const dosis = weight * (med.dose_per_kg ?? 0)
  const unit = med.dose_unit ?? ''
  let text = `Sugerida: ${dosis.toFixed(1)} ${unit} (${weight}kg × ${med.dose_per_kg}${unit}/kg)`
  if (med.concentration) {
    const vol = calcVolume(dosis, med.concentration, unit)
    if (vol) text += ` = ${vol}`
  }
  return text
}

function calcVolume(dose: number, concentration: string, doseUnit: string | null): string | null {
  // Parsea formatos como "500mg/ml", "250mg/5ml"
  const match = concentration.match(/^([\d.]+)\s*(\w+)\s*\/\s*([\d.]+)?\s*(\w+)$/)
  if (!match) return null
  const [, concAmt, concUnit, volAmt, volUnit] = match
  if (concUnit?.toLowerCase() !== (doseUnit ?? '').toLowerCase()) return null
  const concPerVol = parseFloat(concAmt) / (parseFloat(volAmt || '1'))
  const volume = dose / concPerVol
  return `${volume.toFixed(2)} ${volUnit}`
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/medical-records/PrescriptionsFields.tsx
git commit -m "feat: upgrade PrescriptionsFields with catalog combobox and dose suggestion"
```

---

### Task 5: Actualizar la API de expedientes — guardar campos nuevos de recetas

**Files:**
- Modify: `veterinaias/app/api/medical-records/route.ts`

- [ ] **Step 1: Asegurarse de que los nuevos campos de `prescriptionSchema` se persisten**

El handler POST ya hace `prescriptions.map(p => ({ ...p, medical_record_id: record.id }))`. Como los nuevos campos son parte del schema Zod, ya pasarán en el spread. Solo verificar que no se filtren:

En `app/api/medical-records/route.ts`, el bloque de inserción de prescriptions ya funciona. Confirma visualmente que el insert sea:

```typescript
if (prescriptions && prescriptions.length > 0) {
  const { error: presError } = await supabase
    .from('prescriptions')
    .insert(prescriptions.map(p => ({ ...p, medical_record_id: record.id })))
  if (presError) return NextResponse.json({ error: presError.message }, { status: 500 })
}
```

Esto ya incluirá `medication_catalog_id`, `suggested_dose`, `route_of_administration`, y `active_ingredient` porque vienen del Zod spread.

- [ ] **Step 2: Verificar en browser**

1. Inicia una nueva consulta desde `/dashboard/pets/[petId]/records/new`
2. Ingresa un peso en Triaje (ej. 5.0 kg)
3. En Recetas → Agregar medicamento → escribe el nombre de un medicamento del catálogo que tenga `dose_per_kg`
4. Verifica que aparezca el texto de sugerencia debajo del campo "Dosis" con el cálculo correcto
5. Verifica que se pre-llenen principio activo y vía de administración
6. Guarda la consulta — verifica que el expediente guardado tenga la receta con todos los campos

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/api/medical-records/route.ts
git commit -m "feat: persist enhanced prescription fields including catalog link and dose suggestion"
```

---

### Nota de implementación — setValue en PrescriptionsFields

`control._formValues` no dispara re-renders en RHF v7. Al implementar `PrescriptionsFields.tsx`, pasar `setValue` desde `MedicalRecordForm.tsx` y usarlo en `onMedicationSelect`:

```typescript
// En MedicalRecordForm.tsx
const { register, handleSubmit, control, setValue, ... } = useForm(...)
<PrescriptionsFields control={control as any} setValue={setValue as any} />
```

```typescript
// En PrescriptionsFields.tsx — agregar a la interfaz
interface PrescriptionsFieldsProps {
  control: Control<MedicalRecordFormValues>
  setValue: (name: string, value: unknown) => void
}

// En onMedicationSelect — usar setValue
function onMedicationSelect(index: number, name: string | undefined) {
  setValue(`prescriptions.${index}.medication_name`, name ?? '')
  const matched = catalog.find(m => m.name === name)
  if (matched) {
    setValue(`prescriptions.${index}.medication_catalog_id`, matched.id)
    setValue(`prescriptions.${index}.active_ingredient`, matched.active_ingredient ?? '')
    setValue(`prescriptions.${index}.route_of_administration`, matched.default_route ?? '')
    const weight = control._formValues.weight_kg
    if (matched.dose_per_kg && weight) {
      const dosis = `${(weight * matched.dose_per_kg).toFixed(1)} ${matched.dose_unit ?? ''}`
      setValue(`prescriptions.${index}.dosage`, dosis)
      setValue(`prescriptions.${index}.suggested_dose`, dosis)
    }
  }
}
```
