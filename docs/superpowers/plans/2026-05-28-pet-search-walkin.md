# Pet Search en Walk-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When typing a pet's name in the Nueva Consulta form, show matching existing patients with autocomplete so staff can load a known pet instead of registering a duplicate.

**Architecture:** A `PetSearchCombobox` component replaces the plain name `Input` in `WalkInPetForm`. When a result is selected, `WalkInConsultationPage` switches from the new-pet form to a `PetBanner` + skips `OwnerResolutionModal`, sending `{ existingPetId, record }` to the walk-in API. The API gains a second code path that creates only the medical record for an existing pet. If no result is selected, the entire existing flow is unchanged.

**Tech Stack:** Next.js 15 App Router, TypeScript, Zod, Supabase, Tailwind CSS. Search hits `GET /api/pets/search-cross-tenant?name=` (already exists). No new migrations needed.

---

## Context for the implementer

### Key files (read before coding)

| File | Role |
|------|------|
| `veterinaias/components/medical-records/WalkInConsultationPage.tsx` | Orchestrates the entire walk-in flow |
| `veterinaias/components/medical-records/WalkInPetForm.tsx` | Pet data form section — name field lives here |
| `veterinaias/components/medical-records/PetBanner.tsx` | Already-built banner showing pet info (reuse as-is) |
| `veterinaias/app/api/consultations/walk-in/route.ts` | Walk-in POST endpoint |
| `veterinaias/app/api/pets/search-cross-tenant/route.ts` | Search GET endpoint |
| `veterinaias/lib/validations/medical-record.ts` | Zod schemas |
| `veterinaias/components/ui/breed-combobox.tsx` | Reference for local combobox/dropdown pattern |

### Search API

```
GET /api/pets/search-cross-tenant?name=Luna
```
Returns `{ data: PetSearchResult[] }`. The underlying Supabase RPC (`search_pets_cross_tenant`) filters by `tenant_id`, so only pets previously registered at this clinic appear. Response shape:
```typescript
interface PetSearchResult {
  pet_id:       string        // UUID
  pet_name:     string
  species_name: string
  breed_name:   string | null
  owner_id:     string        // UUID
  owner_name:   string
  owner_phone:  string | null
}
```

### Walk-in API (current behavior)
POST body: `{ pet: WalkInPetValues, record: WalkInRecordValues, owner: WalkInOwnerValue }`.  
Always creates a new pet, resolves/creates owner, creates `pet_registration`, creates `medical_record`.  
Response: `{ petId, recordId }`.

### Walk-in API (new behavior when existingPetId present)
POST body: `{ existingPetId: uuid, record: WalkInRecordValues }`.  
Only creates the `medical_record` (pet and owner already exist).  
Same response shape: `{ petId, recordId }`.

### Component relationships

```
WalkInConsultationPage          ← orchestrator, owns selectedPet state
  └─ WalkInPetForm              ← shown only when selectedPet is null
       └─ PetSearchCombobox     ← new: name input + async dropdown
  └─ PetBanner                  ← shown when selectedPet is not null
  └─ <form>                     ← medical record (shown when petReady)
  └─ OwnerResolutionModal       ← shown only for NEW pets
```

### IMPORTANT: skip tests
User has explicitly requested to skip writing and running tests for this feature. Do NOT include test steps. Still verify with `npm run build` after each task.

---

## File Map

### New
```
veterinaias/components/medical-records/PetSearchCombobox.tsx
```

### Modified
```
veterinaias/lib/validations/medical-record.ts
veterinaias/app/api/consultations/walk-in/route.ts
veterinaias/components/medical-records/WalkInPetForm.tsx
veterinaias/components/medical-records/WalkInConsultationPage.tsx
```

---

## Task 1: Extend validation schema for existing-pet walk-in

**Files:**
- Modify: `veterinaias/lib/validations/medical-record.ts`

- [ ] **Step 1: Add the new schema and type after the existing `walkInConsultationSchema`**

Open `lib/validations/medical-record.ts` and add after line 93 (`export type WalkInConsultationValues ...`):

```typescript
export const walkInConsultationExistingPetSchema = z.object({
  existingPetId: z.string().uuid('Pet ID inválido'),
  record: walkInRecordSchema,
})

export type WalkInConsultationExistingPetValues = z.infer<typeof walkInConsultationExistingPetSchema>
```

- [ ] **Step 2: Verify the build**

