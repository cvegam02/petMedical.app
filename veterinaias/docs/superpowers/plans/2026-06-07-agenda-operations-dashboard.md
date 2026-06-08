# Agenda — Operations Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current day-calendar dashboard (`AgendaScreen` + `DayView`) with an operations-first control board that surfaces active services and alerts as the hero, with a compact appointment strip below.

**Architecture:** Server component (`app/dashboard/page.tsx`) calculates metrics and alerts, then renders `OperationsDashboard` (client shell). `ActiveServicesBand` retains its existing live-poll logic. Three new components (`AlertBanner`, `AppointmentChipsStrip`, `OperationsDashboard`) plus style updates to `MetricsStrip` and `ActiveServicesBand`.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, Supabase, Lucide icons, `date-fns`

---

## File Map

| Action | File | Role |
|--------|------|------|
| Modify | `components/dashboard/MetricsStrip.tsx` | Update props interface + MundoPet styles |
| Create | `components/dashboard/AlertBanner.tsx` | Single conditional alert banner |
| Create | `components/dashboard/AppointmentChipsStrip.tsx` | Compact upcoming-citas chips row |
| Modify | `components/dashboard/ActiveServicesBand.tsx` | Apply MundoPet palette (remove amber structural bg) |
| Create | `components/dashboard/OperationsDashboard.tsx` | Client shell — assembles all sections |
| Modify | `app/dashboard/page.tsx` | Alert calculation + wire `OperationsDashboard` |

