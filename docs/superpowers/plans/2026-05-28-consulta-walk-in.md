# Consulta Walk-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al veterinario iniciar y guardar una consulta completa para un paciente nuevo desde `/dashboard/records/new`, sin salir de la página.

**Architecture:** Nueva ruta `/dashboard/records/new` con un client component `WalkInConsultationPage` que gestiona todo el estado local. El vet llena datos de la mascota (inline), luego la consulta clínica, y al guardar se abre un modal para resolver el dueño. Un solo endpoint `POST /api/consultations/walk-in` crea pet + owner + pet_registration + medical_record de forma secuencial con rollback manual.

**Tech Stack:** Next.js 14 App Router, Supabase, Zod, react-hook-form, Tailwind CSS, shadcn/ui, TypeScript.

---

## File Structure

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| CREATE | `veterinaias/app/dashboard/records/new/page.tsx` | Server component — renderiza WalkInConsultationPage |
| CREATE | `veterinaias/components/medical-records/WalkInConsultationPage.tsx` | Orquestador de estado: petForm + recordForm + ownerModal |
| CREATE | `veterinaias/components/medical-records/WalkInPetForm.tsx` | Formulario inline de datos de la mascota |
| CREATE | `veterinaias/components/medical-records/OwnerResolutionModal.tsx` | Modal de 3 modos: buscar / crear / sin dueño |
| CREATE | `veterinaias/app/api/consultations/walk-in/route.ts` | POST — crea pet + owner + registration + record |
| MODIFY | `veterinaias/lib/validations/medical-record.ts` | Agrega `walkInConsultationSchema` |
| MODIFY | `veterinaias/components/dashboard/DashboardTwoColumn.tsx` | Actualiza href "Consulta sin cita" |

---

### Task 1: Validation schema

**Files:**
- Modify: `veterinaias/lib/validations/medical-record.ts`

- [ ] **Step 1: Agrega los schemas walk-in al final del archivo**

El archivo actual termina en la línea 43. Agrega esto al final:

```typescript
export const walkInPetSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  species_id: z.string().uuid('Especie es requerida'),
  breed_id: z.string().uuid().optional(),
  sex: z.enum(['male', 'female', 'unknown']).default('unknown'),
  date_of_birth: z.preprocess(
    v => (v === '' ? undefined : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  ),
})

export const walkInRecordSchema = z.object({
  reason: z.string().min(1, 'Motivo de consulta es requerido'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  weight_kg: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  temperature_celsius: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().positive().optional()
  ),
  heart_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  respiratory_rate_bpm: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().positive().optional()
  ),
  prescriptions: z.array(prescriptionSchema).default([]),
})

const existingOwnerSchema = z.object({ id: z.string().uuid() })
const newOwnerSchema = z.object({
  full_name: z.string().min(1, 'Nombre es requerido'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

export const walkInOwnerSchema = z.union([existingOwnerSchema, newOwnerSchema]).nullable()

export const walkInConsultationSchema = z.object({
  pet: walkInPetSchema,
  record: walkInRecordSchema,
  owner: walkInOwnerSchema,
})

export type WalkInPetValues = z.infer<typeof walkInPetSchema>
export type WalkInRecordValues = z.infer<typeof walkInRecordSchema>
export type WalkInOwnerValue = z.infer<typeof walkInOwnerSchema>
export type WalkInConsultationValues = z.infer<typeof walkInConsultationSchema>
```

- [ ] **Step 2: Verifica que el archivo compila**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep "medical-record"
```

Expected: sin errores relacionados a `medical-record.ts`.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/lib/validations/medical-record.ts
git commit -m "feat: add walk-in consultation validation schemas"
```

---

### Task 2: API endpoint POST /api/consultations/walk-in

**Files:**
- Create: `veterinaias/app/api/consultations/walk-in/route.ts`

**Contexto:** El endpoint crea en orden: (1) pet, (2) owner si es nuevo, (3) pet_registration, (4) medical_record. Si algún paso falla después de crear un registro, hace rollback manual eliminando lo creado. Si `owner` es `null`, crea un owner placeholder "Sin registrar" con solo el nombre, para que la mascota aparezca en la lista del tenant vía `pet_registration`.

- [ ] **Step 1: Crea el archivo del endpoint**