```bash
cd veterinaias && npm run build 2>&1 | grep -E "(error|Error|✓)" | head -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add veterinaias/lib/validations/medical-record.ts
git commit -m "feat: add walkInConsultationExistingPetSchema for existing-pet walk-in path"
```

---

## Task 2: Extend walk-in API for existing-pet path

**Files:**
- Modify: `veterinaias/app/api/consultations/walk-in/route.ts`

The current POST handler always creates a new pet. We add a new early branch: if `existingPetId` is in the body, validate with the new schema, verify the pet exists, create only the medical record (+ prescriptions), and return.

- [ ] **Step 1: Replace the full content of `route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  walkInConsultationSchema,
  walkInConsultationExistingPetSchema,
} from '@/lib/validations/medical-record'

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

  // ── Existing-pet path ────────────────────────────────────────────────────
  if (body !== null && typeof body === 'object' && 'existingPetId' in body) {
    const result = walkInConsultationExistingPetSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
    }

    const { existingPetId, record: recordData } = result.data

    // Verify pet exists
    const { data: petCheck, error: petCheckError } = await supabase
      .from('pets')
      .select('id')
      .eq('id', existingPetId)
      .single()

    if (petCheckError || !petCheck) {
      return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
    }

    const { prescriptions, weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm, ...rest } = recordData

    const { data: record, error: recordError } = await supabase
      .from('medical_records')
      .insert({
        ...rest,
        pet_id: existingPetId,
        weight_kg: weight_kg ?? null,
        temperature_celsius: temperature_celsius ?? null,
        heart_rate_bpm: heart_rate_bpm ?? null,
        respiratory_rate_bpm: respiratory_rate_bpm ?? null,
        tenant_id: profile.tenant_id,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (recordError) return NextResponse.json({ error: 'Error al crear la consulta' }, { status: 500 })

    if (prescriptions && prescriptions.length > 0) {
      const { error: presError } = await supabase
        .from('prescriptions')
        .insert(prescriptions.map(p => ({ ...p, medical_record_id: record.id })))

      if (presError) {
        await supabase.from('medical_records').delete().eq('id', record.id)
        return NextResponse.json({ error: 'Error al guardar las recetas' }, { status: 500 })
      }
    }

    return NextResponse.json({ petId: existingPetId, recordId: record.id }, { status: 201 })
  }

  // ── New-pet path (existing behavior unchanged) ───────────────────────────
  const result = walkInConsultationSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })
  }

  const { pet: petData, record: recordData, owner: ownerInput } = result.data

  // Step 1: Create pet
  const { data: pet, error: petError } = await (supabase.from('pets') as any)
    .insert({
      name: petData.name,
      species_id: petData.species_id,
      breed: petData.breed ?? null,
      sex: petData.sex,
      date_of_birth: petData.date_of_birth ?? null,
    })
    .select('id')
    .single()

  if (petError) return NextResponse.json({ error: 'Error al crear la mascota' }, { status: 500 })

  const petId = pet.id
  let ownerWasCreated = false

  // Step 2: Resolve owner
  let ownerId: string

  if (ownerInput === null) {
    const { data: placeholder, error: placeholderError } = await (supabase.from('owners') as any)
      .insert({ full_name: 'Sin registrar', tenant_id: profile.tenant_id })
      .select('id')
      .single()

    if (placeholderError) {
      await supabase.from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al crear dueño temporal' }, { status: 500 })
    }
    ownerId = placeholder.id
    ownerWasCreated = true
  } else if ('id' in ownerInput) {
    const { data: ownerCheck } = await (supabase.from('owners') as any)
      .select('id')
      .eq('id', ownerInput.id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!ownerCheck) {
      await supabase.from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Dueño no encontrado' }, { status: 404 })
    }
    ownerId = ownerInput.id
  } else {
    const { data: newOwner, error: ownerError } = await (supabase.from('owners') as any)
      .insert({
        full_name: ownerInput.full_name,
        phone: ownerInput.phone ?? null,
        email: ownerInput.email ?? null,
        tenant_id: profile.tenant_id,
      })
      .select('id')
      .single()

    if (ownerError) {
      await supabase.from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al crear el dueño' }, { status: 500 })
    }
    ownerId = newOwner.id
    ownerWasCreated = true
  }

  // Step 3: Create pet_registration
  const { error: regError } = await (supabase.from('pet_registrations') as any)
    .insert({ tenant_id: profile.tenant_id, pet_id: petId, owner_id: ownerId })

  if (regError) {
    if (ownerWasCreated) await (supabase.from('owners') as any).delete().eq('id', ownerId)
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
    if (ownerWasCreated) await (supabase.from('owners') as any).delete().eq('id', ownerId)
    await supabase.from('pets').delete().eq('id', petId)
    return NextResponse.json({ error: 'Error al crear la consulta' }, { status: 500 })
  }

  if (prescriptions && prescriptions.length > 0) {
    const { error: presError } = await supabase
      .from('prescriptions')
      .insert(prescriptions.map(p => ({ ...p, medical_record_id: record.id })))

    if (presError) {
      await supabase.from('medical_records').delete().eq('id', record.id)
      await (supabase.from('pet_registrations') as any).delete().eq('pet_id', petId)
      if (ownerWasCreated) await (supabase.from('owners') as any).delete().eq('id', ownerId)
      await supabase.from('pets').delete().eq('id', petId)
      return NextResponse.json({ error: 'Error al guardar las recetas' }, { status: 500 })
    }
  }

  return NextResponse.json({ petId, recordId: record.id }, { status: 201 })
}
```