Files left as dead code after this plan (do not delete — they're still imported by `/dashboard/appointments`-adjacent code):
- `components/agenda/AgendaScreen.tsx` — no longer imported by `page.tsx`
- `components/agenda/DayView.tsx` — no longer imported by `AgendaScreen` from dashboard
- `components/agenda/AppointmentPanel.tsx` — no longer imported from dashboard

---

## Task 1: Update MetricsStrip — props and styles

**Files:**
- Modify: `veterinaias/components/dashboard/MetricsStrip.tsx`

Replace props `completed` and `overdue` with `hotelActive` and `alerts`. Apply MundoPet palette: 4 neutral chips + 1 conditional red chip for alerts.

- [ ] **Step 1: Replace the file content**

```tsx
interface MetricsStripProps {
  inService: number
  hotelActive: number
  total: number
  pendingConfirm: number
  alerts: number
}

export function MetricsStrip({ inService, hotelActive, total, pendingConfirm, alerts }: MetricsStripProps) {
  const base = [
    { value: inService, label: 'En servicio' },
    { value: hotelActive, label: 'Hotel activo' },
    { value: total, label: 'Citas hoy' },
    { value: pendingConfirm, label: 'Por confirmar' },
  ]

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${base.length + (alerts > 0 ? 1 : 0)}, minmax(0, 1fr))` }}>
      {base.map(it => (
        <div key={it.label} className="rounded-xl border border-[#E7EBEF] bg-[#F3F5F7] p-3 text-center">
          <p className="text-2xl font-extrabold tabular-nums text-[#161D24]">{it.value}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#73808C] mt-1">{it.label}</p>
        </div>
      ))}
      {alerts > 0 && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-center">
          <p className="text-2xl font-extrabold tabular-nums text-[#DC2626]">{alerts}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#B91C1C] mt-1">⚠ Alerta{alerts !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `MetricsStrip`.

---

## Task 2: Create AlertBanner

**Files:**
- Create: `veterinaias/components/dashboard/AlertBanner.tsx`

Renders one alert row. `checkout_overdue` → link to stay page. `urgent_unconfirmed` → link to appointments page. Stateless — caller maps over the alerts array.

- [ ] **Step 1: Create the file**

```tsx
import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'

export type Alert =
  | { type: 'checkout_overdue'; visitId: string; petName: string; overdueMinutes: number }
  | { type: 'urgent_unconfirmed'; appointmentId: string; petName: string; serviceType: string; minutesUntil: number }

interface Props {
  alert: Alert
}

const SERVICE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  grooming: 'Estética',
  boarding: 'Hotel',
  surgery: 'Cirugía',
  hospitalization: 'Hospitalización',
}

export function AlertBanner({ alert }: Props) {
  const { title, description, href, cta } = (() => {
    if (alert.type === 'checkout_overdue') {
      const h = Math.floor(alert.overdueMinutes / 60)
      const m = alert.overdueMinutes % 60
      const elapsed = h > 0 ? `${h}h ${m > 0 ? `${m}min` : ''}`.trim() : `${m}min`
      return {
        title: `${alert.petName} — Hotel · Salida vencida`,
        description: `Llevan ${elapsed} de retraso en la salida`,
        href: `/dashboard/servicios/hotel/stay/${alert.visitId}`,
        cta: 'Ver estancia →',
      }
    }
    return {
      title: `${alert.petName} — ${SERVICE_LABELS[alert.serviceType] ?? alert.serviceType} · Sin confirmar`,
      description: `Cita en ${alert.minutesUntil} min · Llama al dueño para confirmar`,
      href: `/dashboard/appointments`,
      cta: 'Ver agenda →',
    }
  })()

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2]">
        <TriangleAlert size={15} className="text-[#DC2626]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#DC2626] leading-none">{title}</p>
        <p className="text-xs text-[#7F1D1D] mt-0.5">{description}</p>
      </div>
      <Link
        href={href}
        className="shrink-0 rounded-lg bg-[#DC2626] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#B91C1C] transition-colors"
      >
        {cta}
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `AlertBanner`.

---

## Task 3: Create AppointmentChipsStrip

**Files:**
- Create: `veterinaias/components/dashboard/AppointmentChipsStrip.tsx`

Filters appointments to upcoming (>= now, non-terminal status), shows max 5 chips + overflow count. Click opens `AppointmentDetailDialog`. Color signals confirmation status only, never service type.

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AppointmentDetailDialog } from '@/components/appointments/AppointmentDetailDialog'
import { serviceTypeConfig } from '@/lib/constants/service-type'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

interface Props {
  appointments: DashboardAppointment[]
}

const TERMINAL_STATUSES = new Set(['cancelled', 'completed', 'no_show'])

function chipStyle(apt: DashboardAppointment): string {
  if (apt.status === 'confirmed') {
    return 'bg-[#F1FCF7] border-[#DCF8EB]'
  }
  const minsUntil = (new Date(apt.scheduled_at).getTime() - Date.now()) / 60000
  if (apt.status === 'scheduled' && minsUntil <= 60) {
    return 'bg-[#FFFBEB] border-[#FDE68A]'
  }
  return 'bg-[#F3F5F7] border-[#E7EBEF]'
}

function statusLabel(apt: DashboardAppointment): { text: string; className: string } | null {
  if (apt.status === 'confirmed') {
    return { text: '✓ Confirmada', className: 'text-[#1D865C] font-semibold' }
  }
  const minsUntil = (new Date(apt.scheduled_at).getTime() - Date.now()) / 60000
  if (apt.status === 'scheduled' && minsUntil <= 60) {
    return { text: 'Sin confirmar', className: 'text-[#92400E] font-semibold' }
  }
  return null
}

export function AppointmentChipsStrip({ appointments }: Props) {
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)

  const now = new Date()
  const upcoming = appointments.filter(
    a => new Date(a.scheduled_at) >= now && !TERMINAL_STATUSES.has(a.status)
  )
  const visible = upcoming.slice(0, 5)
  const overflowCount = Math.max(0, upcoming.length - 5)

  return (
    <>
      <div className="rounded-[14px] border border-[#E7EBEF] bg-white px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#55616C]">Próximas citas</p>
          <Link
            href="/dashboard/appointments"
            className="text-[10px] font-bold text-[#35C48B] hover:text-[#27A673] transition-colors"
          >
            Ver agenda completa →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-xs text-[#73808C] py-2">Sin citas pendientes por el resto del día</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {visible.map(apt => {
              const time = new Date(apt.scheduled_at).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })
              const svc = serviceTypeConfig(apt.service_type)
              const label = statusLabel(apt)
              return (
                <button
                  key={apt.id}
                  type="button"
                  onClick={() => setSelected(apt)}
                  className={`rounded-[10px] border px-3 py-2 text-left min-w-[80px] hover:opacity-80 transition-opacity ${chipStyle(apt)}`}
                >
                  <p className="text-[10px] font-bold text-[#0F4C81] font-mono">{time}</p>
                  <p className="text-xs font-bold text-[#161D24] mt-0.5">{apt.pet?.name ?? '—'}</p>
                  {label ? (
                    <p className={`text-[9px] mt-0.5 ${label.className}`}>{label.text}</p>
                  ) : (
                    <p className="text-[9px] text-[#73808C] mt-0.5">{svc.label}</p>
                  )}
                </button>
              )
            })}
            {overflowCount > 0 && (
              <div className="rounded-[10px] border border-[#E7EBEF] bg-[#F3F5F7] px-3 py-2 flex items-center justify-center min-w-[48px]">
                <span className="text-[10px] font-bold text-[#73808C]">+{overflowCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <AppointmentDetailDialog
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null) }}
        appointment={selected}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `AppointmentChipsStrip`.

---

## Task 4: Update ActiveServicesBand styles to MundoPet palette

**Files:**
- Modify: `veterinaias/components/dashboard/ActiveServicesBand.tsx`

Two changes: (1) apply MundoPet palette — remove amber structural background, use white+whisper border, green/red dots; (2) fix `openDetail` so `consultation` and `surgery` service types navigate to their detail pages instead of opening the grooming modal.

- [ ] **Step 1: Replace the full file content**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Timer } from 'lucide-react'
import { serviceTypeConfig, serviceDetailUrl } from '@/lib/constants/service-type'
import type { ServiceType } from '@/lib/types/database'
import {
  GroomingSessionDetailModal,
  type GroomingSessionDetail,
} from '@/components/servicios/GroomingSessionDetailModal'
import { BoardingStayDetailModal } from '@/components/servicios/BoardingStayDetailModal'
import { HospitalizationDetailModal } from '@/components/servicios/HospitalizationDetailModal'
import { isCheckoutOverdue } from '@/lib/utils/boarding'

export interface ActiveServiceItem extends GroomingSessionDetail {
  service_type: ServiceType
  appointment_id: string | null
  expected_check_out: string | null
}

function elapsedLabel(startedAt: string | null, now: number): string {
  if (!startedAt) return '—'
  const mins = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 60000))
  if (mins < 60) return `${mins} min en curso`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min en curso` : `${h}h en curso`
}

