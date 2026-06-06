# Dashboard Operations Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el dashboard de inicio en un tablero operativo que muestre los servicios activos (genérico sobre `service_visits`) además de las citas de hoy/próximas.

**Architecture:** Server component (`app/dashboard/page.tsx`) consulta citas + `service_visits` in_progress y métricas, y delega el render a `DashboardHome` (client). La banda de servicios activos vive en `ActiveServicesBand` (client) que se siembra desde el server y refresca con un poll ligero + cronómetro en vivo. Las tarjetas de cita se consolidan en el componente existente `DashboardAppointmentCard`.

**Tech Stack:** Next.js 14 (App Router, server + client components), Supabase (PostgREST embeds), Tailwind, lucide-react, sonner.

**Convenciones del proyecto (importante):**
- **Sin tests automatizados** en esta iteración (preferencia del usuario). Cada tarea cierra con verificación: `tsc --noEmit`, `eslint` (solo se aceptan los patrones pre-existentes del codebase: `@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, `react-hooks/purity`, `react-hooks/exhaustive-deps`), y verificación manual/DB cuando aplica.
- **Sin commits por tarea.** Se commitea solo al final, cuando el usuario lo pida.
- Patrón Supabase del codebase: `(supabase as any)` para tablas no tipadas; auth + tenant scoping vía `user_profiles.tenant_id`.
- Comandos se corren desde `/home/cvega/Documentos/Projects/VeterinaIAs/veterinaias`.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `app/api/service-visits/active/route.ts` | crear | GET de `service_visits` in_progress (genérico) con pet + servicios de estética. |
| `components/dashboard/MetricsStrip.tsx` | crear | Tira horizontal de 4 métricas (presentacional, props). |
| `components/dashboard/DashboardCTAs.tsx` | crear | Fila de 3 CTAs (Cita / Consulta / Estética). |
| `components/dashboard/ActiveServicesBand.tsx` | crear | Banda hero de servicios activos; cronómetro + poll; click → detalle. |
| `components/dashboard/DashboardHome.tsx` | crear | Orquestador del layout apilado + modales. |
| `components/dashboard/DashboardAppointmentCard.tsx` | modificar | Props `variant`/`isNext`/`dimmed`/`inService`. |
| `app/dashboard/page.tsx` | modificar | Query de activos + métricas; render `DashboardHome`. |
| `components/dashboard/DashboardTwoColumn.tsx` | eliminar | Reemplazado por `DashboardHome`. |

---

## Task 1: Endpoint de servicios activos

**Files:**
- Create: `app/api/service-visits/active/route.ts`

- [ ] **Step 1: Crear el endpoint**

Crear `app/api/service-visits/active/route.ts` con:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id

  const { data, error } = await (supabase as any)
    .from('service_visits')
    .select(`
      id, service_type, status, started_at, ended_at, created_at, appointment_id,
      pet:pet_id(id, name, species:species_id(name)),
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name))
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: true })

  if (error)
    return NextResponse.json({ error: 'Error al obtener servicios activos' }, { status: 500 })

  const mapped = (data ?? []).map((row: any) => {
    const record = Array.isArray(row.record) ? row.record[0] : row.record
    return {
      id: row.id,
      service_type: row.service_type,
      status: row.status,
      started_at: row.started_at,
      ended_at: row.ended_at,
      created_at: row.created_at,
      appointment_id: row.appointment_id,
      session_date: row.started_at ?? row.created_at,
      notes: record?.notes ?? null,
      intake_notes: record?.intake_notes ?? null,
      services: record?.services ?? [],
      pet: row.pet ?? null,
    }
  })

  return NextResponse.json({ data: mapped })
}
```

- [ ] **Step 2: Verificar el embed contra la DB (service role)**

Run:
```bash
KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-) && \
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-) && \
curl -s "$URL/rest/v1/service_visits?select=id,service_type,status,started_at,pet:pet_id(name,species:species_id(name)),record:grooming_records(intake_notes,services:grooming_record_services(id,service_name))&status=eq.in_progress&limit=3" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
Expected: JSON array (puede estar vacío o con sesiones in_progress); **sin** error `PGRST200`. Confirma que el embed `record:grooming_records(... services ...)` resuelve.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

---

## Task 2: Extender `DashboardAppointmentCard` con variantes

