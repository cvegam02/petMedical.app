# Manejo del Status de Citas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la cita automáticamente (transaccional, server-side) al concluir su servicio, y manejar las citas vencidas en el dashboard como estado derivado con resolución manual.

**Architecture:** Una función de Postgres `conclude_service_visit` cierra visita + notas + cita ligada en una sola transacción; el endpoint de finalización la invoca. "Vencida" es derivado vía un helper puro (gracia 30 min); el dashboard añade una sección "Vencidas" (backlog de días previos), un badge en las citas de hoy vencidas y una 5ª métrica.

**Tech Stack:** Next.js 14 (App Router), Supabase (Postgres function / RPC, PostgREST), Tailwind, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-02-appointment-status-lifecycle-design.md`

**Convenciones del proyecto (importante):**
- **Sin tests automatizados.** Cada tarea cierra con verificación: `tsc --noEmit`, y `eslint` aceptando SOLO los patrones pre-existentes del codebase (`@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, `react-hooks/purity`, `react-hooks/exhaustive-deps`).
- **Sin commits por tarea.** Commit final solo cuando el usuario lo pida.
- Comandos desde `/home/cvega/Documentos/Projects/VeterinaIAs/veterinaias`.
- Supabase: `(supabase as any)` para tablas no tipadas (patrón del codebase). Project ref: `qgruuhrgwgjduzlctdlx`.
- Estado actual: rama `feat/dashboard-operations-board` con el dashboard ya implementado (`DashboardHome`, `MetricsStrip`, `DashboardAppointmentCard`, etc.).

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `supabase/migrations/20260602000003_conclude_service_visit_fn.sql` | crear | Función transaccional `conclude_service_visit`. |
| `lib/utils/appointment-overdue.ts` | crear | Helper `isOverdue` + constante `OVERDUE_GRACE_MINUTES`. |
| `app/api/servicios/estetica/[id]/route.ts` | modificar | Camino "concluir" usa la RPC; resto igual. |
| `components/appointments/panels/GroomingPanel.tsx` | modificar | Quitar la 2ª llamada de cierre de cita. |
| `components/dashboard/DashboardAppointmentCard.tsx` | modificar | Prop `overdue` + badge "Vencida". |
| `components/dashboard/MetricsStrip.tsx` | modificar | 5º indicador "Vencidas". |
| `app/dashboard/page.tsx` | modificar | Query backlog vencidas + ids vencidas de hoy + métrica. |
| `components/dashboard/DashboardHome.tsx` | modificar | Sección "Vencidas", badge en hoy, orden, props. |

---

## Task 1: Función transaccional `conclude_service_visit`

**Files:**
- Create: `supabase/migrations/20260602000003_conclude_service_visit_fn.sql`

- [ ] **Step 1: Crear el archivo de migración**

Contenido de `supabase/migrations/20260602000003_conclude_service_visit_fn.sql`:

```sql
-- 20260602000003_conclude_service_visit_fn.sql
-- Cierre atómico de un servicio: marca el service_visit como completed, guarda notas,
-- y cierra la cita ligada (si no queda otro servicio en curso) en una sola transacción.
-- SECURITY INVOKER => respeta RLS del usuario que llama (tenant scoping).

CREATE OR REPLACE FUNCTION conclude_service_visit(
  p_visit_id uuid,
  p_ended_at timestamptz,
  p_notes text,
  p_intake_notes text
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE service_visits
  SET ended_at = p_ended_at, status = 'completed'
  WHERE id = p_visit_id;

  UPDATE grooming_records
  SET notes        = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
      intake_notes = CASE WHEN p_intake_notes IS NOT NULL THEN p_intake_notes ELSE intake_notes END
  WHERE visit_id = p_visit_id;

  UPDATE appointments a
  SET status = 'completed'
  WHERE a.id = (SELECT appointment_id FROM service_visits WHERE id = p_visit_id)
    AND NOT EXISTS (
      SELECT 1 FROM service_visits sv2
      WHERE sv2.appointment_id = a.id
        AND sv2.id <> p_visit_id
        AND sv2.status = 'in_progress'
    );
END;
$$;
```

- [ ] **Step 2: Aplicar la migración al proyecto remoto**

Aplicar vía la herramienta MCP de Supabase `apply_migration` (name: `conclude_service_visit_fn`, project_id: `qgruuhrgwgjduzlctdlx`) con el cuerpo SQL de arriba (sin el comentario de cabecera es indistinto). Si ejecutas como subagente sin acceso MCP, DETENTE y reporta NEEDS_CONTEXT para que el controlador aplique la migración.