function boardingDayLabel(startedAt: string | null, expectedCheckOut: string | null, now: number): string {
  if (!startedAt) return '—'
  const day = Math.max(1, Math.floor((now - new Date(startedAt).getTime()) / 86400000) + 1)
  if (!expectedCheckOut) return `Día ${day}`
  const sale = new Date(expectedCheckOut).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  return `Día ${day} · sale ${sale}`
}

interface Props {
  initial: ActiveServiceItem[]
  onChanged?: () => void
}

export function ActiveServicesBand({ initial, onChanged }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ActiveServiceItem[]>(initial)
  const [now, setNow] = useState(() => Date.now())
  const [selected, setSelected] = useState<ActiveServiceItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [hospDetailId, setHospDetailId] = useState<string | null>(null)
  const [hospDetailOpen, setHospDetailOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

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
    if (item.service_type === 'hospitalization') {
      setHospDetailId(item.id)
      setHospDetailOpen(true)
    } else if (item.service_type === 'consultation' || item.service_type === 'surgery') {
      if (item.appointment_id) {
        router.push(serviceDetailUrl(item.service_type, item.appointment_id))
      }
    } else {
      setSelected(item)
      setDetailOpen(true)
    }
  }

  if (items.length === 0) {
    return (
      <section>
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#73808C] mb-3">Servicios activos</p>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#E7EBEF] bg-[#FAFBFC]">
          <span className="w-2 h-2 rounded-full bg-[#D0D8E0] shrink-0" />
          <p className="text-xs text-[#73808C]">Sin servicios en curso · La clínica está libre</p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[#E7EBEF] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#35C48B] shrink-0" />
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#55616C]">Servicios activos</p>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded-md bg-[#F1FCF7] border border-[#DCF8EB] text-[#1D865C]">
          {items.length} en curso
        </span>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const svc = serviceTypeConfig(item.service_type)
          const SvcIcon = svc.Icon
          const isOverdue = item.service_type === 'boarding' &&
            isCheckoutOverdue(item.expected_check_out, item.started_at, item.ended_at, now)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openDetail(item)}
              className={`w-full text-left flex items-center gap-3 rounded-xl border px-4 py-3 hover:opacity-90 transition-opacity ${
                isOverdue ? 'border-[#FECACA] bg-[#FAFBFC]' : 'border-[#E7EBEF] bg-[#FAFBFC]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-[#DC2626]' : 'bg-[#35C48B]'}`}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#161D24] leading-none">
                    {item.pet?.name ?? '—'}
                    {item.pet?.species && (
                      <span className="font-normal text-[#73808C] ml-1.5 text-[11px]">{item.pet.species.name}</span>
                    )}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-[#E7EBEF] bg-[#F3F5F7] text-[#55616C] uppercase tracking-[0.05em]">
                    <SvcIcon size={9} strokeWidth={2.25} />
                    {svc.label}
                  </span>
                  {item.services.slice(0, 3).map(s => (
                    <span key={s.id} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#F3F8FC] border border-[#E7EBEF] text-[#337DB9]">
                      {s.service_name}
                    </span>
                  ))}
                </div>
              </div>
              {isOverdue ? (
                <span className="flex items-center gap-1 text-xs font-bold text-[#DC2626] whitespace-nowrap shrink-0">
                  <Timer size={12} />
                  Salida vencida
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-[#F59E0B] whitespace-nowrap shrink-0">
                  <Timer size={12} />
                  {(item.service_type === 'boarding' || item.service_type === 'hospitalization')
                    ? boardingDayLabel(item.started_at, item.expected_check_out, now)
                    : elapsedLabel(item.started_at, now)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected?.service_type === 'boarding' ? (
        <BoardingStayDetailModal
          visitId={detailOpen ? selected.id : null}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onChanged={() => { refresh(); onChanged?.() }}
        />
      ) : (
        <GroomingSessionDetailModal
          session={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onFinalized={() => { refresh(); onChanged?.() }}
        />
      )}
      <HospitalizationDetailModal
        visitId={hospDetailOpen ? hospDetailId : null}
        open={hospDetailOpen}
        onOpenChange={setHospDetailOpen}
        onChanged={() => { refresh(); onChanged?.() }}
      />
    </section>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

---

## Task 5: Create OperationsDashboard

**Files:**
- Create: `veterinaias/components/dashboard/OperationsDashboard.tsx`

Client shell that assembles the header, metrics, alerts, active services, and chips strip. Owns `NewAppointmentModal` state and routes refresh on service finalized.

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import { MetricsStrip } from './MetricsStrip'
import { AlertBanner, type Alert } from './AlertBanner'
import { ActiveServicesBand, type ActiveServiceItem } from './ActiveServicesBand'
import { AppointmentChipsStrip } from './AppointmentChipsStrip'
import type { DashboardAppointment } from './DashboardAppointmentCard'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface Metrics {
  inService: number
  hotelActive: number
  total: number
  pendingConfirm: number
  alerts: number
}

interface Props {
  date: Date
  appointments: DashboardAppointment[]
  metrics: Metrics
  alerts: Alert[]
  initialActiveServices: ActiveServiceItem[]
  team: { id: string; full_name: string }[]
  businessHours: BusinessHoursConfig
}

export function OperationsDashboard({
  date,
  appointments,
  metrics,
  alerts,
  initialActiveServices,
  team,
  businessHours,
}: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  const dateLabel = date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const dateFormatted = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#73808C] mb-1">Agenda</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#161D24]">{dateFormatted}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-[10px] border border-[#E7EBEF] bg-[#F3F8FC] px-4 py-2 text-sm font-semibold text-[#0F4C81] hover:bg-[#DCF8EB] hover:text-[#1D865C] transition-colors"
          >
            + Nueva cita
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/servicios/consulta/new')}
            className="rounded-[10px] bg-[#35C48B] px-4 py-2 text-sm font-bold text-white hover:bg-[#27A673] transition-colors"
          >
            Atender ahora
          </button>
        </div>
      </div>

      {/* Métricas */}
      <MetricsStrip
        inService={metrics.inService}
        hotelActive={metrics.hotelActive}
        total={metrics.total}
        pendingConfirm={metrics.pendingConfirm}
        alerts={metrics.alerts}
      />

      {/* Alertas (condicional) */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <AlertBanner key={i} alert={alert} />
          ))}
        </div>
      )}

      {/* Servicios activos */}
      <ActiveServicesBand
        initial={initialActiveServices}
        onChanged={() => router.refresh()}
      />

      {/* Próximas citas */}
      <AppointmentChipsStrip appointments={appointments} />

      <NewAppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        team={team}
        businessHours={businessHours}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `OperationsDashboard`.

---

## Task 6: Update app/dashboard/page.tsx

**Files:**
- Modify: `veterinaias/app/dashboard/page.tsx`

Add alert calculation, compute `hotelActive`, replace `AgendaScreen` with `OperationsDashboard`.

- [ ] **Step 1: Replace the file content**

```tsx
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { isCheckoutOverdue } from '@/lib/utils/boarding'
import { OperationsDashboard } from '@/components/dashboard/OperationsDashboard'
import type { ActiveServiceItem } from '@/components/dashboard/ActiveServicesBand'
import type { Alert } from '@/components/dashboard/AlertBanner'
import type { DashboardAppointment } from '@/components/dashboard/DashboardAppointmentCard'

export const dynamic = 'force-dynamic'

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
    .lt('scheduled_at', tomorrowStart.toISOString())
    .order('scheduled_at', { ascending: true })

  if (!showAll && profile?.role === 'doctor') {
    appointmentsQuery = appointmentsQuery.eq('assigned_to', user!.id)
  }

  const { data: appointments } = await appointmentsQuery as { data: DashboardAppointment[] | null }

  // Active service visits
  const { data: activeRaw } = await (supabase as any)
    .from('service_visits')
    .select(`
      id, service_type, status, started_at, ended_at, created_at, appointment_id,
      pet:pet_id(id, name, species:species_id(name)),
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name)),
      boarding:boarding_records(expected_check_out)
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: true })

  const initialActiveServices: ActiveServiceItem[] = (activeRaw ?? []).map((row: any) => {
    const record = Array.isArray(row.record) ? row.record[0] : row.record
    const boarding = Array.isArray(row.boarding) ? row.boarding[0] : row.boarding
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
      expected_check_out: boarding?.expected_check_out ?? null,
    }
  })

  // Calculate alerts
  const nowMs = now.getTime()

  const checkoutOverdueAlerts: Alert[] = initialActiveServices
    .filter(s =>
      s.service_type === 'boarding' &&
      isCheckoutOverdue(s.expected_check_out, s.started_at, s.ended_at ?? null, nowMs)
    )
    .map(s => {
      const overdueMs = nowMs - new Date(s.expected_check_out!).getTime()
      return {
        type: 'checkout_overdue' as const,
        visitId: s.id,
        petName: s.pet?.name ?? '—',
        overdueMinutes: Math.round(overdueMs / 60000),
      }
    })

  const urgentUnconfirmedAlerts: Alert[] = (appointments ?? [])
    .filter(a => {
      const apptMs = new Date(a.scheduled_at).getTime()
      return a.status === 'scheduled' && apptMs > nowMs && apptMs - nowMs <= 60 * 60 * 1000
    })
    .map(a => {
      const minutesUntil = Math.round((new Date(a.scheduled_at).getTime() - nowMs) / 60000)
      return {
        type: 'urgent_unconfirmed' as const,
        appointmentId: a.id,
        petName: a.pet?.name ?? '—',
        serviceType: a.service_type ?? 'consultation',
        minutesUntil,
      }
    })

  const alerts: Alert[] = [...checkoutOverdueAlerts, ...urgentUnconfirmedAlerts]

  // Derive metrics
  const inService = initialActiveServices.filter(s => s.service_type !== 'boarding').length
  const hotelActive = initialActiveServices.filter(s => s.service_type === 'boarding').length
  const total = (appointments ?? []).length
  const pendingConfirm = (appointments ?? []).filter(a => a.status === 'scheduled').length

  return (
    <OperationsDashboard
      date={todayStart}
      appointments={(appointments ?? []) as DashboardAppointment[]}
      metrics={{ inService, hotelActive, total, pendingConfirm, alerts: alerts.length }}
      alerts={alerts}
      initialActiveServices={initialActiveServices}
      team={team ?? []}
      businessHours={businessHours}
    />
  )
}
```

- [ ] **Step 2: Verify full build**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 3: Run the dev server and open http://localhost:3000/dashboard**

```bash
cd veterinaias && npm run dev
```

Verify visually:
- Header shows today's date in Spanish with correct buttons
- Metrics grid shows 4 neutral chips; red alert chip only if there are active alerts
- Alert banners appear below metrics only if applicable
- Active services section has white background (not amber), green/red dots
- Appointment chips strip appears with neutral style; confirmed chips in green, urgent-unconfirmed in amber
- Clicking a chip opens `AppointmentDetailDialog`
- "Nueva cita" opens `NewAppointmentModal`
- "Atender ahora" navigates to `/dashboard/servicios/consulta/new`
- No TypeScript or console errors
