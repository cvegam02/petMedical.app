# Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las pantallas de formulario con el patrón B+C — secciones en card (izquierda) + panel contextual (derecha) — y unificar Input/Select al design system.

**Architecture:** Tres componentes de layout reutilizables (`FormSection`, `FormPageLayout`, `FormContextPanel`) aplicados a todos los formularios de dashboard. Los componentes base `Input` y `SelectTrigger` se ajustan para alinear altura (h-9) y radio (rounded-sm) con los botones. Los `<select>` nativos en `PetForm` y `AppointmentForm` se reemplazan por el componente `Select` existente.

**Tech Stack:** Next.js 14 App Router, React Hook Form, Tailwind CSS v4, base-ui/react, Vitest + @testing-library/react

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `components/ui/form-section.tsx` |
| Crear | `components/ui/form-page-layout.tsx` |
| Crear | `components/ui/form-context-panel.tsx` |
| Modificar | `components/ui/input.tsx` |
| Modificar | `components/ui/select.tsx` |
| Modificar | `components/owners/OwnerForm.tsx` |
| Modificar | `app/dashboard/owners/new/page.tsx` |
| Modificar | `app/dashboard/owners/[ownerId]/edit/page.tsx` |
| Modificar | `components/pets/PetForm.tsx` |
| Modificar | `app/dashboard/owners/[ownerId]/pets/new/page.tsx` |
| Modificar | `app/dashboard/pets/[petId]/edit/page.tsx` |
| Modificar | `components/appointments/AppointmentForm.tsx` |
| Modificar | `app/dashboard/appointments/new/page.tsx` |
| Modificar | `components/team/InviteUserForm.tsx` |
| Modificar | `components/auth/LoginForm.tsx` |
| Modificar | `components/auth/RegisterForm.tsx` |
| Modificar | `app/(auth)/login/page.tsx` |
| Modificar | `app/(auth)/register/page.tsx` |

---

## Task 1: Actualizar Input

**Files:**
- Modify: `components/ui/input.tsx`

- [ ] **Reemplazar el className del Input**

El cambio es: `h-8` → `h-9`, `rounded-lg` → `rounded-sm`, `ring-3` → `ring-2` (en focus-visible y aria-invalid), `file:h-6` → `file:h-7`.

```tsx
// components/ui/input.tsx
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-sm border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Verificar TypeScript**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Commit**

```bash
git add components/ui/input.tsx
git commit -m "design: input h-9, rounded-sm, ring-2 — align with button system"
```

---

## Task 2: Actualizar SelectTrigger

**Files:**
- Modify: `components/ui/select.tsx`

- [ ] **Actualizar SelectTrigger**

Cambios en la función `SelectTrigger`: `rounded-lg` → `rounded-sm`, `data-[size=default]:h-8` → `data-[size=default]:h-9`, `data-[size=sm]:h-7` → `data-[size=sm]:h-8`, `data-[size=sm]:rounded-[min(var(--radius-md),10px)]` → `data-[size=sm]:rounded-sm`, `ring-3` → `ring-2` (dos ocurrencias), `w-fit` → `w-full`.

Localiza la función `SelectTrigger` en `components/ui/select.tsx` y reemplaza su className:

```tsx
function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-1.5 rounded-sm border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 data-[size=sm]:rounded-sm *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}
```

- [ ] **Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Commit**

```bash
git add components/ui/select.tsx
git commit -m "design: select h-9, rounded-sm, w-full — align with input system"
```

---

## Task 3: Crear FormSection

**Files:**
- Create: `components/ui/form-section.tsx`
- Create: `__tests__/components/FormSection.test.tsx`

- [ ] **Escribir el test primero**

```tsx
// __tests__/components/FormSection.test.tsx
import { render, screen } from '@testing-library/react'
import { FormSection } from '@/components/ui/form-section'