- [ ] **Step 3: Verificar que la función existe**

Ejecutar (vía MCP `execute_sql`, project_id `qgruuhrgwgjduzlctdlx`):
```sql
SELECT proname, pg_get_function_arguments(oid) AS args
FROM pg_proc WHERE proname = 'conclude_service_visit';
```
Expected: una fila con args `p_visit_id uuid, p_ended_at timestamp with time zone, p_notes text, p_intake_notes text`.

---

## Task 2: Helper `isOverdue`

**Files:**
- Create: `lib/utils/appointment-overdue.ts`

- [ ] **Step 1: Crear el helper**

Contenido de `lib/utils/appointment-overdue.ts`:

```ts
export const OVERDUE_GRACE_MINUTES = 30

/**
 * An appointment is "overdue" when it is still scheduled/confirmed and its time window
 * (scheduled_at + duration + grace) has fully passed. Derived; never stored.
 */
export function isOverdue(
  scheduledAt: string,
  durationMinutes: number | null | undefined,
  status: string,
  now: number = Date.now(),
): boolean {
  if (status !== 'scheduled' && status !== 'confirmed') return false
  const endMs =
    new Date(scheduledAt).getTime() +
    (durationMinutes ?? 0) * 60_000 +
    OVERDUE_GRACE_MINUTES * 60_000
  return now > endMs
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

---

## Task 3: Endpoint usa la RPC al concluir

**Files:**
- Modify: `app/api/servicios/estetica/[id]/route.ts`

El bloque de updates manuales (visit + notas) se reemplaza: si el body trae `ended_at`
(concluir) → RPC atómica; si no → updates directos como hoy. Las verificaciones previas
(404/409 con el invariante "ya concluida") y el re-select de respuesta NO cambian.

- [ ] **Step 1: Reemplazar el bloque de updates**

Buscar exactamente este bloque:

```ts
  const { notes, intake_notes, ...visitFields } = result.data

  // Update service_visits with status + timestamps
  const visitUpdate: Record<string, unknown> = {}
  if (visitFields.started_at !== undefined) visitUpdate.started_at = visitFields.started_at
  if (visitFields.ended_at !== undefined) {
    visitUpdate.ended_at = visitFields.ended_at
    visitUpdate.status = 'completed'
  }

  if (Object.keys(visitUpdate).length > 0) {
    const { error: visitError } = await (supabase as any)
      .from('service_visits')
      .update(visitUpdate)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (visitError) return NextResponse.json({ error: 'Error al actualizar sesión' }, { status: 500 })
  }

  // Update notes in grooming_records (final notes and/or intake notes)
  const recordUpdate: Record<string, unknown> = {}
  if (notes !== undefined) recordUpdate.notes = notes
  if (intake_notes !== undefined) recordUpdate.intake_notes = intake_notes

  if (Object.keys(recordUpdate).length > 0) {
    const { error: recordError } = await (supabase as any)
      .from('grooming_records')
      .update(recordUpdate)
      .eq('visit_id', id)

    if (recordError) return NextResponse.json({ error: 'Error al actualizar notas' }, { status: 500 })
  }
```

Y reemplazarlo por:

```ts
  const { notes, intake_notes, ...visitFields } = result.data

  if (visitFields.ended_at !== undefined) {
    // Concluir: cierre atómico de visita + notas + cita ligada (todo o nada).
    const { error: rpcError } = await (supabase as any).rpc('conclude_service_visit', {
      p_visit_id: id,
      p_ended_at: visitFields.ended_at,
      p_notes: notes ?? null,
      p_intake_notes: intake_notes ?? null,
    })
    if (rpcError) return NextResponse.json({ error: 'Error al concluir el servicio' }, { status: 500 })
  } else {
    // Editar sin concluir (started_at y/o notas).
    const visitUpdate: Record<string, unknown> = {}
    if (visitFields.started_at !== undefined) visitUpdate.started_at = visitFields.started_at
    if (Object.keys(visitUpdate).length > 0) {
      const { error: visitError } = await (supabase as any)
        .from('service_visits')
        .update(visitUpdate)
        .eq('id', id)
        .eq('tenant_id', tenantId)
      if (visitError) return NextResponse.json({ error: 'Error al actualizar sesión' }, { status: 500 })
    }

    const recordUpdate: Record<string, unknown> = {}
    if (notes !== undefined) recordUpdate.notes = notes
    if (intake_notes !== undefined) recordUpdate.intake_notes = intake_notes
    if (Object.keys(recordUpdate).length > 0) {
      const { error: recordError } = await (supabase as any)
        .from('grooming_records')
        .update(recordUpdate)
        .eq('visit_id', id)
      if (recordError) return NextResponse.json({ error: 'Error al actualizar notas' }, { status: 500 })
    }
  }
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