```typescript
// veterinaias/app/api/consultations/walk-in/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { walkInConsultationSchema } from '@/lib/validations/medical-record'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant asignado' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const result = walkInConsultationSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  }

  const { pet: petData, record: recordData, owner: ownerInput } = result.data

  // Step 1: Create pet
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .insert({
      name: petData.name,
      species_id: petData.species_id,
      breed_id: petData.breed_id ?? null,
      sex: petData.sex,
      date_of_birth: petData.date_of_birth ?? null,
    })
    .select('id')
    .single()

  if (petError) return NextResponse.json({ error: 'Error al crear la mascota' }, { status: 500 })

  const petId = pet.id

  // Step 2: Resolve owner
  let ownerId: string

  if (ownerInput === null) {
    // Create placeholder owner
    const { data: placeholder, error: placeholderError } = await (supabase.from('owners') as any)
      .insert({ full_name: 'Sin registrar', tenant_id: profile.tenant_id })
      .select('id')
      .single()

    if (placeholderError) {
      await supabase.from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al crear dueño' }, { status: 500 })
    }
    ownerId = placeholder.id
  } else if ('id' in ownerInput) {
    // Existing owner
    ownerId = ownerInput.id
  } else {
    // New owner
    const { data: newOwner, error: ownerError } = await (supabase.from('owners') as any)
      .insert({
        full_name: ownerInput.full_name,
        phone: ownerInput.phone ?? null,
        email: ownerInput.email || null,
        tenant_id: profile.tenant_id,
      })
      .select('id')
      .single()

    if (ownerError) {
      await supabase.from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al crear el dueño' }, { status: 500 })
    }
    ownerId = newOwner.id
  }

  // Step 3: Create pet_registration
  const { error: regError } = await (supabase.from('pet_registrations') as any)
    .insert({ tenant_id: profile.tenant_id, pet_id: petId, owner_id: ownerId })

  if (regError) {
    await supabase.from('pets').delete().eq('id', petId)
    return NextResponse.json({ error: 'Error al registrar la mascota' }, { status: 500 })
  }

  // Step 4: Create medical record
  const { prescriptions, weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm, ...rest } = recordData

  const { data: record, error: recordError } = await supabase
    .from('medical_records')
    .insert({
      ...rest,
      pet_id: petId,
      weight_kg: weight_kg ?? null,
      temperature_celsius: temperature_celsius ?? null,
      heart_rate_bpm: heart_rate_bpm ?? null,
      respiratory_rate_bpm: respiratory_rate_bpm ?? null,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (recordError) {
    await (supabase.from('pet_registrations') as any).delete().eq('pet_id', petId)
    await supabase.from('pets').delete().eq('id', petId)
    return NextResponse.json({ error: 'Error al crear la consulta' }, { status: 500 })
  }

  if (prescriptions && prescriptions.length > 0) {
    await supabase
      .from('prescriptions')
      .insert(prescriptions.map(p => ({ ...p, medical_record_id: record.id })))
  }

  return NextResponse.json({ petId, recordId: record.id }, { status: 201 })
}
```

- [ ] **Step 2: Verifica que compila**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep "walk-in"
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/api/consultations/walk-in/route.ts
git commit -m "feat: POST /api/consultations/walk-in — creates pet, owner, registration, record"
```

---

### Task 3: WalkInPetForm component

**Files:**
- Create: `veterinaias/components/medical-records/WalkInPetForm.tsx`

**Contexto:** Formulario inline con los campos de la mascota. Sigue el patrón `FormSection` del proyecto. Llama a `onChange` cada vez que cambia un campo. Fetches species al montar; fetches breeds cuando cambia `speciesId`. `name` y `species_id` son los campos mínimos — el parent los usa para decidir si mostrar el formulario clínico.

- [ ] **Step 1: Crea el componente**

```typescript
// veterinaias/components/medical-records/WalkInPetForm.tsx
'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSection } from '@/components/ui/form-section'
import type { WalkInPetValues } from '@/lib/validations/medical-record'

interface Species { id: string; name: string }
interface Breed { id: string; name: string }

interface WalkInPetFormProps {
  values: WalkInPetValues
  onChange: (values: WalkInPetValues) => void
  errors?: Partial<Record<keyof WalkInPetValues, string>>
}