describe('FormSection', () => {
  it('muestra el título de la sección', () => {
    render(<FormSection title="Identidad"><input /></FormSection>)
    expect(screen.getByText('Identidad')).toBeInTheDocument()
  })

  it('renderiza los children', () => {
    render(<FormSection title="Contacto"><span data-testid="child">hijo</span></FormSection>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
```

- [ ] **Correr el test — debe fallar**

```bash
npx vitest run __tests__/components/FormSection.test.tsx
```
Expected: FAIL — `Cannot find module '@/components/ui/form-section'`

- [ ] **Implementar FormSection**

```tsx
// components/ui/form-section.tsx
import { cn } from "@/lib/utils"

interface FormSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={cn("px-5 py-5", className)}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-primary/70 whitespace-nowrap">
          {title}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Correr el test — debe pasar**

```bash
npx vitest run __tests__/components/FormSection.test.tsx
```
Expected: PASS (2 tests)

- [ ] **Commit**

```bash
git add components/ui/form-section.tsx __tests__/components/FormSection.test.tsx
git commit -m "feat: FormSection component for form field grouping"
```

---

## Task 4: Crear FormPageLayout

**Files:**
- Create: `components/ui/form-page-layout.tsx`
- Create: `__tests__/components/FormPageLayout.test.tsx`

- [ ] **Escribir el test primero**

```tsx
// __tests__/components/FormPageLayout.test.tsx
import { render, screen } from '@testing-library/react'
import { FormPageLayout } from '@/components/ui/form-page-layout'

vi.mock('next/navigation', () => ({ useRouter: () => ({}) }))

describe('FormPageLayout', () => {
  it('muestra breadcrumb con backLabel y title', () => {
    render(
      <FormPageLayout backHref="/dashboard/owners" backLabel="Dueños" overline="Directorio" title="Nuevo dueño">
        <div>form</div>
      </FormPageLayout>
    )
    expect(screen.getByText('Dueños')).toBeInTheDocument()
    expect(screen.getAllByText('Nuevo dueño').length).toBeGreaterThanOrEqual(1)
  })

  it('muestra el overline', () => {
    render(
      <FormPageLayout backHref="/dashboard/owners" backLabel="Dueños" overline="Directorio" title="Nuevo dueño">
        <div>form</div>
      </FormPageLayout>
    )
    expect(screen.getByText('Directorio')).toBeInTheDocument()
  })

  it('renderiza el contextPanel cuando se pasa', () => {
    render(
      <FormPageLayout
        backHref="/dashboard/owners"
        backLabel="Dueños"
        overline="Directorio"
        title="Nuevo dueño"
        contextPanel={<div data-testid="panel">panel</div>}
      >
        <div>form</div>
      </FormPageLayout>
    )
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })
})
```

- [ ] **Correr el test — debe fallar**

```bash
npx vitest run __tests__/components/FormPageLayout.test.tsx
```
Expected: FAIL — `Cannot find module '@/components/ui/form-page-layout'`

- [ ] **Implementar FormPageLayout**

```tsx
// components/ui/form-page-layout.tsx
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormPageLayoutProps {
  backHref: string
  backLabel: string
  overline: string
  title: string
  contextPanel?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function FormPageLayout({
  backHref,
  backLabel,
  overline,
  title,
  contextPanel,
  children,
  className,
}: FormPageLayoutProps) {
  return (
    <div className={cn("max-w-5xl mx-auto pb-10", className)}>
      <div className="flex items-center gap-1.5 mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          {backLabel}
        </Link>
        <span className="text-muted-foreground/40 text-sm">/</span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">
            {overline}
          </p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>

      <div
        className={cn(
          contextPanel
            ? "grid grid-cols-1 lg:grid-cols-[1fr_256px] gap-8 items-start"
            : "max-w-2xl"
        )}
      >
        <div>{children}</div>
        {contextPanel}
      </div>
    </div>
  )
}
```

- [ ] **Correr el test — debe pasar**

```bash
npx vitest run __tests__/components/FormPageLayout.test.tsx
```
Expected: PASS (3 tests)

- [ ] **Commit**

```bash
git add components/ui/form-page-layout.tsx __tests__/components/FormPageLayout.test.tsx
git commit -m "feat: FormPageLayout component — breadcrumb + header + two-column grid"
```

---

## Task 5: Crear FormContextPanel

**Files:**
- Create: `components/ui/form-context-panel.tsx`

No necesita test (es solo un contenedor sin lógica).

- [ ] **Implementar FormContextPanel**

```tsx
// components/ui/form-context-panel.tsx
import { cn } from "@/lib/utils"

interface FormContextPanelProps {
  children: React.ReactNode
  className?: string
}

export function FormContextPanel({ children, className }: FormContextPanelProps) {
  return (
    <aside className={cn("space-y-4", className)}>
      {children}
    </aside>
  )
}

interface ContextCardProps {
  children: React.ReactNode
  className?: string
}

export function ContextCard({ children, className }: ContextCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-4 space-y-3 text-sm", className)}>
      {children}
    </div>
  )
}
```

- [ ] **Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Commit**

```bash
git add components/ui/form-context-panel.tsx
git commit -m "feat: FormContextPanel and ContextCard components"
```

---

## Task 6: Actualizar OwnerForm + páginas de owner

**Files:**
- Modify: `components/owners/OwnerForm.tsx`
- Modify: `app/dashboard/owners/new/page.tsx`
- Modify: `app/dashboard/owners/[ownerId]/edit/page.tsx`

- [ ] **Reescribir OwnerForm**

```tsx
// components/owners/OwnerForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ownerSchema, type OwnerFormValues } from '@/lib/validations/owner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/ui/form-section'

interface OwnerFormProps {
  defaultValues?: Partial<OwnerFormValues>
  ownerId?: string
}

export function OwnerForm({ defaultValues, ownerId }: OwnerFormProps) {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerSchema),
    defaultValues: defaultValues ?? {},
  })

  const onSubmit = async (values: OwnerFormValues) => {
    const url = ownerId ? `/api/owners/${ownerId}` : '/api/owners'
    const method = ownerId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    router.push(`/dashboard/owners/${ownerId ?? json.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <FormSection title="Identidad">
          <div className="space-y-1">
            <Label htmlFor="full_name">Nombre completo <span className="text-destructive">*</span></Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && <p className="text-destructive text-xs mt-1">{errors.full_name.message}</p>}
          </div>
        </FormSection>

        <FormSection title="Contacto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="phone">Teléfono <span className="text-destructive">*</span></Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>
          <div className="space-y-1 mt-4">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register('address')} />
          </div>
        </FormSection>

        <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : ownerId ? 'Guardar cambios' : 'Crear dueño'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Reescribir owners/new/page.tsx**

```tsx
// app/dashboard/owners/new/page.tsx
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { OwnerForm } from '@/components/owners/OwnerForm'

function OwnerNewContext() {
  return (
    <FormContextPanel>
      <ContextCard>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Campos requeridos</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
            <span className="text-destructive">*</span> Nombre
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
            <span className="text-destructive">*</span> Teléfono
          </span>
        </div>
      </ContextCard>
      <ContextCard>
        <p className="text-xs font-semibold text-foreground mb-2">Al crear el dueño</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-primary mt-0.5">→</span> Agregar sus mascotas al sistema
          </li>
          <li className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-primary mt-0.5">→</span> Agendar citas directamente
          </li>
          <li className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-primary mt-0.5">→</span> Registrar consultas y expediente clínico
          </li>
        </ul>
      </ContextCard>
    </FormContextPanel>
  )
}

export default function NewOwnerPage() {
  return (
    <FormPageLayout
      backHref="/dashboard/owners"
      backLabel="Dueños"
      overline="Directorio"
      title="Nuevo dueño"
      contextPanel={<OwnerNewContext />}
    >
      <OwnerForm />
    </FormPageLayout>
  )
}
```

- [ ] **Reescribir owners/[ownerId]/edit/page.tsx**

```tsx
// app/dashboard/owners/[ownerId]/edit/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { OwnerForm } from '@/components/owners/OwnerForm'

export default async function EditOwnerPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner, error } = await (supabase.from('owners') as any)
    .select('id, full_name, email, phone, address')
    .eq('id', ownerId)
    .single()

  if (error || !owner) notFound()

  return (
    <FormPageLayout
      backHref={`/dashboard/owners/${ownerId}`}
      backLabel={owner.full_name}
      overline="Directorio"
      title="Editar dueño"
      contextPanel={
        <FormContextPanel>
          <ContextCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Campos requeridos</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                <span className="text-destructive">*</span> Nombre
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                <span className="text-destructive">*</span> Teléfono
              </span>
            </div>
          </ContextCard>
        </FormContextPanel>
      }
    >
      <OwnerForm
        ownerId={owner.id}
        defaultValues={{
          full_name: owner.full_name,
          phone: owner.phone,
          email: owner.email ?? '',
          address: owner.address ?? '',
        }}
      />
    </FormPageLayout>
  )
}
```

- [ ] **Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Commit**

```bash
git add components/owners/OwnerForm.tsx app/dashboard/owners/new/page.tsx app/dashboard/owners/\[ownerId\]/edit/page.tsx
git commit -m "design: OwnerForm — B+C layout with FormSection and context panel"
```

---

## Task 7: Actualizar PetForm + páginas de mascota

**Files:**
- Modify: `components/pets/PetForm.tsx`
- Modify: `app/dashboard/owners/[ownerId]/pets/new/page.tsx`
- Modify: `app/dashboard/pets/[petId]/edit/page.tsx`

- [ ] **Reescribir PetForm**

Los `<select>` nativos se reemplazan por el componente `Select`. Se necesita `watch` para el valor de especie (ya existe), y `setValue` para los selects controlados.

```tsx
// components/pets/PetForm.tsx
'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { petSchema, type PetFormValues } from '@/lib/validations/pet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSection } from '@/components/ui/form-section'

interface Species { id: string; name: string }
interface Breed { id: string; name: string }

interface PetFormProps {
  ownerId: string
  petId?: string
  defaultValues?: Partial<PetFormValues>
}

export function PetForm({ ownerId, petId, defaultValues }: PetFormProps) {
  const router = useRouter()
  const [species, setSpecies] = useState<Species[]>([])
  const [breeds, setBreeds] = useState<Breed[]>([])

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<PetFormValues>({
    resolver: zodResolver(petSchema) as any,
    defaultValues: { ...defaultValues, owner_id: ownerId, sex: defaultValues?.sex ?? 'unknown' },
  })

  const selectedSpeciesId = watch('species_id')

  useEffect(() => {
    fetch('/api/species')
      .then(r => r.json())
      .then(j => setSpecies(j.data ?? []))
      .catch(() => setSpecies([]))
  }, [])

  useEffect(() => {
    if (!selectedSpeciesId) return
    fetch(`/api/species/${selectedSpeciesId}/breeds`)
      .then(r => r.json())
      .then(j => setBreeds(j.data ?? []))
      .catch(() => setBreeds([]))
  }, [selectedSpeciesId])

  const onSubmit = async (values: PetFormValues) => {
    const url = petId ? `/api/pets/${petId}` : '/api/pets'
    const method = petId ? 'PATCH' : 'POST'
    const payload = petId ? (() => { const { owner_id, ...rest } = values; return rest })() : values
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    router.push(`/dashboard/owners/${ownerId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register('owner_id')} />
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <FormSection title="Paciente">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Especie <span className="text-destructive">*</span></Label>
              <Select
                value={watch('species_id') || ''}
                onValueChange={(v) => { setValue('species_id', v); setValue('breed_id', undefined as any) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar especie" />
                </SelectTrigger>
                <SelectContent>
                  {species.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.species_id && <p className="text-destructive text-xs mt-1">{errors.species_id.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {breeds.length > 0 && (
              <div className="space-y-1">
                <Label>Raza</Label>
                <Select
                  value={watch('breed_id') || ''}
                  onValueChange={(v) => setValue('breed_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    {breeds.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Sexo <span className="text-destructive">*</span></Label>
              <Select
                value={watch('sex') || 'unknown'}
                onValueChange={(v) => setValue('sex', v as 'male' | 'female' | 'unknown')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Desconocido</SelectItem>
                  <SelectItem value="male">Macho</SelectItem>
                  <SelectItem value="female">Hembra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection title="Datos clínicos">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
              <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="color">Color</Label>
              <Input id="color" {...register('color')} placeholder="ej. café con blanco" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <Label htmlFor="microchip">Microchip</Label>
            <Input id="microchip" {...register('microchip')} />
          </div>
        </FormSection>

        <FormSection title="Notas">
          <div className="space-y-1">
            <Label htmlFor="notes">Notas internas</Label>
            <Input id="notes" {...register('notes')} placeholder="Alergias, temperamento, observaciones..." />
          </div>
        </FormSection>

        <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : petId ? 'Guardar cambios' : 'Agregar mascota'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Reescribir owners/[ownerId]/pets/new/page.tsx**

```tsx
// app/dashboard/owners/[ownerId]/pets/new/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { PetForm } from '@/components/pets/PetForm'

export default async function NewPetPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner } = await (supabase.from('owners') as any)
    .select('id, full_name')
    .eq('id', ownerId)
    .single()

  if (!owner) notFound()

  return (
    <FormPageLayout
      backHref={`/dashboard/owners/${ownerId}`}
      backLabel={owner.full_name}
      overline="Pacientes"
      title="Nueva mascota"
      contextPanel={
        <FormContextPanel>
          <ContextCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Responsable</p>
            <p className="text-sm font-semibold text-foreground mt-1">{owner.full_name}</p>
          </ContextCard>
          <ContextCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Campos requeridos</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                <span className="text-destructive">*</span> Nombre
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                <span className="text-destructive">*</span> Especie
              </span>
            </div>
          </ContextCard>
        </FormContextPanel>
      }
    >
      <PetForm ownerId={ownerId} />
    </FormPageLayout>
  )
}
```

- [ ] **Reescribir pets/[petId]/edit/page.tsx**

```tsx
// app/dashboard/pets/[petId]/edit/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { PetForm } from '@/components/pets/PetForm'

export default async function EditPetPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await (supabase.from('pets') as any)
    .select('id, name, owner_id, species_id, breed_id, sex, date_of_birth, color, microchip, notes, owner:owner_id(id, full_name)')
    .eq('id', petId)
    .single()

  if (error || !pet) notFound()

  const owner = pet.owner as any

  return (
    <FormPageLayout
      backHref={`/dashboard/pets/${petId}`}
      backLabel={pet.name}
      overline="Pacientes"
      title="Editar mascota"
      contextPanel={
        <FormContextPanel>
          <ContextCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Responsable</p>
            <p className="text-sm font-semibold text-foreground mt-1">{owner?.full_name ?? '—'}</p>
          </ContextCard>
        </FormContextPanel>
      }
    >
      <PetForm
        ownerId={pet.owner_id}
        petId={pet.id}
        defaultValues={{
          name: pet.name,
          species_id: pet.species_id,
          breed_id: pet.breed_id ?? undefined,
          sex: pet.sex as 'male' | 'female' | 'unknown',
          date_of_birth: pet.date_of_birth ?? undefined,
          color: pet.color ?? undefined,
          microchip: pet.microchip ?? undefined,
          notes: pet.notes ?? undefined,
        }}
      />
    </FormPageLayout>
  )
}
```

- [ ] **Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Commit**

```bash
git add components/pets/PetForm.tsx "app/dashboard/owners/[ownerId]/pets/new/page.tsx" "app/dashboard/pets/[petId]/edit/page.tsx"
git commit -m "design: PetForm — B+C layout, native selects → Select component"
```

---

## Task 8: Actualizar AppointmentForm + página

**Files:**
- Modify: `components/appointments/AppointmentForm.tsx`
- Modify: `app/dashboard/appointments/new/page.tsx`

- [ ] **Reescribir AppointmentForm**

Los `<select>` nativos de mascota, duración y asignar se reemplazan por el componente `Select`. El `<textarea>` recibe clases consistentes con Input. Se agregan `FormSection` para agrupar los campos.

```tsx
// components/appointments/AppointmentForm.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { appointmentFormSchema, type AppointmentFormValues } from '@/lib/validations/appointment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSection } from '@/components/ui/form-section'

interface TeamMember { id: string; full_name: string }

interface AppointmentFormProps {
  team: TeamMember[]
}

export function AppointmentForm({ team }: AppointmentFormProps) {
  const router = useRouter()
  const [ownerQuery, setOwnerQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; full_name: string } | null>(null)
  const [pets, setPets] = useState<{ id: string; name: string; species: { name: string } | null }[]>([])
  const [assignedTo, setAssignedTo] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema) as any,
    defaultValues: { duration_minutes: 30 },
  })

  useEffect(() => {
    if (ownerQuery.length < 2) { setOwnerResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/owners?q=${encodeURIComponent(ownerQuery)}`)
      const json = await res.json()
      setOwnerResults(json.data ?? [])
      setShowSuggestions(true)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [ownerQuery])

  useEffect(() => {
    if (!selectedOwner) { setPets([]); return }
    fetch(`/api/pets?ownerId=${selectedOwner.id}`)
      .then(r => r.json())
      .then(json => setPets(json.data ?? []))
      .catch(() => setPets([]))
  }, [selectedOwner])

  function selectOwner(owner: { id: string; full_name: string; phone: string | null }) {
    setSelectedOwner(owner)
    setOwnerQuery(owner.full_name)
    setShowSuggestions(false)
    setValue('owner_id', owner.id)
    setValue('pet_id', '')
  }

  const onSubmit = async (values: AppointmentFormValues) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          scheduled_at: new Date(values.scheduled_at).toISOString(),
          duration_minutes: Number(values.duration_minutes),
          ...(assignedTo ? { assigned_to: assignedTo } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      router.push(`/dashboard/appointments/${json.data.id}`)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register('owner_id')} />
      <input type="hidden" {...register('pet_id')} />

      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <FormSection title="Paciente">
          <div className="relative space-y-1">
            <Label htmlFor="owner_search">Dueño <span className="text-destructive">*</span></Label>
            <Input
              id="owner_search"
              value={ownerQuery}
              onChange={e => { setOwnerQuery(e.target.value); setSelectedOwner(null) }}
              onFocus={() => ownerResults.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Buscar por nombre, teléfono o email..."
              autoComplete="off"
            />
            {errors.owner_id && <p className="text-destructive text-xs mt-1">{errors.owner_id.message}</p>}
            {showSuggestions && ownerResults.length > 0 && (
              <ul className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                {ownerResults.map(o => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                      onMouseDown={() => selectOwner(o)}
                    >
                      <span className="font-medium">{o.full_name}</span>
                      {o.phone && <span className="text-muted-foreground ml-2">{o.phone}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1 mt-4">
            <Label>Mascota <span className="text-destructive">*</span></Label>
            <Select
              value={watch('pet_id') || ''}
              onValueChange={(v) => setValue('pet_id', v)}
              disabled={!selectedOwner || pets.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedOwner ? 'Selecciona un dueño primero'
                  : pets.length === 0 ? 'Este dueño no tiene mascotas'
                  : 'Selecciona una mascota'
                } />
              </SelectTrigger>
              <SelectContent>
                {pets.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.species ? ` (${p.species.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pet_id && <p className="text-destructive text-xs mt-1">{errors.pet_id.message}</p>}
          </div>
        </FormSection>

        <FormSection title="Horario">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="scheduled_at">Fecha y hora <span className="text-destructive">*</span></Label>
              <Input id="scheduled_at" type="datetime-local" {...register('scheduled_at')} />
              {errors.scheduled_at && <p className="text-destructive text-xs mt-1">{errors.scheduled_at.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Duración</Label>
              <Select
                value={String(watch('duration_minutes') || 30)}
                onValueChange={(v) => setValue('duration_minutes', Number(v) as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1.5 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection title="Detalles">
          <div className="space-y-1">
            <Label htmlFor="reason">Motivo de la cita</Label>
            <Input id="reason" {...register('reason')} placeholder="Ej. Consulta general, vacunación, cirugía..." />
          </div>
          {team.length > 0 && (
            <div className="space-y-1 mt-4">
              <Label>Asignar a</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {team.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1 mt-4">
            <Label htmlFor="notes">Notas internas</Label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={3}
              className="h-auto w-full min-w-0 rounded-sm border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none resize-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder="Observaciones para el equipo..."
            />
          </div>
        </FormSection>

        <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Crear cita'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Reescribir appointments/new/page.tsx**

El page actual tiene el breadcrumb y overline inline. Se migra todo a `FormPageLayout`.

```tsx
// app/dashboard/appointments/new/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'

function AppointmentContext() {
  return (
    <FormContextPanel>
      <ContextCard>
        <p className="text-xs font-semibold text-foreground mb-3">Flujo de la cita</p>
        <ol className="space-y-2">
          {[
            { n: 1, text: 'Crear cita', done: true },
            { n: 2, text: 'Confirmar con el dueño' },
            { n: 3, text: 'Registrar consulta' },
          ].map(step => (
            <li key={step.n} className="flex items-center gap-2.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border border-border'}`}>
                {step.n}
              </span>
              <span className={`text-xs ${step.done ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{step.text}</span>
            </li>
          ))}
        </ol>
      </ContextCard>
      <ContextCard>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Campos requeridos</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['Dueño', 'Mascota', 'Fecha y hora'].map(f => (
            <span key={f} className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
              <span className="text-destructive">*</span> {f}
            </span>
          ))}
        </div>
      </ContextCard>
    </FormContextPanel>
  )
}

export default async function NewAppointmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name')

  return (
    <FormPageLayout
      backHref="/dashboard/appointments"
      backLabel="Citas"
      overline="Agenda"
      title="Nueva cita"
      contextPanel={<AppointmentContext />}
    >
      <AppointmentForm team={(team as any[]) ?? []} />
    </FormPageLayout>
  )
}
```

- [ ] **Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Commit**

```bash
git add components/appointments/AppointmentForm.tsx app/dashboard/appointments/new/page.tsx
git commit -m "design: AppointmentForm — B+C layout, native selects → Select component"
```

---

## Task 9: Actualizar InviteUserForm

**Files:**
- Modify: `components/team/InviteUserForm.tsx`

Solo se agrega `FormSection` y se corrige el color del error (`text-red-500` → `text-destructive`). El Select ya usa el componente correcto.

- [ ] **Reescribir InviteUserForm**

```tsx
// components/team/InviteUserForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSection } from '@/components/ui/form-section'
import type { TenantType } from '@/lib/types/database'

const inviteSchema = z.object({
  email: z.string().email('Email invalido'),
  role: z.enum(['staff', 'doctor', 'assistant']),
})
type InviteInput = z.infer<typeof inviteSchema>

export function InviteUserForm({ tenantType, onSuccess }: { tenantType: TenantType; onSuccess?: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'staff' },
  })

  async function onSubmit(data: InviteInput) {
    setServerError(null)
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error); return }
    setSuccess(true)
    reset()
    onSuccess?.()
  }

  const roleOptions = tenantType === 'enterprise'
    ? [{ value: 'doctor', label: 'Doctor' }, { value: 'assistant', label: 'Asistente' }, { value: 'staff', label: 'Staff' }]
    : [{ value: 'staff', label: 'Staff' }]

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {success && (
        <p className="text-sm text-primary font-medium mb-4">Invitación enviada exitosamente.</p>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <FormSection title="Nuevo usuario">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="invite-email">Email del nuevo usuario</Label>
              <Input id="invite-email" type="email" placeholder="doctor@clinica.com" {...register('email')} />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select defaultValue="staff" onValueChange={(v) => setValue('role', v as InviteInput['role'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {serverError && <p className="text-destructive text-xs mt-3">{serverError}</p>}
        </FormSection>
        <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Invitando...' : 'Enviar invitación'}
          </Button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Commit**

```bash
git add components/team/InviteUserForm.tsx
git commit -m "design: InviteUserForm — FormSection wrapper, text-destructive tokens"
```

---

## Task 10: Corregir auth forms y páginas de auth

**Files:**
- Modify: `components/auth/LoginForm.tsx`
- Modify: `components/auth/RegisterForm.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/register/page.tsx`

Los tests existentes no deben romperse — solo cambian colores y tokens.

- [ ] **Correr los tests antes de cambiar (baseline)**

```bash
npx vitest run __tests__/auth/
```
Expected: PASS (todos los tests de auth pasan antes del cambio).

- [ ] **Actualizar LoginForm**

```tsx
// components/auth/LoginForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      setServerError('Credenciales invalidas. Verifica tu email y contrasena.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" aria-label="Email" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Contrasena</Label>
        <Input
          id="password"
          type="password"
          aria-label="Contrasena"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Iniciando sesion...' : 'Iniciar sesion'}
      </Button>
    </form>
  )
}
```

- [ ] **Actualizar RegisterForm**

```tsx
// components/auth/RegisterForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterInput) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    })
    if (error) {
      setServerError('No se pudo crear la cuenta. ' + error.message)
      return
    }
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" aria-label="Nombre completo" {...register('full_name')} />
        {errors.full_name && (
          <p className="text-sm text-destructive">{errors.full_name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" aria-label="Email" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Contrasena</Label>
        <Input
          id="password"
          type="password"
          aria-label="Contrasena"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>
    </form>
  )
}
```

- [ ] **Actualizar login/page.tsx**

```tsx
// app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">VeterinaIAs</p>
          <span className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Iniciar sesion</h1>
        <p className="text-sm text-muted-foreground mt-1">Ingresa tus credenciales para continuar</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <LoginForm />
        <p className="text-sm text-center mt-5 text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Actualizar register/page.tsx**

```tsx
// app/(auth)/register/page.tsx
import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">VeterinaIAs</p>
          <span className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground mt-1">Registra tu veterinaria o clinica</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <RegisterForm />
        <p className="text-sm text-center mt-5 text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Correr tests de auth — deben pasar**

```bash
npx vitest run __tests__/auth/
```
Expected: PASS (todos los tests de auth siguen pasando).

- [ ] **Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Commit final**

```bash
git add components/auth/LoginForm.tsx components/auth/RegisterForm.tsx "app/(auth)/login/page.tsx" "app/(auth)/register/page.tsx"
git commit -m "design: auth forms — text-destructive tokens, cleaner page layout"
```