- [ ] **Step 3: Verificar el cierre contra la DB (en una sesión en curso real)**

Listar una sesión in_progress con cita ligada:
```sql
SELECT sv.id AS visit_id, sv.appointment_id, a.status AS appt_status
FROM service_visits sv JOIN appointments a ON a.id = sv.appointment_id
WHERE sv.status = 'in_progress' AND sv.service_type = 'grooming' LIMIT 1;
```
(No mutar aquí — la verificación real del cierre se hace en la prueba manual de Task 8 desde la UI, para no alterar datos a mano. Este SELECT solo confirma que hay una visita con `appointment_id` para probar luego.)

---

## Task 4: Quitar la 2ª llamada de cierre en `GroomingPanel`

**Files:**
- Modify: `components/appointments/panels/GroomingPanel.tsx`

- [ ] **Step 1: Eliminar el PATCH redundante de la cita**

Buscar exactamente:

```tsx
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al concluir sesión'); return }

      await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      toast.success('Servicio de estética concluido')
```

Reemplazar por:

```tsx
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al concluir sesión'); return }

      // El cierre de la cita lo hace el servidor (conclude_service_visit), de forma atómica.
      toast.success('Servicio de estética concluido')
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

---

## Task 5: Prop `overdue` en `DashboardAppointmentCard`

**Files:**
- Modify: `components/dashboard/DashboardAppointmentCard.tsx`

- [ ] **Step 1: Reescribir el componente (añade `overdue`)**

Reemplazar el CONTENIDO COMPLETO de `components/dashboard/DashboardAppointmentCard.tsx` por:

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
  /** Shows a "Vencida" badge + orange accent (derived overdue state). */
  overdue?: boolean
}

export function DashboardAppointmentCard({
  appointment, onSelect, variant = 'upcoming',
  isNext = false, dimmed = false, inService = false, overdue = false,
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
    : overdue
    ? 'border-orange-300 bg-orange-50/40 hover:border-orange-400'
    : 'border-border bg-card hover:border-primary/40'

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment)}
      className={`w-full group flex items-stretch gap-0 rounded-xl border hover:shadow-sm transition-all text-left overflow-hidden ${borderClass}`}
    >
      <span className={`w-1 shrink-0 ${overdue && !dimmed ? 'bg-orange-400' : status.stripe} ${dimmed ? 'opacity-40' : ''}`} aria-hidden />

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
            {overdue && (
              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-orange-200 bg-orange-50 text-orange-600">
                Vencida
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

## Task 6: 5º indicador "Vencidas" en `MetricsStrip`

**Files:**
- Modify: `components/dashboard/MetricsStrip.tsx`

- [ ] **Step 1: Reescribir el componente**

Reemplazar el CONTENIDO COMPLETO de `components/dashboard/MetricsStrip.tsx` por:

```tsx
interface MetricsStripProps {
  inService: number
  total: number
  completed: number
  pendingConfirm: number
  overdue: number
}