export function WalkInPetForm({ values, onChange, errors }: WalkInPetFormProps) {
  const [species, setSpecies] = useState<Species[]>([])
  const [breeds, setBreeds] = useState<Breed[]>([])

  useEffect(() => {
    fetch('/api/species')
      .then(r => r.json())
      .then(json => setSpecies(json.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!values.species_id) { setBreeds([]); return }
    fetch(`/api/species/${values.species_id}/breeds`)
      .then(r => r.json())
      .then(json => setBreeds(json.data ?? []))
      .catch(() => {})
  }, [values.species_id])

  function update(patch: Partial<WalkInPetValues>) {
    onChange({ ...values, ...patch })
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border mb-5">
      <FormSection title="Paciente nuevo">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="pet_name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pet_name"
              value={values.name}
              onChange={e => update({ name: e.target.value })}
              placeholder="Ej. Luna, Rocky..."
              autoFocus
            />
            {errors?.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <Label>
              Especie <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.species_id}
              onValueChange={v => update({ species_id: v, breed_id: undefined })}
              items={Object.fromEntries(species.map(s => [s.id, s.name]))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar especie" />
              </SelectTrigger>
              <SelectContent>
                {species.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors?.species_id && <p className="text-destructive text-xs mt-1">{errors.species_id}</p>}
          </div>

          {breeds.length > 0 && (
            <div className="space-y-1">
              <Label>Raza</Label>
              <Select
                value={values.breed_id ?? ''}
                onValueChange={v => update({ breed_id: v || undefined })}
                items={Object.fromEntries(breeds.map(b => [b.id, b.name]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar raza (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {breeds.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Sexo</Label>
            <Select
              value={values.sex}
              onValueChange={v => update({ sex: v as WalkInPetValues['sex'] })}
              items={{ male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Macho</SelectItem>
                <SelectItem value="female">Hembra</SelectItem>
                <SelectItem value="unknown">Desconocido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pet_dob">Fecha de nacimiento</Label>
            <Input
              id="pet_dob"
              type="date"
              value={values.date_of_birth ?? ''}
              onChange={e => update({ date_of_birth: e.target.value || undefined })}
            />
          </div>
        </div>
      </FormSection>
    </div>
  )
}
```

- [ ] **Step 2: Verifica que compila**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep "WalkInPetForm"
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/medical-records/WalkInPetForm.tsx
git commit -m "feat: WalkInPetForm — inline pet data form for walk-in consultations"
```

---

### Task 4: OwnerResolutionModal component

**Files:**
- Create: `veterinaias/components/medical-records/OwnerResolutionModal.tsx`

**Contexto:** Modal con 3 modos. `mode='search'`: campo de búsqueda debounced (150ms, mín 1 char) que llama a `/api/owners?q=&limit=5`. Al seleccionar un owner llama `onConfirm({ id })`. `mode='new'`: campos nombre (req), teléfono, email. Al guardar llama `onConfirm({ full_name, phone?, email? })`. Link "Guardar sin dueño" llama `onConfirm(null)`. La búsqueda precarga 5 owners al primer focus.

- [ ] **Step 1: Crea el componente**

```typescript
// veterinaias/components/medical-records/OwnerResolutionModal.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Search, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WalkInOwnerValue } from '@/lib/validations/medical-record'

interface Owner { id: string; full_name: string; phone: string | null }

interface OwnerResolutionModalProps {
  isOpen: boolean
  onConfirm: (owner: WalkInOwnerValue) => void
  onClose: () => void
  isSubmitting: boolean
}

export function OwnerResolutionModal({ isOpen, onConfirm, onClose, isSubmitting }: OwnerResolutionModalProps) {
  const [mode, setMode] = useState<'search' | 'new'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Owner[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [nameError, setNameError] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const preloadedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      setQuery(''); setResults([]); setMode('search')
      setNewName(''); setNewPhone(''); setNewEmail(''); setNameError('')
      preloadedRef.current = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || query.length < 1) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setIsSearching(true)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/owners?q=${encodeURIComponent(query)}&limit=5`)
        .then(r => r.json())
        .then(json => setResults(json.data ?? []))
        .catch(() => {})
        .finally(() => setIsSearching(false))
    }, 150)
  }, [query, isOpen])

  function preload() {
    if (preloadedRef.current || query.length > 0) return
    preloadedRef.current = true
    fetch('/api/owners?limit=5')
      .then(r => r.json())
      .then(json => setResults(json.data ?? []))
      .catch(() => {})
  }

  function handleNewSubmit() {
    if (!newName.trim()) { setNameError('Nombre es requerido'); return }
    setNameError('')
    onConfirm({ full_name: newName.trim(), phone: newPhone || undefined, email: newEmail || undefined })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Finalizar consulta</p>
            <h2 className="text-lg font-semibold text-foreground mt-0.5">¿A quién le pertenece?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border mx-6">
          <button
            type="button"
            onClick={() => setMode('search')}
            className={`flex-1 pb-2 text-xs font-medium transition-colors ${mode === 'search' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            Buscar existente
          </button>
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`flex-1 pb-2 text-xs font-medium transition-colors ${mode === 'new' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            Registrar nuevo
          </button>
        </div>

        <div className="px-6 py-5">
          {mode === 'search' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={preload}
                  placeholder="Nombre o teléfono..."
                  className="pl-9"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {results.map(owner => (
                  <button
                    key={owner.id}
                    type="button"
                    onClick={() => onConfirm({ id: owner.id })}
                    disabled={isSubmitting}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{owner.full_name}</p>
                    {owner.phone && <p className="text-xs text-muted-foreground">{owner.phone}</p>}
                  </button>
                ))}
                {results.length === 0 && !isSearching && query.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Sin resultados</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMode('new')}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline w-full justify-center"
              >
                <UserPlus size={12} />
                No está en la lista — registrar nuevo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="new_owner_name">Nombre <span className="text-destructive">*</span></Label>
                <Input
                  id="new_owner_name"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setNameError('') }}
                  placeholder="Nombre completo del dueño"
                  autoFocus
                />
                {nameError && <p className="text-destructive text-xs">{nameError}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="new_owner_phone">Teléfono</Label>
                <Input
                  id="new_owner_phone"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="55-1234-5678"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new_owner_email">Email</Label>
                <Input
                  id="new_owner_email"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <Button
                className="w-full mt-1"
                onClick={handleNewSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar y finalizar'}
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-center">
          <button
            type="button"
            onClick={() => onConfirm(null)}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            Guardar sin dueño por ahora
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifica que compila**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep "OwnerResolutionModal"
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/medical-records/OwnerResolutionModal.tsx
git commit -m "feat: OwnerResolutionModal — search/create/skip owner at end of walk-in"
```

---

### Task 5: WalkInConsultationPage component

**Files:**
- Create: `veterinaias/components/medical-records/WalkInConsultationPage.tsx`

**Contexto:** Client component orquestador. Muestra `WalkInPetForm` primero. Cuando `petValues.name` y `petValues.species_id` tienen valor, el formulario clínico aparece automáticamente debajo (sin botón intermedio). El botón "Finalizar consulta" valida los campos clínicos via `handleSubmit`, guarda los valores en un ref, y abre `OwnerResolutionModal`. Al resolver el owner, llama `POST /api/consultations/walk-in` y redirige a `/dashboard/pets/[petId]/records/[recordId]`.

Los campos clínicos usan `react-hook-form` con `walkInRecordSchema`. Las recetas usan `useFieldArray` con ese mismo control. `PrescriptionsFields` requiere `Control<MedicalRecordFormValues>` pero walk-in usa `Control<WalkInRecordValues>` — son tipos compatibles en estructura, se castea con `as any`.

- [ ] **Step 1: Crea el componente**

```typescript
// veterinaias/components/medical-records/WalkInConsultationPage.tsx
'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/ui/form-section'
import { PrescriptionsFields } from './PrescriptionsFields'
import { WalkInPetForm } from './WalkInPetForm'
import { OwnerResolutionModal } from './OwnerResolutionModal'
import {
  walkInRecordSchema,
  type WalkInPetValues,
  type WalkInRecordValues,
  type WalkInOwnerValue,
} from '@/lib/validations/medical-record'

const TEXTAREA_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground'

const DEFAULT_PET: WalkInPetValues = {
  name: '',
  species_id: '',
  sex: 'unknown',
}

export function WalkInConsultationPage() {
  const router = useRouter()
  const [petValues, setPetValues] = useState<WalkInPetValues>(DEFAULT_PET)
  const [petErrors, setPetErrors] = useState<Partial<Record<keyof WalkInPetValues, string>>>({})
  const [showPrescriptions, setShowPrescriptions] = useState(false)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pendingRecordRef = useRef<WalkInRecordValues | null>(null)

  const petReady = petValues.name.trim().length > 0 && petValues.species_id.length > 0

  const { register, handleSubmit, control, formState: { errors } } = useForm<WalkInRecordValues>({
    resolver: zodResolver(walkInRecordSchema) as any,
    defaultValues: { prescriptions: [] },
  })

  function validatePet(): boolean {
    const errs: Partial<Record<keyof WalkInPetValues, string>> = {}
    if (!petValues.name.trim()) errs.name = 'Nombre es requerido'
    if (!petValues.species_id) errs.species_id = 'Especie es requerida'
    setPetErrors(errs)
    return Object.keys(errs).length === 0
  }

  function onRecordValid(recordValues: WalkInRecordValues) {
    if (!validatePet()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    pendingRecordRef.current = recordValues
    setOwnerModalOpen(true)
  }

  async function handleOwnerResolved(owner: WalkInOwnerValue) {
    const record = pendingRecordRef.current
    if (!record) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/consultations/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet: petValues, record, owner }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Error al guardar la consulta')
        return
      }
      setOwnerModalOpen(false)
      router.push(`/dashboard/pets/${json.petId}/records/${json.recordId}`)
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">Nueva consulta</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Este registro será <strong>inmutable</strong> una vez guardado. Verifica la información antes de continuar.
        </p>

        <WalkInPetForm
          values={petValues}
          onChange={setPetValues}
          errors={petErrors}
        />

        {petReady && (
          <form onSubmit={handleSubmit(onRecordValid)} className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              <FormSection title="Triaje">
                <div className="space-y-1">
                  <Label htmlFor="reason">Motivo de consulta <span className="text-destructive">*</span></Label>
                  <Input
                    id="reason"
                    {...register('reason')}
                    placeholder="Ej. Control de vacunas, pérdida de apetito..."
                  />
                  {errors.reason && <p className="text-destructive text-xs mt-1">{errors.reason.message}</p>}
                </div>
                <div className="grid grid-cols-4 gap-3 mt-4">
                  <div className="space-y-1">
                    <Label htmlFor="weight_kg">Peso (kg)</Label>
                    <Input id="weight_kg" type="number" step="0.01" placeholder="0.0"
                      {...register('weight_kg', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="temperature_celsius">Temp (°C)</Label>
                    <Input id="temperature_celsius" type="number" step="0.1" placeholder="38.5"
                      {...register('temperature_celsius', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="heart_rate_bpm">FC (lpm)</Label>
                    <Input id="heart_rate_bpm" type="number" placeholder="80"
                      {...register('heart_rate_bpm', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="respiratory_rate_bpm">FR (rpm)</Label>
                    <Input id="respiratory_rate_bpm" type="number" placeholder="20"
                      {...register('respiratory_rate_bpm', { valueAsNumber: true })} />
                  </div>
                </div>
              </FormSection>

              <FormSection title="Evaluación">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="diagnosis">Diagnóstico</Label>
                    <textarea id="diagnosis" {...register('diagnosis')} rows={4}
                      className={TEXTAREA_CLASS} placeholder="Cuadro clínico observado..." />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="treatment">Tratamiento</Label>
                    <textarea id="treatment" {...register('treatment')} rows={4}
                      className={TEXTAREA_CLASS} placeholder="Procedimientos realizados o indicados..." />
                  </div>
                </div>
                <div className="space-y-1 mt-4">
                  <Label htmlFor="notes">Notas internas</Label>
                  <textarea id="notes" {...register('notes')} rows={2}
                    className={TEXTAREA_CLASS} placeholder="Notas confidenciales para el equipo..." />
                </div>
              </FormSection>

              <FormSection title="Recetas">
                {!showPrescriptions ? (
                  <button
                    type="button"
                    onClick={() => setShowPrescriptions(true)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={14} />
                    Agregar receta
                  </button>
                ) : (
                  <PrescriptionsFields control={control as any} />
                )}
              </FormSection>

              <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  Finalizar consulta
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      <OwnerResolutionModal
        isOpen={ownerModalOpen}
        onConfirm={handleOwnerResolved}
        onClose={() => setOwnerModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </>
  )
}
```

- [ ] **Step 2: Verifica que compila**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep "WalkInConsultationPage"
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/medical-records/WalkInConsultationPage.tsx
git commit -m "feat: WalkInConsultationPage — orchestrates walk-in consultation flow"
```

---

### Task 6: Page route

**Files:**
- Create: `veterinaias/app/dashboard/records/new/page.tsx`

**Contexto:** Server component simple. Renderiza `WalkInConsultationPage`. Esta ruta solo maneja el caso sin petId — el caso con petId sigue en `/dashboard/pets/[petId]/records/new` sin cambios.

- [ ] **Step 1: Crea el archivo**

```typescript
// veterinaias/app/dashboard/records/new/page.tsx
import { WalkInConsultationPage } from '@/components/medical-records/WalkInConsultationPage'

export default function NewWalkInConsultationPage() {
  return <WalkInConsultationPage />
}
```

- [ ] **Step 2: Verifica que la ruta responde**

Inicia el dev server si no está corriendo:

```bash
cd veterinaias && npm run dev
```

Navega a `http://localhost:3000/dashboard/records/new`.  
Expected: página con título "Nueva consulta" y el formulario de mascota visible.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/dashboard/records/new/page.tsx
git commit -m "feat: /dashboard/records/new — walk-in consultation route"
```

---

### Task 7: Actualizar link en dashboard

**Files:**
- Modify: `veterinaias/components/dashboard/DashboardTwoColumn.tsx`

**Contexto:** El botón "Consulta sin cita" actualmente apunta a `/dashboard/pets`. Debe apuntar a `/dashboard/records/new`.

- [ ] **Step 1: Cambia el href**

En `DashboardTwoColumn.tsx`, busca el Link con href `/dashboard/pets` que tiene el ícono `Stethoscope` y cambia solo el href:

```typescript
// Antes
href="/dashboard/pets"

// Después  
href="/dashboard/records/new"
```

La línea a modificar es la del Link con `<Stethoscope size={17} .../>` en la sección de CTA cards.

- [ ] **Step 2: Verifica que compila**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | grep -v "appointments/new/page"
```

Expected: sin errores.

- [ ] **Step 3: Smoke test manual**

1. Navega al dashboard (`/dashboard`)
2. Click "Consulta sin cita"
3. Expected: llega a `/dashboard/records/new` con el formulario de mascota
4. Llena nombre ("Luna") y especie ("Perro")
5. Expected: formulario clínico aparece debajo automáticamente
6. Llena motivo de consulta
7. Click "Finalizar consulta"
8. Expected: modal de dueño se abre con tabs "Buscar existente" / "Registrar nuevo"
9. Click "Guardar sin dueño por ahora"
10. Expected: redirige a `/dashboard/pets/[petId]/records/[recordId]`

- [ ] **Step 4: Commit**

```bash
git add veterinaias/components/dashboard/DashboardTwoColumn.tsx
git commit -m "feat: update 'Consulta sin cita' button to point to /dashboard/records/new"
```

---

## Self-Review

**Spec coverage:**
- ✅ `/dashboard/records/new` sin petId → modo walk-in (Task 6)
- ✅ Formulario de mascota inline (Task 3, 5)
- ✅ Formulario clínico aparece cuando nombre + especie tienen valor (Task 5)
- ✅ Modal de dueño al guardar (Task 4, 5)
- ✅ Buscar dueño existente por nombre/teléfono (Task 4)
- ✅ Crear dueño nuevo (Task 4)
- ✅ Guardar sin dueño → placeholder (Task 2)
- ✅ Transacción con rollback manual (Task 2)
- ✅ Redirección a detalle del expediente (Task 5)
- ✅ Actualizar link del dashboard (Task 7)

**Type consistency:**
- `WalkInPetValues`, `WalkInRecordValues`, `WalkInOwnerValue` definidos en Task 1, usados en Tasks 3, 4, 5.
- `onConfirm(owner: WalkInOwnerValue)` en `OwnerResolutionModal` — coincide con lo que `WalkInConsultationPage` pasa como `handleOwnerResolved`.
- `POST /api/consultations/walk-in` devuelve `{ petId, recordId }` — coincide con lo que `WalkInConsultationPage` usa para el redirect.