- [ ] **Step 2: Verify the build**

```bash
cd veterinaias && npm run build 2>&1 | grep -E "(error|Error|✓)" | head -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/api/consultations/walk-in/route.ts
git commit -m "feat: add existing-pet path to walk-in API — creates only medical_record when existingPetId provided"
```

---

## Task 3: PetSearchCombobox component

**Files:**
- Create: `veterinaias/components/medical-records/PetSearchCombobox.tsx`

This component renders a text input that searches for existing pets as the user types (debounced 300ms, minimum 2 characters). When a result is selected, it calls `onSelect(pet)` and the parent unmounts this component. Uses `AbortController` to cancel stale requests.

- [ ] **Step 1: Create the file**

```typescript
'use client'
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

export interface PetSearchResult {
  pet_id:       string
  pet_name:     string
  species_name: string
  breed_name:   string | null
  owner_name:   string
  owner_phone:  string | null
}

interface PetSearchComboboxProps {
  value: string
  onChange: (name: string) => void
  onSelect: (pet: PetSearchResult) => void
  error?: string
  autoFocus?: boolean
}

export function PetSearchCombobox({
  value,
  onChange,
  onSelect,
  error,
  autoFocus,
}: PetSearchComboboxProps) {
  const [results, setResults] = useState<PetSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  function handleChange(name: string) {
    onChange(name)
    setHasSearched(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (name.trim().length < 2) {
      abortRef.current?.abort()
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      try {
        const res = await fetch(
          `/api/pets/search-cross-tenant?name=${encodeURIComponent(name.trim())}`,
          { signal: controller.signal }
        )
        if (!res.ok) return
        const json = await res.json()
        setResults(json.data ?? [])
        setOpen(true)
        setHasSearched(true)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleSelect(pet: PetSearchResult) {
    setOpen(false)
    setResults([])
    onSelect(pet)
  }

  const showNoResults = hasSearched && !loading && open && results.length === 0 && value.trim().length >= 2

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Ej. Luna, Rocky..."
        autoFocus={autoFocus}
        autoComplete="off"
      />

      {loading && (
        <p className="text-[11px] text-muted-foreground mt-1 animate-pulse">Buscando...</p>
      )}
      {error && !loading && (
        <p className="text-destructive text-xs mt-1">{error}</p>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-md max-h-60 overflow-y-auto">
          {results.slice(0, 6).map(pet => (
            <button
              key={pet.pet_id}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b border-border/40 last:border-b-0"
              onMouseDown={e => { e.preventDefault(); handleSelect(pet) }}
            >
              <p className="text-sm font-medium leading-tight">{pet.pet_name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {[pet.species_name, pet.breed_name].filter(Boolean).join(' · ')}
                {pet.owner_name ? ` — ${pet.owner_name}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}

      {showNoResults && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-md px-3 py-2.5">
          <p className="text-sm text-muted-foreground">
            No se encontraron resultados. Se registrará como nuevo paciente.
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the build**

```bash
cd veterinaias && npm run build 2>&1 | grep -E "(error|Error|✓)" | head -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/medical-records/PetSearchCombobox.tsx
git commit -m "feat: PetSearchCombobox — debounced async pet search with AbortController"
```

---

## Task 4: WalkInPetForm — replace name Input with PetSearchCombobox

**Files:**
- Modify: `veterinaias/components/medical-records/WalkInPetForm.tsx`

Add `onPetSelected` prop. Replace the plain `Input` for pet name with `PetSearchCombobox`. When a result is selected, call `onPetSelected(pet)` — the parent (`WalkInConsultationPage`) will unmount this form and show `PetBanner` instead.

- [ ] **Step 1: Update `WalkInPetForm.tsx`**

Replace the entire file content:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FormSection } from '@/components/ui/form-section'
import { BreedCombobox } from '@/components/ui/breed-combobox'
import { PetSearchCombobox, type PetSearchResult } from './PetSearchCombobox'
import type { WalkInPetValues } from '@/lib/validations/medical-record'

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