**Files:**
- Modify: `components/dashboard/DashboardAppointmentCard.tsx`

Consolida el markup de tarjeta de cita (hoy estaba duplicado inline en `DashboardTwoColumn`). Reemplaza el contenido completo del archivo con la versión extendida (conserva el export `DashboardAppointment`).

- [ ] **Step 1: Reescribir el componente**

Contenido completo de `components/dashboard/DashboardAppointmentCard.tsx`:

```tsx
'use client'
import { Clock } from 'lucide-react'
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/appointment-status'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import type { ServiceType } from '@/lib/types/database'

export interface DashboardAppointment {
  id: string
  status: string
  scheduled_at: string
  duration_minutes: number
  reason: string | null
  service_type?: ServiceType
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string; phone: string | null } | null
  assigned_to_profile?: { full_name: string } | null
}

interface Props {
  appointment: DashboardAppointment
  onSelect: (apt: DashboardAppointment) => void
  /** 'today' shows time only; 'upcoming' shows date + time. Default 'upcoming'. */
  variant?: 'today' | 'upcoming'
  /** Highlights the card as the next appointment and shows a "Siguiente" badge. */
  isNext?: boolean
  /** Dims the card for terminal-state appointments. */
  dimmed?: boolean
  /** Shows an "En servicio" badge (appointment has an active service in progress). */
  inService?: boolean
}

export function DashboardAppointmentCard({
  appointment, onSelect, variant = 'upcoming', isNext = false, dimmed = false, inService = false,
}: Props) {
  const dateObj = new Date(appointment.scheduled_at)
  const time = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const date = dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
  const status = APPOINTMENT_STATUS_CONFIG[appointment.status] ?? APPOINTMENT_STATUS_CONFIG.scheduled
  const svc = serviceTypeConfig(appointment.service_type)
  const isGrooming = (appointment.service_type ?? 'consultation') === 'grooming'
  const ServiceIcon = svc.Icon

  const borderClass = dimmed
    ? 'border-border/40 bg-muted/10 opacity-60 hover:opacity-80'
    : isNext
    ? 'border-primary/30 bg-primary/[0.03]'
    : 'border-border bg-card hover:border-primary/40'

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      className={`w-full group flex items-stretch gap-0 rounded-xl border hover:shadow-sm transition-all text-left overflow-hidden ${borderClass}`}
    >
      <span className={`w-1 shrink-0 ${status.stripe} ${dimmed ? 'opacity-40' : ''}`} aria-hidden />

      <div className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0">
        <div className="flex flex-col items-center w-16 shrink-0 border-r border-border pr-4">
          {variant === 'upcoming' && (
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase leading-none mb-1">{date}</span>
          )}
          <span className="text-base font-semibold text-foreground leading-none">{time}</span>
          {!isGrooming && (
            <span className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-0.5">
              <Clock size={9} />
              {appointment.duration_minutes}m
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium leading-none ${dimmed ? 'text-muted-foreground' : 'text-foreground'}`}>
              {appointment.pet?.name ?? '—'}
              {appointment.pet?.species && (
                <span className="text-muted-foreground/60 font-normal ml-2 text-[11px]">
                  {appointment.pet.species.name}
                </span>
              )}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-border bg-muted/40 text-foreground/70">
              <ServiceIcon size={10} strokeWidth={2.25} />
              {svc.label}
            </span>
            {inService && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                En servicio
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 truncate">
            {appointment.owner?.full_name ?? '—'}
            {appointment.reason ? ` · ${appointment.reason}` : ''}
          </p>
        </div>
        {isNext ? (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground whitespace-nowrap shrink-0">
            Siguiente
          </span>
        ) : (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${status.className}`}>
            {status.label}
          </span>
        )}
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

---

## Task 3: `MetricsStrip`

**Files:**
- Create: `components/dashboard/MetricsStrip.tsx`

- [ ] **Step 1: Crear el componente**

Contenido de `components/dashboard/MetricsStrip.tsx`:

```tsx
interface MetricsStripProps {
  inService: number
  total: number
  completed: number
  pendingConfirm: number
}

export function MetricsStrip({ inService, total, completed, pendingConfirm }: MetricsStripProps) {
  const items = [
    { value: inService, label: 'En servicio', valueClass: 'text-amber-700', boxClass: 'bg-amber-50 border-amber-100' },
    { value: total, label: 'Hoy', valueClass: 'text-foreground', boxClass: 'bg-card border-border' },
    { value: completed, label: 'Listas', valueClass: 'text-green-700', boxClass: 'bg-green-50 border-green-100' },
    { value: pendingConfirm, label: 'Por confirmar', valueClass: 'text-amber-700', boxClass: 'bg-amber-50 border-amber-100' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(it => (
        <div key={it.label} className={`rounded-xl border p-3 text-center ${it.boxClass}`}>
          <p className={`text-xl font-bold tabular-nums ${it.valueClass}`}>{it.value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{it.label}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

---

## Task 4: `DashboardCTAs`

**Files:**
- Create: `components/dashboard/DashboardCTAs.tsx`

- [ ] **Step 1: Crear el componente**

Contenido de `components/dashboard/DashboardCTAs.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { Calendar, Stethoscope, Scissors } from 'lucide-react'

interface DashboardCTAsProps {
  onNewAppointment: () => void
  onNewGrooming: () => void
}

export function DashboardCTAs({ onNewAppointment, onNewGrooming }: DashboardCTAsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <button
        type="button"
        onClick={onNewAppointment}
        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left group"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
          <Calendar size={17} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Nueva cita</p>
          <p className="text-xs text-muted-foreground">Agenda una cita</p>
        </div>
      </button>

      <Link
        href="/dashboard/records/new"
        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-green-300 hover:shadow-sm transition-all group"
      >
        <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
          <Stethoscope size={17} className="text-green-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Nueva consulta</p>
          <p className="text-xs text-muted-foreground">Paciente walk-in</p>
        </div>
      </Link>

      <button
        type="button"
        onClick={onNewGrooming}
        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left group"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
          <Scissors size={17} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Nuevo servicio de estética</p>
          <p className="text-xs text-muted-foreground">Sesión walk-in</p>
        </div>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

---

## Task 5: `ActiveServicesBand`

**Files:**
- Create: `components/dashboard/ActiveServicesBand.tsx`

Banda hero. Recibe `initial` del server; mantiene el cronómetro vivo (reloj local + interval 30s) y refresca la lista con un poll (interval 60s) al endpoint de Task 1. El click abre `GroomingSessionDetailModal` (el item ya satisface `GroomingSessionDetail`). Al finalizar, refresca y avisa al padre.

**Notas de lint (evitar nuevas violaciones):**
- Usar `useState(() => Date.now())` (lazy) para el reloj; NO llamar `Date.now()` en el cuerpo de render.
- En los efectos, NO llamar `setState` de forma síncrona en el cuerpo del efecto; solo dentro de callbacks (`setInterval`, `.then`).

- [ ] **Step 1: Crear el componente**

Contenido de `components/dashboard/ActiveServicesBand.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import type { ServiceType } from '@/lib/types/database'
import {
  GroomingSessionDetailModal,
  type GroomingSessionDetail,
} from '@/components/servicios/GroomingSessionDetailModal'

export interface ActiveServiceItem extends GroomingSessionDetail {
  service_type: ServiceType
  appointment_id: string | null
}

function elapsedLabel(startedAt: string | null, now: number): string {
  if (!startedAt) return '—'
  const mins = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 60000))
  if (mins < 60) return `${mins} min en curso`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min en curso` : `${h}h en curso`
}

interface Props {
  initial: ActiveServiceItem[]
  /** Called after a service is finalized so the parent can refresh (metrics/citas). */
  onChanged?: () => void
}

export function ActiveServicesBand({ initial, onChanged }: Props) {
  const [items, setItems] = useState<ActiveServiceItem[]>(initial)
  const [now, setNow] = useState(() => Date.now())
  const [selected, setSelected] = useState<ActiveServiceItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Live elapsed counter.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Light poll to catch new/finished services without a full reload.
  async function refresh() {
    try {
      const res = await fetch('/api/service-visits/active')
      if (!res.ok) return
      const json = await res.json()
      setItems(json.data ?? [])
    } catch {
      // keep last data on failure
    }
  }

  useEffect(() => {
    const t = setInterval(refresh, 60_000)
    return () => clearInterval(t)
  }, [])

  function openDetail(item: ActiveServiceItem) {
    setSelected(item)
    setDetailOpen(true)
  }

  if (items.length === 0) {
    return (
      <section>
        <p className="label-overline text-muted-foreground/50 mb-3">Servicios activos</p>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border/60 bg-muted/10">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">Sin servicios en curso</p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-[0.1em]">Servicios activos</p>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{items.length}</span>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const svc = serviceTypeConfig(item.service_type)
          const SvcIcon = svc.Icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openDetail(item)}
              className="w-full text-left flex items-center gap-3 rounded-xl border border-amber-200 bg-card px-4 py-3 hover:shadow-sm hover:border-amber-300 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground leading-none">
                    {item.pet?.name ?? '—'}
                    {item.pet?.species && (
                      <span className="font-normal text-muted-foreground ml-1.5 text-[11px]">{item.pet.species.name}</span>
                    )}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-border bg-muted/40 text-foreground/70">
                    <SvcIcon size={9} strokeWidth={2.25} />
                    {svc.label}
                  </span>
                  {item.services.slice(0, 3).map(s => (
                    <span key={s.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {s.service_name}
                    </span>
                  ))}
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
                <Timer size={12} />
                {elapsedLabel(item.started_at, now)}
              </span>
            </button>
          )
        })}
      </div>

      <GroomingSessionDetailModal
        session={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onFinalized={() => { refresh(); onChanged?.() }}
      />
    </section>
  )
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'
npx eslint components/dashboard/ActiveServicesBand.tsx -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;for(const m of r)console.log(`${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean")'
```
Expected: `0` y `clean`.

---

## Task 6: `DashboardHome` (orquestador)

**Files:**
- Create: `components/dashboard/DashboardHome.tsx`

Reemplaza a `DashboardTwoColumn`. Layout apilado full-width. Mantiene estado de modales (cita, estética, detalle de cita) y `router.refresh`. Calcula el set de `appointment_id` activos para el badge "En servicio".

- [ ] **Step 1: Crear el componente**

Contenido de `components/dashboard/DashboardHome.tsx`:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Calendar } from 'lucide-react'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import { AppointmentDetailDialog } from '@/components/appointments/AppointmentDetailDialog'
import { GroomingSessionModal } from '@/components/servicios/GroomingSessionModal'
import { DashboardAppointmentCard, type DashboardAppointment } from './DashboardAppointmentCard'
import { DashboardCTAs } from './DashboardCTAs'
import { MetricsStrip } from './MetricsStrip'
import { ActiveServicesBand, type ActiveServiceItem } from './ActiveServicesBand'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface TeamMember { id: string; full_name: string }
interface Metrics { inService: number; total: number; completed: number; pendingConfirm: number }

interface Props {
  greeting: string
  firstName: string
  today: string
  nextAppointment: DashboardAppointment | null
  todayAppointments: DashboardAppointment[]
  futureAppointments: DashboardAppointment[]
  metrics: Metrics
  team: TeamMember[]
  businessHours: BusinessHoursConfig
  initialActiveServices: ActiveServiceItem[]
}

const ACTIVE = ['scheduled', 'confirmed']

export function DashboardHome({
  greeting, firstName, today,
  nextAppointment, todayAppointments, futureAppointments,
  metrics, team, businessHours, initialActiveServices,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [newGroomingOpen, setNewGroomingOpen] = useState(false)

  const activeApptIds = new Set(
    initialActiveServices.map(s => s.appointment_id).filter((v): v is string => Boolean(v))
  )

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

  return (
    <>
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground capitalize">{today}</p>
        <h1 className="text-2xl font-bold text-foreground mt-0.5">{greeting}, {firstName}</h1>
      </div>

      {/* CTAs */}
      <div className="mb-6">
        <DashboardCTAs
          onNewAppointment={() => setNewApptOpen(true)}
          onNewGrooming={() => setNewGroomingOpen(true)}
        />
      </div>

      {/* Metrics */}
      <div className="mb-6">
        <MetricsStrip
          inService={metrics.inService}
          total={metrics.total}
          completed={metrics.completed}
          pendingConfirm={metrics.pendingConfirm}
        />
      </div>

      <div className="space-y-8">
        {/* Active services */}
        <ActiveServicesBand
          initial={initialActiveServices}
          onChanged={() => router.refresh()}
        />

        {/* Today */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="label-overline text-muted-foreground/50">Citas de hoy</p>
            {metrics.total > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">{metrics.total}</span>
            )}
          </div>

          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl bg-muted/20">
              <Calendar className="text-muted-foreground/20 mb-2" size={22} />
              <p className="text-xs text-muted-foreground">No hay citas para hoy</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {todayAppointments.map(apt => (
                <DashboardAppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onSelect={setSelected}
                  variant="today"
                  isNext={apt.id === nextAppointment?.id}
                  dimmed={!ACTIVE.includes(apt.status)}
                  inService={activeApptIds.has(apt.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        {futureAppointments.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="label-overline text-muted-foreground/50">Próximas citas</p>
              <Link href="/dashboard/appointments" className="text-[10px] font-medium text-primary hover:underline">
                Ver agenda →
              </Link>
            </div>
            <div className="space-y-1.5">
              {futureAppointments.map(apt => (
                <DashboardAppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onSelect={setSelected}
                  variant="upcoming"
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <AppointmentDetailDialog
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null) }}
        appointment={selected}
        onTransition={transition}
        loadingStatus={loading}
      />

      <NewAppointmentModal
        isOpen={newApptOpen}
        onClose={() => setNewApptOpen(false)}
        team={team}
        businessHours={businessHours}
      />

      <GroomingSessionModal
        open={newGroomingOpen}
        onOpenChange={setNewGroomingOpen}
        onSuccess={() => { setNewGroomingOpen(false); router.refresh() }}
      />
    </>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0` (puede fallar hasta cablear `page.tsx` en Task 7 si algún import quedara colgando; si aparece error solo por `DashboardHome` no usado, continúa a Task 7).

---

## Task 7: Cablear `app/dashboard/page.tsx` y eliminar `DashboardTwoColumn`

**Files:**
- Modify: `app/dashboard/page.tsx`
- Delete: `components/dashboard/DashboardTwoColumn.tsx`

- [ ] **Step 1: Reescribir `app/dashboard/page.tsx`**

Contenido completo:

```tsx
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { DashboardHome } from '@/components/dashboard/DashboardHome'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'
import type { ActiveServiceItem } from '@/components/dashboard/ActiveServicesBand'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, tenant_id, tenants(name, type, subscription_status, settings)')
    .eq('id', user!.id)
    .single() as any

  const tenant = profile?.tenants
  const businessHours = (tenant as any)?.settings?.business_hours ?? DEFAULT_BUSINESS_HOURS
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name') as { data: { id: string; full_name: string }[] | null }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86400000)

  const showAll =
    tenant?.type === 'individual' ||
    profile?.role === 'admin' ||
    profile?.role === 'assistant' ||
    profile?.role === 'staff'

  let appointmentsQuery = supabase
    .from('appointments')
    .select(`
      id, status, scheduled_at, duration_minutes, reason, service_type,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .gte('scheduled_at', todayStart.toISOString())
    .order('scheduled_at', { ascending: true })

  if (!showAll && profile?.role === 'doctor') {
    appointmentsQuery = appointmentsQuery.eq('assigned_to', user!.id)
  }

  const { data: appointments } = await appointmentsQuery as { data: any[] | null }

  const todayAppointments = (appointments?.filter(a =>
    new Date(a.scheduled_at) < tomorrowStart
  ) ?? []) as DashboardAppointment[]

  const futureAppointments = (appointments?.filter(a =>
    new Date(a.scheduled_at) >= tomorrowStart
  ).slice(0, 5) ?? []) as DashboardAppointment[]

  const nextAppointment: DashboardAppointment | null =
    todayAppointments.find(a => ['scheduled', 'confirmed'].includes(a.status)) ?? null

  // Active services (in_progress service_visits, any type)
  const { data: activeRaw } = await (supabase as any)
    .from('service_visits')
    .select(`
      id, service_type, status, started_at, ended_at, created_at, appointment_id,
      pet:pet_id(id, name, species:species_id(name)),
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name))
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: true })

  const initialActiveServices: ActiveServiceItem[] = (activeRaw ?? []).map((row: any) => {
    const record = Array.isArray(row.record) ? row.record[0] : row.record
    return {
      id: row.id,
      service_type: row.service_type,
      status: row.status,
      started_at: row.started_at,
      ended_at: row.ended_at,
      session_date: row.started_at ?? row.created_at,
      notes: record?.notes ?? null,
      intake_notes: record?.intake_notes ?? null,
      services: record?.services ?? [],
      pet: row.pet ?? null,
      appointment_id: row.appointment_id,
    }
  })

  const metrics = {
    inService: initialActiveServices.length,
    total: todayAppointments.length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
    pendingConfirm: todayAppointments.filter(a => a.status === 'scheduled').length,
  }

  return (
    <DashboardHome
      greeting={greeting}
      firstName={firstName}
      today={today}
      nextAppointment={nextAppointment}
      todayAppointments={todayAppointments}
      futureAppointments={futureAppointments}
      metrics={metrics}
      team={team ?? []}
      businessHours={businessHours}
      initialActiveServices={initialActiveServices}
    />
  )
}
```

- [ ] **Step 2: Eliminar el componente viejo**

Run: `rm components/dashboard/DashboardTwoColumn.tsx`

- [ ] **Step 3: Confirmar que nada más importa `DashboardTwoColumn`**

Run: `grep -rn "DashboardTwoColumn" app components || echo "no refs"`
Expected: `no refs`

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

---

## Task 8: Verificación final

- [ ] **Step 1: Typecheck completo**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

- [ ] **Step 2: Lint de los archivos nuevos/modificados (sin nuevas violaciones)**

Run:
```bash
npx eslint \
  app/api/service-visits/active/route.ts \
  components/dashboard/MetricsStrip.tsx \
  components/dashboard/DashboardCTAs.tsx \
  components/dashboard/ActiveServicesBand.tsx \
  components/dashboard/DashboardHome.tsx \
  components/dashboard/DashboardAppointmentCard.tsx \
  app/dashboard/page.tsx -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;console.log(f.filePath.split("/veterinaias/")[1]);for(const m of r)console.log(`  ${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean (solo patrones pre-existentes)")'
```
Expected: `clean (solo patrones pre-existentes)`

- [ ] **Step 3: Verificación manual (dev server)**

1. Iniciar una sesión de estética desde una cita (panel de cita → "Iniciar sesión de estética" con notas de recepción).
2. Ir al dashboard de inicio: la banda **Servicios activos** muestra la mascota, el tipo (Estética), los servicios como chips y el cronómetro "X min en curso". La métrica **En servicio** = 1.
3. La cita correspondiente en **Citas de hoy** muestra el micro-badge **En servicio**.
4. Click en la tarjeta activa → abre el modal de Detalle con notas de recepción; **Finalizar servicio** → la tarjeta desaparece de la banda, "En servicio" baja a 0 y la cita se marca completada.
5. Sin servicios en curso, la banda se colapsa a la línea "Sin servicios en curso".

- [ ] **Step 4: Commit (solo cuando el usuario lo pida)**

Por preferencia del proyecto no se commitea automáticamente. Cuando el usuario lo solicite:
```bash
git add app/dashboard/page.tsx app/api/service-visits/active/route.ts components/dashboard/
git commit -m "feat: dashboard tablero operativo — servicios activos + citas, métricas y CTAs rediseñados"
```

---

## Self-Review (cobertura del spec)

- Servicio activo genérico (`service_visits` in_progress) → Task 1 (endpoint) + Task 7 (seed server). ✓
- Jerarquía tablero operativo (activos arriba) → Task 6 (orden en `DashboardHome`). ✓
- Tarjeta activa informativa + click → detalle → Task 5 (`ActiveServicesBand` + `GroomingSessionDetailModal`). ✓
- Layout apilado, sin columna lateral ni módulos → Task 6 + Task 7. ✓
- Métricas como tira con "En servicio" → Task 3 + Task 7 (cálculo). ✓
- CTAs (Cita / Consulta / Estética) → Task 4. ✓
- Banda hero + estado vacío colapsado → Task 5. ✓
- Cronómetro vivo + poll → Task 5. ✓
- Consolidar tarjeta de cita en `DashboardAppointmentCard` → Task 2. ✓
- Badge "en servicio" en citas → Task 2 (prop) + Task 6 (cálculo set). ✓
- Manejo de errores (poll conserva último dato; secciones con fallback) → Task 5 + estados vacíos. ✓