export function MetricsStrip({ inService, total, completed, pendingConfirm, overdue }: MetricsStripProps) {
  const items = [
    { value: inService, label: 'En servicio', valueClass: 'text-amber-700', boxClass: 'bg-amber-50 border-amber-100' },
    { value: total, label: 'Hoy', valueClass: 'text-foreground', boxClass: 'bg-card border-border' },
    { value: completed, label: 'Listas', valueClass: 'text-green-700', boxClass: 'bg-green-50 border-green-100' },
    { value: pendingConfirm, label: 'Por confirmar', valueClass: 'text-amber-700', boxClass: 'bg-amber-50 border-amber-100' },
    { value: overdue, label: 'Vencidas', valueClass: 'text-orange-600', boxClass: 'bg-orange-50 border-orange-100' },
  ]
  return (
    <div className="grid grid-cols-5 gap-2">
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

## Task 7: Query de backlog + ids vencidas de hoy + métrica en `page.tsx`

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Añadir import del helper**

Buscar:
```tsx
import type { ActiveServiceItem } from '@/components/dashboard/ActiveServicesBand'
```
Reemplazar por:
```tsx
import type { ActiveServiceItem } from '@/components/dashboard/ActiveServicesBand'
import { isOverdue } from '@/lib/utils/appointment-overdue'
```

- [ ] **Step 2: Añadir la query de backlog y los ids vencidos de hoy**

Buscar exactamente:
```tsx
  const metrics = {
    inService: initialActiveServices.length,
    total: todayAppointments.length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
    pendingConfirm: todayAppointments.filter(a => a.status === 'scheduled').length,
  }
```

Reemplazar por:
```tsx
  // Backlog de citas vencidas (días anteriores, sin resolver, acotado a 60 días)
  const overdueWindowStart = new Date(todayStart.getTime() - 60 * 86400000)
  let overdueQuery = supabase
    .from('appointments')
    .select(`
      id, status, scheduled_at, duration_minutes, reason, service_type,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .in('status', ['scheduled', 'confirmed'])
    .lt('scheduled_at', todayStart.toISOString())
    .gte('scheduled_at', overdueWindowStart.toISOString())
    .order('scheduled_at', { ascending: false })

  if (!showAll && profile?.role === 'doctor') {
    overdueQuery = overdueQuery.eq('assigned_to', user!.id)
  }

  const { data: overdueRaw } = await overdueQuery as { data: any[] | null }
  const overdueAppointments = (overdueRaw ?? []) as DashboardAppointment[]

  // Citas de hoy cuya ventana ya venció (badge "Vencida" inline)
  const nowMs = Date.now()
  const overdueTodayIds = todayAppointments
    .filter(a => isOverdue(a.scheduled_at, a.duration_minutes, a.status, nowMs))
    .map(a => a.id)

  const metrics = {
    inService: initialActiveServices.length,
    total: todayAppointments.length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
    pendingConfirm: todayAppointments.filter(a => a.status === 'scheduled').length,
    overdue: overdueAppointments.length,
  }
```

- [ ] **Step 3: Pasar las nuevas props a `DashboardHome`**

Buscar exactamente:
```tsx
      metrics={metrics}
      team={team ?? []}
      businessHours={businessHours}
      initialActiveServices={initialActiveServices}
    />
```

Reemplazar por:
```tsx
      metrics={metrics}
      team={team ?? []}
      businessHours={businessHours}
      initialActiveServices={initialActiveServices}
      overdueAppointments={overdueAppointments}
      overdueTodayIds={overdueTodayIds}
    />
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: dará algunos errores hasta actualizar `DashboardHome` en Task 8 (props `overdueAppointments`/`overdueTodayIds` y `metrics.overdue` aún no existen ahí). Continúa a Task 8; se verifica en conjunto.

---

## Task 8: Sección "Vencidas", badge en hoy y orden en `DashboardHome`

**Files:**
- Modify: `components/dashboard/DashboardHome.tsx`

- [ ] **Step 1: Reescribir el componente**

Reemplazar el CONTENIDO COMPLETO de `components/dashboard/DashboardHome.tsx` por:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Calendar, AlertTriangle } from 'lucide-react'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'
import { AppointmentDetailDialog } from '@/components/appointments/AppointmentDetailDialog'
import { GroomingSessionModal } from '@/components/servicios/GroomingSessionModal'
import { DashboardAppointmentCard, type DashboardAppointment } from './DashboardAppointmentCard'
import { DashboardCTAs } from './DashboardCTAs'
import { MetricsStrip } from './MetricsStrip'
import { ActiveServicesBand, type ActiveServiceItem } from './ActiveServicesBand'
import type { BusinessHoursConfig } from '@/lib/utils/time-slots'

interface TeamMember { id: string; full_name: string }
interface Metrics { inService: number; total: number; completed: number; pendingConfirm: number; overdue: number }

interface Props {
  greeting: string
  firstName: string
  today: string
  nextAppointment: DashboardAppointment | null
  todayAppointments: DashboardAppointment[]
  futureAppointments: DashboardAppointment[]
  overdueAppointments: DashboardAppointment[]
  overdueTodayIds: string[]
  metrics: Metrics
  team: TeamMember[]
  businessHours: BusinessHoursConfig
  initialActiveServices: ActiveServiceItem[]
}

const ACTIVE = ['scheduled', 'confirmed']

export function DashboardHome({
  greeting, firstName, today,
  nextAppointment, todayAppointments, futureAppointments, overdueAppointments, overdueTodayIds,
  metrics, team, businessHours, initialActiveServices,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<DashboardAppointment | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [newGroomingOpen, setNewGroomingOpen] = useState(false)

  // "En servicio" badge source: seeded from the server snapshot. It re-syncs on
  // router.refresh() (finalize/create), not on the band's background poll — so a
  // service started elsewhere mid-session won't flip the badge until the next refresh.
  const activeApptIds = new Set(
    initialActiveServices.map(s => s.appointment_id).filter((v): v is string => Boolean(v))
  )
  const overdueTodaySet = new Set(overdueTodayIds)

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
          overdue={metrics.overdue}
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
                  overdue={overdueTodaySet.has(apt.id)}
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

        {/* Overdue backlog (previous days) */}
        {overdueAppointments.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.1em] flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Vencidas
              </p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                {overdueAppointments.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {overdueAppointments.map(apt => (
                <DashboardAppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onSelect={setSelected}
                  variant="upcoming"
                  overdue
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

- [ ] **Step 2: Verificar tipos + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'
npx eslint components/dashboard/DashboardHome.tsx components/dashboard/DashboardAppointmentCard.tsx components/dashboard/MetricsStrip.tsx app/dashboard/page.tsx app/api/servicios/estetica/[id]/route.ts lib/utils/appointment-overdue.ts -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;console.log(f.filePath.split("/veterinaias/")[1]);for(const m of r)console.log(`  ${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean")'
```
Expected: `0` y `clean`.

---

## Task 9: Verificación final

- [ ] **Step 1: Typecheck completo**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'`
Expected: `0`

- [ ] **Step 2: Función RPC presente en la DB**

Vía MCP `execute_sql`:
```sql
SELECT proname FROM pg_proc WHERE proname = 'conclude_service_visit';
```
Expected: una fila.

- [ ] **Step 3: Verificación manual (dev server)**

1. **Cierre desde el modal de detalle:** inicia una sesión de estética desde una cita; ve al dashboard o a la lista de Estética, abre el detalle de esa sesión en curso y pulsa "Finalizar servicio". Confirma en la DB que la cita quedó `completed`:
   ```sql
   SELECT a.id, a.status FROM appointments a
   JOIN service_visits sv ON sv.appointment_id = a.id
   WHERE sv.id = '<visit_id>';
   ```
   Expected: `completed`.
2. **Cierre desde el panel de cita:** concluye un servicio desde el panel de la cita → la cita también queda `completed` (ahora server-side, sin la 2ª llamada).
3. **Backlog vencidas:** una cita `confirmed` de un día anterior aparece en la sección "Vencidas" del dashboard; al resolverla con el diálogo (No se presentó / Completar / Cancelar) desaparece y la métrica "Vencidas" baja.
4. **Badge hoy:** una cita de hoy cuya ventana + 30 min ya pasó muestra el badge "Vencida" dentro de "Citas de hoy".

- [ ] **Step 4: Commit (solo cuando el usuario lo pida)**

```bash
git add supabase/migrations/20260602000003_conclude_service_visit_fn.sql lib/utils/appointment-overdue.ts app/api/servicios/estetica/ components/appointments/panels/GroomingPanel.tsx app/dashboard/page.tsx components/dashboard/
git commit -m "feat: cierre transaccional de cita al concluir servicio + manejo de citas vencidas en dashboard"
```

---

## Self-Review (cobertura del spec)

- Auto-cierre server-side transaccional (RPC) → Task 1 (función) + Task 3 (endpoint la invoca). ✓
- Quitar 2ª llamada del cliente en GroomingPanel → Task 4. ✓
- "Vencida" derivada con gracia 30 min, sin tocar enum → Task 2 (helper). ✓
- Resolución manual con el diálogo existente → Task 8 (cards abren `AppointmentDetailDialog`). ✓
- Sección "Vencidas" = backlog de días previos → Task 7 (query) + Task 8 (sección). ✓
- Badge "Vencida" en citas de hoy → Task 5 (prop) + Task 7 (overdueTodayIds) + Task 8 (overdueTodaySet). ✓
- Orden Activos → Hoy → Próximas → Vencidas → Task 8. ✓
- Métricas: 5 números incl. Vencidas → Task 6 + Task 7 (metrics.overdue) + Task 8 (pasa prop). ✓
- Errores: RPC transaccional 500 sin commit parcial (Task 3); backlog vacío no rompe (query con `?? []` en Task 7). ✓