interface Species { id: string; name: string }

interface WalkInPetFormProps {
  values: WalkInPetValues
  onChange: (values: WalkInPetValues) => void
  errors?: Partial<Record<keyof WalkInPetValues, string>>
  onPetSelected: (pet: PetSearchResult) => void
}

export function WalkInPetForm({ values, onChange, errors, onPetSelected }: WalkInPetFormProps) {
  const [species, setSpecies] = useState<Species[]>([])
  const [breedSuggestions, setBreedSuggestions] = useState<string[]>([])
  const [dobOpen, setDobOpen] = useState(false)

  useEffect(() => {
    fetch('/api/species')
      .then(r => r.json())
      .then(json => setSpecies(json.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setBreedSuggestions([])
    if (!values.species_id) return
    fetch(`/api/species/${values.species_id}/breeds`)
      .then(r => r.json())
      .then(json => setBreedSuggestions((json.data ?? []).map((b: { name: string }) => b.name)))
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
            <PetSearchCombobox
              value={values.name}
              onChange={name => update({ name })}
              onSelect={onPetSelected}
              error={errors?.name}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label>
              Especie <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.species_id || ''}
              onValueChange={v => update({ species_id: v ?? '', breed: undefined })}
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

          <div className="space-y-1">
            <Label>Raza</Label>
            <BreedCombobox
              value={values.breed}
              onChange={breed => update({ breed })}
              suggestions={breedSuggestions}
              disabled={!values.species_id}
            />
          </div>

          <div className="space-y-1">
            <Label>Sexo</Label>
            <Select
              value={values.sex}
              onValueChange={v => update({ sex: v as WalkInPetValues['sex'] })}
              items={{ unknown: 'Desconocido', male: 'Macho', female: 'Hembra' }}
            >
              <SelectTrigger>
                <SelectValue>{SEX_LABELS[values.sex] ?? values.sex}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Macho</SelectItem>
                <SelectItem value="female">Hembra</SelectItem>
                <SelectItem value="unknown">Desconocido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Fecha de nacimiento</Label>
            <Popover open={dobOpen} onOpenChange={setDobOpen}>
              <PopoverTrigger
                className="flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground shadow-xs hover:bg-muted"
              >
                <CalendarIcon size={14} className="shrink-0 text-muted-foreground" />
                {values.date_of_birth
                  ? format(new Date(values.date_of_birth + 'T12:00:00'), 'd MMM yyyy', { locale: es })
                  : <span className="text-muted-foreground">Selecciona una fecha</span>
                }
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={values.date_of_birth ? new Date(values.date_of_birth + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    update({ date_of_birth: date ? format(date, 'yyyy-MM-dd') : undefined })
                    setDobOpen(false)
                  }}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </FormSection>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build**

```bash
cd veterinaias && npm run build 2>&1 | grep -E "(error|Error|✓)" | head -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/medical-records/WalkInPetForm.tsx
git commit -m "feat: replace name Input with PetSearchCombobox in WalkInPetForm"
```

---

## Task 5: WalkInConsultationPage — handle existing pet selection

**Files:**
- Modify: `veterinaias/components/medical-records/WalkInConsultationPage.tsx`

This is the orchestration change. Add `selectedPet` state. When set, show `PetBanner` (already built) instead of `WalkInPetForm`, and skip `OwnerResolutionModal` — submit directly with `{ existingPetId, record }`.

- [ ] **Step 1: Replace the entire file content**

```typescript
'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/ui/form-section'
import { PrescriptionsFields } from './PrescriptionsFields'
import { WalkInPetForm } from './WalkInPetForm'
import { PetBanner } from './PetBanner'
import { OwnerResolutionModal } from './OwnerResolutionModal'
import { type PetSearchResult } from './PetSearchCombobox'
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
  const [selectedPet, setSelectedPet] = useState<PetSearchResult | null>(null)
  const [showPrescriptions, setShowPrescriptions] = useState(false)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pendingRecordRef = useRef<{ record: WalkInRecordValues; pet: WalkInPetValues } | null>(null)

  const petReady = selectedPet !== null || (petValues.name.trim().length > 0 && petValues.species_id.length > 0)

  const { register, handleSubmit, control, formState: { errors } } = useForm<WalkInRecordValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  async function onRecordValid(recordValues: WalkInRecordValues) {
    // Existing-pet path: skip owner modal, submit directly
    if (selectedPet) {
      setIsSubmitting(true)
      try {
        const res = await fetch('/api/consultations/walk-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ existingPetId: selectedPet.pet_id, record: recordValues }),
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error ?? 'Error al guardar la consulta')
          return
        }
        router.push(`/dashboard/pets/${json.petId}/records/${json.recordId}`)
      } catch {
        toast.error('Error de red. Intenta de nuevo.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // New-pet path: validate pet form, open owner modal
    if (!validatePet()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    pendingRecordRef.current = { record: recordValues, pet: petValues }
    setOwnerModalOpen(true)
  }

  async function handleOwnerResolved(owner: WalkInOwnerValue) {
    const pending = pendingRecordRef.current
    if (!pending) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/consultations/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet: pending.pet, record: pending.record, owner }),
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

  function handleClearSelectedPet() {
    setSelectedPet(null)
    setPetValues(DEFAULT_PET)
    setPetErrors({})
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">Nueva consulta</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Este registro será <strong>inmutable</strong> una vez guardado. Verifica la información antes de continuar.
        </p>

        {/* Pet section: banner when existing pet selected, form otherwise */}
        {selectedPet ? (
          <div className="mb-5">
            <PetBanner
              name={selectedPet.pet_name}
              species={selectedPet.species_name}
              breed={selectedPet.breed_name}
              ownerName={selectedPet.owner_name}
            />
            <button
              type="button"
              onClick={handleClearSelectedPet}
              className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={12} />
              Cambiar mascota
            </button>
          </div>
        ) : (
          <WalkInPetForm
            values={petValues}
            onChange={setPetValues}
            errors={petErrors}
            onPetSelected={setSelectedPet}
          />
        )}

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
                    {errors.weight_kg && <p className="text-destructive text-xs mt-1">{errors.weight_kg.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="temperature_celsius">Temp (°C)</Label>
                    <Input id="temperature_celsius" type="number" step="0.1" placeholder="38.5"
                      {...register('temperature_celsius', { valueAsNumber: true })} />
                    {errors.temperature_celsius && <p className="text-destructive text-xs mt-1">{errors.temperature_celsius.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="heart_rate_bpm">FC (lpm)</Label>
                    <Input id="heart_rate_bpm" type="number" placeholder="80"
                      {...register('heart_rate_bpm', { valueAsNumber: true })} />
                    {errors.heart_rate_bpm && <p className="text-destructive text-xs mt-1">{errors.heart_rate_bpm.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="respiratory_rate_bpm">FR (rpm)</Label>
                    <Input id="respiratory_rate_bpm" type="number" placeholder="20"
                      {...register('respiratory_rate_bpm', { valueAsNumber: true })} />
                    {errors.respiratory_rate_bpm && <p className="text-destructive text-xs mt-1">{errors.respiratory_rate_bpm.message}</p>}
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
                <Button type="submit" disabled={isSubmitting || ownerModalOpen}>
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

- [ ] **Step 2: Verify the build**

```bash
cd veterinaias && npm run build 2>&1 | grep -E "(error|Error|✓)" | head -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/medical-records/WalkInConsultationPage.tsx
git commit -m "feat: load existing pet in walk-in — PetBanner on select, skip OwnerResolutionModal, direct API path"
```

---

## Self-Review

**Spec coverage:**
- ✅ Typing pet name triggers search → `PetSearchCombobox` (Task 3)
- ✅ Shows name, species, breed, owner name in results → dropdown rows in Task 3
- ✅ If match selected → load pet info (PetBanner), skip new-pet form → Task 5
- ✅ If no match → current flow unchanged → `WalkInPetForm` path in Task 5
- ✅ API handles existing pet without duplicating records → Task 2
- ✅ Validation schema for new body shape → Task 1

**Placeholder scan:** None found — all steps include complete code.

**Type consistency:**
- `PetSearchResult` defined in `PetSearchCombobox.tsx`, re-exported and used in `WalkInPetForm` and `WalkInConsultationPage`.
- `WalkInConsultationExistingPetValues` defined in `medical-record.ts`, used only in `route.ts`.
- `handleClearSelectedPet` called in JSX, defined in same file. ✅
