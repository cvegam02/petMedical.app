# Dashboard: Iniciar Consulta Directo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el dashboard para que un médico pueda iniciar una consulta en dos clicks: tarjeta hero "Siguiente consulta" con botón directo, y modal de acción rápida para las demás citas del día.

**Architecture:** Tres Client Components nuevos en `components/dashboard/`. `AppointmentQuickModal` es el componente raíz para la lista — gestiona el estado del modal internamente y recibe el array de citas desde el Server Component del dashboard. `NextAppointmentCard` es stateless (solo Link). El `dashboard/page.tsx` divide `todayAppointments` en `nextAppointment` + `otherAppointments` y pasa los datos a los componentes.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, shadcn/ui Button, Vitest + @testing-library/react, sonner (toast)

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `veterinaias/components/dashboard/DashboardAppointmentCard.tsx` | Exporta el tipo `DashboardAppointment` y el `<button>` card que llama `onSelect` |
| Crear | `veterinaias/components/dashboard/AppointmentQuickModal.tsx` | Importa `DashboardAppointment` y `DashboardAppointmentCard`; gestiona estado del modal, renderiza la lista |
| Crear | `veterinaias/components/dashboard/NextAppointmentCard.tsx` | Tarjeta hero con `<Link>` directo a records/new |
| Modificar | `veterinaias/app/dashboard/page.tsx` | Divide citas en next/other, usa los 3 componentes nuevos |
| Crear | `veterinaias/__tests__/components/dashboard/DashboardAppointmentCard.test.tsx` | Tests del card |
| Crear | `veterinaias/__tests__/components/dashboard/AppointmentQuickModal.test.tsx` | Tests del modal y lista |
| Crear | `veterinaias/__tests__/components/dashboard/NextAppointmentCard.test.tsx` | Tests del hero card |

---

## Task 1: DashboardAppointmentCard

**Files:**
- Create: `veterinaias/components/dashboard/DashboardAppointmentCard.tsx`
- Create: `veterinaias/__tests__/components/dashboard/DashboardAppointmentCard.test.tsx`

- [ ] **Step 1.1: Escribir el test**

Crear `veterinaias/__tests__/components/dashboard/DashboardAppointmentCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DashboardAppointmentCard } from '@/components/dashboard/DashboardAppointmentCard'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

const apt: DashboardAppointment = {
  id: 'apt-1',
  status: 'confirmed',
  scheduled_at: '2026-05-27T10:30:00.000Z',
  duration_minutes: 30,
  reason: 'Vacunación',
  pet: { id: 'pet-1', name: 'Luna', species: { name: 'Perro' } },
  owner: { id: 'owner-1', full_name: 'Carlos Mendoza', phone: '5551234567' },
  assigned_to_profile: null,
}

describe('DashboardAppointmentCard', () => {
  it('muestra el nombre de la mascota', () => {
    render(<DashboardAppointmentCard appointment={apt} onSelect={vi.fn()} />)
    expect(screen.getByText('Luna')).toBeInTheDocument()
  })

  it('muestra la especie', () => {
    render(<DashboardAppointmentCard appointment={apt} onSelect={vi.fn()} />)
    expect(screen.getByText('Perro')).toBeInTheDocument()
  })

  it('muestra el nombre del dueño', () => {
    render(<DashboardAppointmentCard appointment={apt} onSelect={vi.fn()} />)
    expect(screen.getByText(/Carlos Mendoza/)).toBeInTheDocument()
  })

  it('llama onSelect con el appointment al hacer click', async () => {
    const onSelect = vi.fn()
    render(<DashboardAppointmentCard appointment={apt} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(apt)
  })

  it('no tiene ningún elemento <a> (no navega)', () => {
    const { container } = render(<DashboardAppointmentCard appointment={apt} onSelect={vi.fn()} />)
    expect(container.querySelector('a')).toBeNull()
  })
})
```

- [ ] **Step 1.2: Ejecutar el test para verificar que falla**

```bash
cd veterinaias && npx vitest run __tests__/components/dashboard/DashboardAppointmentCard.test.tsx
```

Esperado: FAIL — "Cannot find module '@/components/dashboard/DashboardAppointmentCard'"

- [ ] **Step 1.3: Implementar el componente**

Crear `veterinaias/components/dashboard/DashboardAppointmentCard.tsx`:

```tsx
'use client'
import { Clock } from 'lucide-react'

export interface DashboardAppointment {
  id: string
  status: string
  scheduled_at: string
  duration_minutes: number
  reason: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
  assigned_to_profile: { full_name: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programada',     className: 'bg-muted text-muted-foreground border-border' },
  confirmed: { label: 'Confirmada',     className: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completada',     className: 'bg-primary/20 text-primary border-primary/30' },
  cancelled: { label: 'Cancelada',      className: 'bg-destructive/10 text-destructive border-destructive/20' },
  no_show:   { label: 'No se presentó', className: 'bg-orange-50 text-orange-600 border-orange-200' },
}

interface Props {
  appointment: DashboardAppointment
  onSelect: (apt: DashboardAppointment) => void
}

export function DashboardAppointmentCard({ appointment, onSelect }: Props) {
  const dateObj = new Date(appointment.scheduled_at)
  const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const date = dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
  const status = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.scheduled

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      className="w-full group flex items-center gap-4 bg-card rounded-xl border border-border px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all text-left"
    >
      <div className="flex flex-col items-center w-16 shrink-0 border-r border-border pr-4">
        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase leading-none mb-1">{date}</span>
        <span className="text-base font-semibold text-foreground leading-none">{time}</span>
        <span className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-0.5">
          <Clock size={9} />
          {appointment.duration_minutes}m
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-none">
          {appointment.pet?.name ?? '—'}
          {appointment.pet?.species && (
            <span className="text-muted-foreground/60 font-normal ml-2 text-[11px]">
              {appointment.pet.species.name}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {appointment.owner?.full_name ?? '—'}
          {appointment.reason ? ` · ${appointment.reason}` : ''}
        </p>
      </div>
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${status.className}`}>
        {status.label}
      </span>
    </button>
  )
}
```

- [ ] **Step 1.4: Ejecutar los tests para verificar que pasan**

```bash
cd veterinaias && npx vitest run __tests__/components/dashboard/DashboardAppointmentCard.test.tsx
```

Esperado: PASS — 5 tests passed

- [ ] **Step 1.5: Commit**

```bash
git add veterinaias/components/dashboard/DashboardAppointmentCard.tsx veterinaias/__tests__/components/dashboard/DashboardAppointmentCard.test.tsx
git commit -m "feat: DashboardAppointmentCard — button card que abre modal en dashboard"
```

---

## Task 2: AppointmentQuickModal

**Files:**
- Create: `veterinaias/components/dashboard/AppointmentQuickModal.tsx`
- Create: `veterinaias/__tests__/components/dashboard/AppointmentQuickModal.test.tsx`

> Nota: `DashboardAppointment` está definido en `DashboardAppointmentCard.tsx` (Task 1). Este archivo lo re-exporta para que el dashboard page pueda importar desde un solo lugar.

- [ ] **Step 2.1: Escribir los tests**

Crear `veterinaias/__tests__/components/dashboard/AppointmentQuickModal.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppointmentQuickModal } from '@/components/dashboard/AppointmentQuickModal'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const makeApt = (overrides: Partial<DashboardAppointment> = {}): DashboardAppointment => ({
  id: 'apt-1',
  status: 'confirmed',
  scheduled_at: '2026-05-27T10:30:00.000Z',
  duration_minutes: 30,
  reason: 'Vacunación',
  pet: { id: 'pet-1', name: 'Luna', species: { name: 'Perro' } },
  owner: { id: 'owner-1', full_name: 'Carlos Mendoza', phone: '5551234567' },
  assigned_to_profile: null,
  ...overrides,
})

describe('AppointmentQuickModal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }))
  })

  it('renderiza la lista de tarjetas', () => {
    const apts = [makeApt({ id: 'apt-1', pet: { id: 'p1', name: 'Luna', species: { name: 'Perro' } } }), makeApt({ id: 'apt-2', pet: { id: 'p2', name: 'Max', species: { name: 'Gato' } } })]
    render(<AppointmentQuickModal appointments={apts} />)
    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.getByText('Max')).toBeInTheDocument()
  })

  it('no muestra el modal si no se ha hecho click en ninguna tarjeta', () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abre el modal al hacer click en una tarjeta', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('el modal muestra el nombre de la mascota y el dueño', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Luna')
    expect(dialog).toHaveTextContent('Carlos Mendoza')
  })

  it('el modal muestra el motivo de consulta', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Vacunación')
  })

  it('el botón "Iniciar consulta" tiene el href correcto para cita confirmed', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    const link = screen.getByRole('link', { name: /iniciar consulta/i })
    expect(link).toHaveAttribute('href', '/dashboard/pets/pet-1/records/new?appointmentId=apt-1')
  })

  it('el botón "Iniciar consulta" aparece para cita scheduled', async () => {
    render(<AppointmentQuickModal appointments={[makeApt({ status: 'scheduled' })]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    expect(screen.getByRole('link', { name: /iniciar consulta/i })).toBeInTheDocument()
  })

  it('NO muestra acciones para cita en estado terminal (completed)', async () => {
    render(<AppointmentQuickModal appointments={[makeApt({ status: 'completed' })]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    expect(screen.queryByRole('link', { name: /iniciar consulta/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /no se presentó/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument()
  })

  it('"No se presentó" hace PATCH y cierra el modal', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    await userEvent.click(screen.getByRole('button', { name: /no se presentó/i }))
    expect(fetch).toHaveBeenCalledWith('/api/appointments/apt-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'no_show' }),
    }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('"Cancelar cita" hace PATCH y cierra el modal', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancelar cita/i }))
    expect(fetch).toHaveBeenCalledWith('/api/appointments/apt-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('el botón X cierra el modal', async () => {
    render(<AppointmentQuickModal appointments={[makeApt()]} />)
    await userEvent.click(screen.getByRole('button', { name: /luna/i }))
    await userEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2.2: Ejecutar los tests para verificar que fallan**

```bash
cd veterinaias && npx vitest run __tests__/components/dashboard/AppointmentQuickModal.test.tsx
```

Esperado: FAIL — "Cannot find module '@/components/dashboard/AppointmentQuickModal'"

- [ ] **Step 2.3: Implementar el componente**

Crear `veterinaias/components/dashboard/AppointmentQuickModal.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { X, Clock, Calendar, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { DashboardAppointmentCard } from './DashboardAppointmentCard'

import type { DashboardAppointment } from './DashboardAppointmentCard'
export type { DashboardAppointment }

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  confirmed:  'Confirmada',
  completed:  'Completada',
  cancelled:  'Cancelada',
  no_show:    'No se presentó',
}

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface Props {
  appointments: DashboardAppointment[]
}

export function AppointmentQuickModal({ appointments }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function transition(newStatus: string) {
    if (!selected) return
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      setSelected(null)
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  const isActive = selected ? ACTIVE_STATUSES.includes(selected.status) : false

  return (
    <>
      <div className="space-y-2">
        {appointments.map(apt => (
          <DashboardAppointmentCard key={apt.id} appointment={apt} onSelect={setSelected} />
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de cita"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Cita</p>
                <h2 className="text-lg font-semibold text-foreground mt-0.5">
                  {selected.pet?.name ?? '—'}
                  {selected.pet?.species && (
                    <span className="text-muted-foreground font-normal text-sm ml-2">{selected.pet.species.name}</span>
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Info */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar size={14} />
                <span className="capitalize">
                  {new Date(selected.scheduled_at).toLocaleDateString('es-MX', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={14} />
                <span>
                  {new Date(selected.scheduled_at).toLocaleTimeString('es-MX', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {' · '}{selected.duration_minutes} min
                </span>
              </div>
              {selected.owner && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{selected.owner.full_name}</span>
                  {selected.owner.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone size={11} />
                      {selected.owner.phone}
                    </span>
                  )}
                </div>
              )}
              {selected.reason && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Motivo:</span> {selected.reason}
                </p>
              )}
              <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                {STATUS_LABELS[selected.status] ?? selected.status}
              </span>
            </div>

            {/* Actions */}
            {isActive ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={`/dashboard/pets/${selected.pet?.id}/records/new?appointmentId=${selected.id}`}
                  className={buttonVariants({ size: 'sm' })}
                >
                  Iniciar consulta
                </Link>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => transition('no_show')}
                    disabled={loading === 'no_show'}
                    className="flex-1"
                  >
                    {loading === 'no_show' ? '...' : 'No se presentó'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => transition('cancelled')}
                    disabled={loading === 'cancelled'}
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    {loading === 'cancelled' ? '...' : 'Cancelar cita'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selected.status === 'completed' && 'Esta cita ya fue completada.'}
                {selected.status === 'cancelled' && 'Esta cita fue cancelada.'}
                {selected.status === 'no_show' && 'El paciente no se presentó.'}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2.4: Ejecutar los tests para verificar que pasan**

```bash
cd veterinaias && npx vitest run __tests__/components/dashboard/AppointmentQuickModal.test.tsx
```

Esperado: PASS — 11 tests passed

- [ ] **Step 2.5: Commit**

```bash
git add veterinaias/components/dashboard/AppointmentQuickModal.tsx veterinaias/__tests__/components/dashboard/AppointmentQuickModal.test.tsx
git commit -m "feat: AppointmentQuickModal — lista + modal de acción rápida para citas del dashboard"
```

---

## Task 3: NextAppointmentCard

**Files:**
- Create: `veterinaias/components/dashboard/NextAppointmentCard.tsx`
- Create: `veterinaias/__tests__/components/dashboard/NextAppointmentCard.test.tsx`

- [ ] **Step 3.1: Escribir los tests**

Crear `veterinaias/__tests__/components/dashboard/NextAppointmentCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NextAppointmentCard } from '@/components/dashboard/NextAppointmentCard'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

const apt: DashboardAppointment = {
  id: 'apt-1',
  status: 'confirmed',
  scheduled_at: '2026-05-27T10:30:00.000Z',
  duration_minutes: 30,
  reason: 'Vacunación anual',
  pet: { id: 'pet-1', name: 'Luna', species: { name: 'Perro' } },
  owner: { id: 'owner-1', full_name: 'Carlos Mendoza', phone: '5551234567' },
  assigned_to_profile: null,
}

describe('NextAppointmentCard', () => {
  it('muestra la etiqueta "Siguiente consulta"', () => {
    render(<NextAppointmentCard appointment={apt} />)
    expect(screen.getByText(/siguiente consulta/i)).toBeInTheDocument()
  })

  it('muestra el nombre de la mascota', () => {
    render(<NextAppointmentCard appointment={apt} />)
    expect(screen.getByText('Luna')).toBeInTheDocument()
  })

  it('muestra el nombre del dueño', () => {
    render(<NextAppointmentCard appointment={apt} />)
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument()
  })

  it('muestra el motivo de consulta', () => {
    render(<NextAppointmentCard appointment={apt} />)
    expect(screen.getByText(/vacunación anual/i)).toBeInTheDocument()
  })

  it('el botón "Iniciar consulta" lleva a records/new con appointmentId', () => {
    render(<NextAppointmentCard appointment={apt} />)
    const link = screen.getByRole('link', { name: /iniciar consulta/i })
    expect(link).toHaveAttribute('href', '/dashboard/pets/pet-1/records/new?appointmentId=apt-1')
  })

  it('funciona con cita scheduled', () => {
    render(<NextAppointmentCard appointment={{ ...apt, status: 'scheduled' }} />)
    expect(screen.getByRole('link', { name: /iniciar consulta/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3.2: Ejecutar los tests para verificar que fallan**

```bash
cd veterinaias && npx vitest run __tests__/components/dashboard/NextAppointmentCard.test.tsx
```

Esperado: FAIL — "Cannot find module '@/components/dashboard/NextAppointmentCard'"

- [ ] **Step 3.3: Implementar el componente**

Crear `veterinaias/components/dashboard/NextAppointmentCard.tsx`:

```tsx
import Link from 'next/link'
import { Clock, Calendar, ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { DashboardAppointment } from './DashboardAppointmentCard'

interface Props {
  appointment: DashboardAppointment
}

export function NextAppointmentCard({ appointment }: Props) {
  const time = new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })
  const date = new Date(appointment.scheduled_at).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">
            Siguiente consulta
          </p>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {appointment.pet?.name ?? '—'}
            {appointment.pet?.species && (
              <span className="text-muted-foreground font-normal text-base ml-2">
                {appointment.pet.species.name}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">{appointment.owner?.full_name ?? '—'}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              <span className="capitalize">{date}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {time} · {appointment.duration_minutes} min
            </span>
          </div>
          {appointment.reason && (
            <p className="text-xs text-muted-foreground">Motivo: {appointment.reason}</p>
          )}
        </div>
        <Link
          href={`/dashboard/pets/${appointment.pet?.id}/records/new?appointmentId=${appointment.id}`}
          className={buttonVariants({ size: 'sm' })}
        >
          Iniciar consulta
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 3.4: Ejecutar los tests para verificar que pasan**

```bash
cd veterinaias && npx vitest run __tests__/components/dashboard/NextAppointmentCard.test.tsx
```

Esperado: PASS — 6 tests passed

- [ ] **Step 3.5: Commit**

```bash
git add veterinaias/components/dashboard/NextAppointmentCard.tsx veterinaias/__tests__/components/dashboard/NextAppointmentCard.test.tsx
git commit -m "feat: NextAppointmentCard — tarjeta hero con acceso directo a iniciar consulta"
```

---

## Task 4: Actualizar dashboard/page.tsx

**Files:**
- Modify: `veterinaias/app/dashboard/page.tsx`

- [ ] **Step 4.1: Agregar imports y dividir todayAppointments**

En `veterinaias/app/dashboard/page.tsx`, agregar los tres imports nuevos después de los existentes:

```tsx
import { NextAppointmentCard } from '@/components/dashboard/NextAppointmentCard'
import { AppointmentQuickModal } from '@/components/dashboard/AppointmentQuickModal'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'
```

Después del bloque donde se define `todayAppointments` (línea ~52), agregar:

```tsx
const PENDING_STATUSES = ['scheduled', 'confirmed']
const nextAppointment: DashboardAppointment | null =
  (todayAppointments as DashboardAppointment[]).find(a => PENDING_STATUSES.includes(a.status)) ?? null
const otherAppointments: DashboardAppointment[] = nextAppointment
  ? (todayAppointments as DashboardAppointment[]).filter(a => a.id !== nextAppointment.id)
  : (todayAppointments as DashboardAppointment[])
```

- [ ] **Step 4.2: Reemplazar la sección "Citas de hoy" en el JSX**

Localizar el bloque `{/* Today's Appointments */}` en el JSX (alrededor de la línea 88) y reemplazarlo por:

```tsx
{/* Today's Appointments */}
<section className="space-y-4">
  <div className="flex items-center justify-between px-1">
    <p className="label-overline text-muted-foreground/50">Citas de hoy</p>
    {todayAppointments.length > 0 && (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
        {todayAppointments.length}
      </span>
    )}
  </div>

  {todayAppointments.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-xl bg-muted/30">
      <Calendar className="text-muted-foreground/20 mb-2" size={24} />
      <p className="text-xs text-muted-foreground">No hay citas para hoy</p>
    </div>
  ) : (
    <div className="space-y-3">
      {nextAppointment && <NextAppointmentCard appointment={nextAppointment} />}
      {otherAppointments.length > 0 && (
        <AppointmentQuickModal appointments={otherAppointments} />
      )}
    </div>
  )}
</section>
```

- [ ] **Step 4.3: Verificar que el build no tiene errores de tipos**

```bash
cd veterinaias && npx tsc --noEmit
```

Esperado: sin errores

- [ ] **Step 4.4: Ejecutar todos los tests nuevos juntos**

```bash
cd veterinaias && npx vitest run __tests__/components/dashboard/
```

Esperado: PASS — todos los tests de los 3 componentes pasan

- [ ] **Step 4.5: Commit**

```bash
git add veterinaias/app/dashboard/page.tsx
git commit -m "feat: dashboard — hero de siguiente consulta y modal rápido para citas de hoy"
```

---

## Verificación final

- [ ] Ejecutar el suite completo de tests

```bash
cd veterinaias && npx vitest run
```

Esperado: todos los tests pasan (incluyendo los pre-existentes)

- [ ] Verificar en el browser que:
  1. El dashboard muestra la tarjeta "Siguiente consulta" si hay una cita pending hoy
  2. El botón "Iniciar consulta" de la tarjeta hero navega directamente al formulario de expediente
  3. Las demás citas del día abren el modal al hacer click
  4. El modal muestra los botones correctos según el estado de la cita
  5. "No se presentó" y "Cancelar" funcionan y cierran el modal
  6. La lista de citas en `/dashboard/appointments` sigue funcionando igual (no se toca)
