# Hotel — página de estancia + pulido de salidas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página dedicada de estancia de Hotel con línea de tiempo día por día + bitácora editable por día (una por día), y pulido de salidas (salida esperada en la banda, check-out vencido, chip de Hotel en el dashboard).

**Architecture:** La tabla de Hotel navega a `/dashboard/servicios/hotel/[id]` (client component `BoardingStayDetail` que carga estancia + bitácora por id). La bitácora pasa a una entrada por día (`UNIQUE(visit_id, log_date)`, upsert). La banda del dashboard conserva su modal pero gana la salida esperada y el badge de salida vencida; un chip "Hotel" muestra conteos.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS), TypeScript, Tailwind, lucide-react, sonner.

**Spec:** `docs/superpowers/specs/2026-06-02-hotel-stay-page-design.md`

**Convenciones:** Sin tests. Sin commits por tarea (commit final cuando el usuario lo pida). Lint acepta solo patrones pre-existentes (`@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, `react-hooks/purity`, `react-hooks/exhaustive-deps`). Comandos desde `/home/cvega/Documentos/Projects/VeterinaIAs/veterinaias`. Supabase project ref `qgruuhrgwgjduzlctdlx`; `(supabase as any)` para tablas no tipadas. Migraciones las aplica el controlador vía MCP `apply_migration` y se guardan en `supabase/migrations/`.

---

## Task 1: Migración — una bitácora por día

**Files:**
- Create: `supabase/migrations/20260602000007_boarding_daily_log_unique.sql`

- [ ] **Step 1: Crear el archivo**

```sql
-- 20260602000007_boarding_daily_log_unique.sql
-- Bitácora de hotel: una entrada por día. Dedup previo (conserva la más reciente) y UNIQUE.

DELETE FROM boarding_daily_logs a
USING boarding_daily_logs b
WHERE a.visit_id = b.visit_id
  AND a.log_date = b.log_date
  AND a.created_at < b.created_at;

ALTER TABLE boarding_daily_logs
  ADD CONSTRAINT boarding_daily_logs_visit_day_unique UNIQUE (visit_id, log_date);
```

- [ ] **Step 2: Aplicar (controlador)**

MCP `apply_migration` (project_id `qgruuhrgwgjduzlctdlx`, name `boarding_daily_log_unique`).

- [ ] **Step 3: Verificar**

MCP `execute_sql`:
```sql
SELECT conname FROM pg_constraint WHERE conname = 'boarding_daily_logs_visit_day_unique';
```
Expected: una fila.

---

## Task 2: Helper `lib/utils/boarding.ts`

**Files:**
- Create: `lib/utils/boarding.ts`

- [ ] **Step 1: Crear el archivo**

```ts
export function isCheckoutOverdue(
  expectedCheckOut: string | null,
  startedAt: string | null,
  endedAt: string | null,
  now: number = Date.now(),
): boolean {
  if (endedAt || !startedAt || !expectedCheckOut) return false
  return now > new Date(expectedCheckOut).getTime()
}

export function isCheckoutToday(expectedCheckOut: string | null, now: number = Date.now()): boolean {
  if (!expectedCheckOut) return false
  const d = new Date(expectedCheckOut)
  const n = new Date(now)
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

/** Fechas (YYYY-MM-DD) de la estancia, de la entrada al fin del rango, inclusivo. */
export function stayDays(startedAt: string | null, endDateMs: number): string[] {
  if (!startedAt) return []
  const start = new Date(startedAt); start.setHours(0, 0, 0, 0)
  const end = new Date(endDateMs); end.setHours(0, 0, 0, 0)
  const out: string[] = []
  const pad = (n: number) => String(n).padStart(2, '0')
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const d = new Date(t)
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }
  return out
}
```

- [ ] **Step 2: Verificar** — `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` → `0`.

---

## Task 3: Bitácora POST → upsert

**Files:**
- Modify: `app/api/servicios/hotel/[id]/daily-logs/route.ts`

- [ ] **Step 1: Cambiar el insert por upsert**

Buscar:
```ts
  const { data, error } = await (supabase as any)
    .from('boarding_daily_logs')
    .insert({
      visit_id: id,
      log_date: result.data.log_date ?? new Date().toISOString().split('T')[0],
      notes: result.data.notes ?? null,
      fed: result.data.fed ?? false,
      walked: result.data.walked ?? false,
      created_by: user.id,
    })
    .select('id, log_date, notes, fed, walked, created_at')
    .single()
  if (error) return NextResponse.json({ error: 'Error al guardar la entrada' }, { status: 500 })
```
Reemplazar por:
```ts
  const { data, error } = await (supabase as any)
    .from('boarding_daily_logs')
    .upsert({
      visit_id: id,
      log_date: result.data.log_date ?? new Date().toISOString().split('T')[0],
      notes: result.data.notes ?? null,
      fed: result.data.fed ?? false,
      walked: result.data.walked ?? false,
      created_by: user.id,
    }, { onConflict: 'visit_id,log_date' })
    .select('id, log_date, notes, fed, walked, created_at')
    .single()
  if (error) return NextResponse.json({ error: 'Error al guardar la entrada' }, { status: 500 })
```

- [ ] **Step 2: Verificar** — tsc → `0`.

---

## Task 4: `expected_check_out` en los servicios activos + `hotelCounts`

**Files:**
- Modify: `app/api/service-visits/active/route.ts`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Endpoint — embed boarding + map**

En `app/api/service-visits/active/route.ts`, buscar el `.select(` y agregar el embed de boarding. Buscar:
```ts
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name))
    `)
```
Reemplazar por:
```ts
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name)),
      boarding:boarding_records(expected_check_out)
    `)
```
Y en el `.map((row: any) => {` del endpoint, buscar:
```ts
      services: record?.services ?? [],
      pet: row.pet ?? null,
    }
```
Reemplazar por:
```ts
      services: record?.services ?? [],
      pet: row.pet ?? null,
      expected_check_out: (Array.isArray(row.boarding) ? row.boarding[0] : row.boarding)?.expected_check_out ?? null,
    }
```

- [ ] **Step 2: `app/dashboard/page.tsx` — mismo embed + map + hotelCounts**

(a) Import del helper — buscar:
```tsx
import { isOverdue } from '@/lib/utils/appointment-overdue'
```
Reemplazar por:
```tsx
import { isOverdue } from '@/lib/utils/appointment-overdue'
import { isCheckoutOverdue, isCheckoutToday } from '@/lib/utils/boarding'
```

(b) Embed en la query de activos — buscar:
```tsx
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name))
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'in_progress')
```
Reemplazar por:
```tsx
      record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name)),
      boarding:boarding_records(expected_check_out)
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'in_progress')
```

(c) Map — buscar:
```tsx
      services: record?.services ?? [],
      pet: row.pet ?? null,
      appointment_id: row.appointment_id,
    }
  })
```
Reemplazar por:
```tsx
      services: record?.services ?? [],
      pet: row.pet ?? null,
      appointment_id: row.appointment_id,
      expected_check_out: (Array.isArray(row.boarding) ? row.boarding[0] : row.boarding)?.expected_check_out ?? null,
    }
  })
```

(d) Conteos de hotel + pasar prop — buscar:
```tsx
  const metrics = {
    inService: initialActiveServices.length,
```
Insertar ANTES de esa línea:
```tsx
  const nowForHotel = Date.now()
  const boardingActive = initialActiveServices.filter(s => s.service_type === 'boarding')
  const hotelCounts = {
    checkoutsToday: boardingActive.filter(s => isCheckoutToday(s.expected_check_out, nowForHotel)).length,
    lateCheckouts: boardingActive.filter(s => isCheckoutOverdue(s.expected_check_out, s.started_at, s.ended_at, nowForHotel)).length,
  }

```
Y en el render, buscar:
```tsx
      initialActiveServices={initialActiveServices}
      overdueAppointments={overdueAppointments}
      overdueTodayIds={overdueTodayIds}
    />
```
Reemplazar por:
```tsx
      initialActiveServices={initialActiveServices}
      overdueAppointments={overdueAppointments}
      overdueTodayIds={overdueTodayIds}
      hotelCounts={hotelCounts}
    />
```

- [ ] **Step 3: Verificar** — tsc dará error hasta cablear `ActiveServiceItem.expected_check_out` (Task 5) y la prop `hotelCounts` (Task 6). Continúa; se verifica al cierre.

---

## Task 5: Banda de activos — salida esperada + salida vencida

**Files:**
- Modify: `components/dashboard/ActiveServicesBand.tsx`

- [ ] **Step 1: Tipo + import del helper**

Buscar:
```tsx
import { BoardingStayDetailModal } from '@/components/servicios/BoardingStayDetailModal'

export interface ActiveServiceItem extends GroomingSessionDetail {
  service_type: ServiceType
  appointment_id: string | null
}
```
Reemplazar por:
```tsx
import { BoardingStayDetailModal } from '@/components/servicios/BoardingStayDetailModal'
import { isCheckoutOverdue } from '@/lib/utils/boarding'

export interface ActiveServiceItem extends GroomingSessionDetail {
  service_type: ServiceType
  appointment_id: string | null
  expected_check_out: string | null
}
```

- [ ] **Step 2: Helper de etiqueta con fecha de salida**

Buscar:
```tsx
function boardingDayLabel(startedAt: string | null, now: number): string {
  if (!startedAt) return '—'
  const day = Math.max(1, Math.floor((now - new Date(startedAt).getTime()) / 86400000) + 1)
  return `Día ${day}`
}
```
Reemplazar por:
```tsx
function boardingDayLabel(startedAt: string | null, expectedCheckOut: string | null, now: number): string {
  if (!startedAt) return '—'
  const day = Math.max(1, Math.floor((now - new Date(startedAt).getTime()) / 86400000) + 1)
  if (!expectedCheckOut) return `Día ${day}`
  const sale = new Date(expectedCheckOut).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  return `Día ${day} · sale ${sale}`
}
```

- [ ] **Step 3: Render de la etiqueta (con salida vencida)**

Buscar:
```tsx
              <span className="flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
                <Timer size={12} />
                {item.service_type === 'boarding' ? boardingDayLabel(item.started_at, now) : elapsedLabel(item.started_at, now)}
              </span>
```
Reemplazar por:
```tsx
              {item.service_type === 'boarding' && isCheckoutOverdue(item.expected_check_out, item.started_at, item.ended_at, now) ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 whitespace-nowrap shrink-0">
                  <Timer size={12} />
                  Salida vencida
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
                  <Timer size={12} />
                  {item.service_type === 'boarding' ? boardingDayLabel(item.started_at, item.expected_check_out, now) : elapsedLabel(item.started_at, now)}
                </span>
              )}
```

- [ ] **Step 4: Verificar** — tsc → `0`; lint del archivo `clean`.

---

## Task 6: Chip "Hotel" en el dashboard

**Files:**
- Modify: `components/dashboard/DashboardHome.tsx`

- [ ] **Step 1: Prop + interface**

Buscar:
```tsx
import { Calendar, AlertTriangle } from 'lucide-react'
```
Reemplazar por:
```tsx
import { Calendar, AlertTriangle, BedDouble } from 'lucide-react'
```

Buscar:
```tsx
interface Metrics { inService: number; total: number; completed: number; pendingConfirm: number; overdue: number }
```
Reemplazar por:
```tsx
interface Metrics { inService: number; total: number; completed: number; pendingConfirm: number; overdue: number }
interface HotelCounts { checkoutsToday: number; lateCheckouts: number }
```

Buscar:
```tsx
  overdueAppointments: DashboardAppointment[]
  overdueTodayIds: string[]
  metrics: Metrics
```
Reemplazar por:
```tsx
  overdueAppointments: DashboardAppointment[]
  overdueTodayIds: string[]
  hotelCounts: HotelCounts
  metrics: Metrics
```

Buscar (la destructuración de props):
```tsx
  nextAppointment, todayAppointments, futureAppointments, overdueAppointments, overdueTodayIds,
  metrics, team, businessHours, initialActiveServices,
```
Reemplazar por:
```tsx
  nextAppointment, todayAppointments, futureAppointments, overdueAppointments, overdueTodayIds,
  hotelCounts, metrics, team, businessHours, initialActiveServices,
```

- [ ] **Step 2: Render del chip (arriba de la banda)**

Buscar:
```tsx
      <div className="space-y-8">
        {/* Active services */}
        <ActiveServicesBand
```
Reemplazar por:
```tsx
      <div className="space-y-8">
        {/* Hotel chip */}
        {(hotelCounts.checkoutsToday > 0 || hotelCounts.lateCheckouts > 0) && (
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-medium">
              <BedDouble size={13} />
              {hotelCounts.checkoutsToday > 0 && (
                <span>{hotelCounts.checkoutsToday} {hotelCounts.checkoutsToday === 1 ? 'sale hoy' : 'salen hoy'}</span>
              )}
              {hotelCounts.checkoutsToday > 0 && hotelCounts.lateCheckouts > 0 && <span className="text-amber-300">·</span>}
              {hotelCounts.lateCheckouts > 0 && (
                <span className="text-orange-600">{hotelCounts.lateCheckouts} {hotelCounts.lateCheckouts === 1 ? 'salida vencida' : 'salidas vencidas'}</span>
              )}
            </span>
          </div>
        )}

        {/* Active services */}
        <ActiveServicesBand
```

- [ ] **Step 3: Verificar** — tsc → `0`; lint `clean`.

---

## Task 7: Tabla de Hotel — navegar a la página + badge

**Files:**
- Modify: `components/servicios/BoardingStaysTable.tsx`

- [ ] **Step 1: Reescribir el componente**

Reemplazar el CONTENIDO COMPLETO de `components/servicios/BoardingStaysTable.tsx` por:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isCheckoutOverdue } from '@/lib/utils/boarding'

interface StayRow {
  id: string
  status: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function dayLabel(startedAt: string | null): string {
  if (!startedAt) return '—'
  const day = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000) + 1)
  return `Día ${day}`
}

export function BoardingStaysTable() {
  const router = useRouter()
  const [stays, setStays] = useState<StayRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/servicios/hotel')
    const json = await res.json()
    setStays(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const inProgress = stays.filter(s => s.started_at && !s.ended_at)
  const past = stays.filter(s => s.ended_at)

  function renderRow(s: StayRow) {
    const active = s.started_at && !s.ended_at
    const overdue = isCheckoutOverdue(s.expected_check_out, s.started_at, s.ended_at)
    return (
      <tr
        key={s.id}
        onClick={() => router.push(`/dashboard/servicios/hotel/${s.id}`)}
        className="hover:bg-muted/20 transition-colors cursor-pointer"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {active ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{dayLabel(s.started_at)}
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-green-700 bg-green-50 border-green-200">Finalizada</span>
            )}
            {overdue && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-orange-200 bg-orange-50 text-orange-600">Salida vencida</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{s.pet?.name ?? '—'}</p>
          {s.pet?.species?.name && <p className="text-xs text-muted-foreground">{s.pet.species.name}</p>}
        </td>
        <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatDate(s.started_at)}</td>
        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(s.ended_at ?? s.expected_check_out)}</td>
      </tr>
    )
  }

  return (
    <div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : stays.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin estancias registradas</p>
          <p className="text-xs text-muted-foreground mt-1">Crea una reserva de hotel desde la agenda o el dashboard.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Mascota</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Entrada</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Salida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {inProgress.map(renderRow)}
              {past.map(renderRow)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar** — tsc → `0`; lint del archivo `clean`.

---

## Task 8: Badge salida vencida en el modal (banda)

**Files:**
- Modify: `components/servicios/BoardingStayDetailModal.tsx`

- [ ] **Step 1: Import del helper**

Buscar:
```tsx
import { Textarea } from '@/components/ui/textarea'
```
Reemplazar por:
```tsx
import { Textarea } from '@/components/ui/textarea'
import { isCheckoutOverdue } from '@/lib/utils/boarding'
```

- [ ] **Step 2: Mostrar el badge junto al "Día N de M"**

Buscar:
```tsx
              {inProgress && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                  {stayDayLabel(stay.started_at, stay.expected_check_out)}
                </span>
              )}
```
Reemplazar por:
```tsx
              {inProgress && (
                isCheckoutOverdue(stay.expected_check_out, stay.started_at, stay.ended_at) ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border text-orange-600 bg-orange-50 border-orange-200">
                    Salida vencida
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                    {stayDayLabel(stay.started_at, stay.expected_check_out)}
                  </span>
                )
              )}
```

- [ ] **Step 3: Verificar** — tsc → `0`.

---

## Task 9: Página de estancia + componente de línea de tiempo

**Files:**
- Create: `components/servicios/BoardingStayDetail.tsx`
- Create: `app/dashboard/servicios/hotel/[id]/page.tsx`

- [ ] **Step 1: Crear `components/servicios/BoardingStayDetail.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BedDouble, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isCheckoutOverdue, stayDays } from '@/lib/utils/boarding'

interface Stay {
  id: string
  status: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  feeding_instructions: string | null
  belongings: string | null
  special_care: string | null
  notes: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

interface DailyLog {
  id: string
  log_date: string
  notes: string | null
  fed: boolean
  walked: boolean
}

function fmtDateTime(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function todayStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtDayHeader(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'short' })
}

function stayDayLabel(startedAt: string | null, expectedCheckOut: string | null): string {
  if (!startedAt) return '—'
  const day = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000) + 1)
  if (!expectedCheckOut) return `Día ${day}`
  const total = Math.max(1, Math.round((new Date(expectedCheckOut).getTime() - new Date(startedAt).getTime()) / 86400000))
  return `Día ${day} de ${total}`
}

function DayRow({ visitId, date, editable, isToday, log, onSaved }: {
  visitId: string; date: string; editable: boolean; isToday: boolean; log: DailyLog | undefined; onSaved: (l: DailyLog) => void
}) {
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [fed, setFed] = useState(log?.fed ?? false)
  const [walked, setWalked] = useState(log?.walked ?? false)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}/daily-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_date: date, notes: notes.trim() || undefined, fed, walked }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      onSaved(json.data)
      toast.success('Guardado')
    } catch {
      toast.error('Error de red.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${isToday ? 'border-primary/40 bg-primary/[0.03]' : 'border-border/60'} ${!editable ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground capitalize">
          {fmtDayHeader(date)} {isToday && <span className="text-[10px] font-bold text-primary ml-1">HOY</span>}
        </p>
      </div>
      {editable ? (
        <div className="space-y-2">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas del día…" className="resize-none h-14 text-sm" />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={fed} onChange={e => setFed(e.target.checked)} /> Alimentó
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={walked} onChange={e => setWalked(e.target.checked)} /> Paseó
            </label>
            <Button size="sm" variant="outline" className="ml-auto" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Día futuro</p>
      )}
    </div>
  )
}

export function BoardingStayDetail({ visitId }: { visitId: string }) {
  const router = useRouter()
  const [stay, setStay] = useState<Stay | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [stayRes, logsRes] = await Promise.all([
        fetch(`/api/servicios/hotel/${visitId}`),
        fetch(`/api/servicios/hotel/${visitId}/daily-logs`),
      ])
      const stayJson = await stayRes.json()
      const logsJson = await logsRes.json()
      setStay(stayRes.ok ? stayJson.data : null)
      setLogs(logsRes.ok ? (logsJson.data ?? []) : [])
    } catch {
      setStay(null); setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [visitId])

  async function checkOut() {
    if (!stay) return
    setCheckingOut(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ended_at: new Date().toISOString(), ...(checkoutNotes.trim() ? { notes: checkoutNotes.trim() } : {}) }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error en el check-out'); return }
      toast.success('Check-out realizado')
      router.push('/dashboard/servicios/hotel')
    } catch {
      toast.error('Error de red.')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
  if (!stay) return <p className="text-sm text-muted-foreground py-8 text-center">Estancia no encontrada.</p>

  const inProgress = !!stay.started_at && !stay.ended_at
  const overdue = isCheckoutOverdue(stay.expected_check_out, stay.started_at, stay.ended_at)
  const today = todayStr()
  const endMs = stay.ended_at
    ? new Date(stay.ended_at).getTime()
    : stay.expected_check_out
    ? Math.max(new Date(stay.expected_check_out).getTime(), Date.now())
    : Date.now()
  const days = stayDays(stay.started_at, endMs)
  const logByDate = new Map(logs.map(l => [l.log_date, l]))

  function onDaySaved(saved: DailyLog) {
    setLogs(prev => {
      const rest = prev.filter(l => l.log_date !== saved.log_date)
      return [...rest, saved]
    })
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <Link href="/dashboard/servicios/hotel" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft size={14} /> Hotel
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <BedDouble size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{stay.pet?.name ?? '—'}</h1>
            {stay.pet?.species?.name && <p className="text-xs text-muted-foreground">{stay.pet.species.name}</p>}
          </div>
        </div>
        {inProgress && (
          overdue ? (
            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border text-orange-600 bg-orange-50 border-orange-200">Salida vencida</span>
          ) : (
            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">{stayDayLabel(stay.started_at, stay.expected_check_out)}</span>
          )
        )}
        {!inProgress && (
          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border text-green-700 bg-green-50 border-green-200">Finalizada</span>
        )}
      </div>

      {/* Recepción */}
      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 space-y-1 text-sm mb-6">
        <p>Entrada: <span className="text-muted-foreground">{fmtDateTime(stay.started_at)}</span></p>
        <p>Salida esperada: <span className="text-muted-foreground">{fmtDateTime(stay.expected_check_out)}</span></p>
        {stay.ended_at && <p>Salida: <span className="text-muted-foreground">{fmtDateTime(stay.ended_at)}</span></p>}
        <div className="pt-1 space-y-0.5">
          <p><span className="font-medium">Alimentación:</span> {stay.feeding_instructions || '—'}</p>
          <p><span className="font-medium">Pertenencias:</span> {stay.belongings || '—'}</p>
          <p><span className="font-medium">Cuidados:</span> {stay.special_care || '—'}</p>
        </div>
      </div>

      {/* Línea de tiempo */}
      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.1em] mb-3">Bitácora por día</p>
      <div className="space-y-2">
        {days.map(date => (
          <DayRow
            key={date}
            visitId={visitId}
            date={date}
            isToday={date === today}
            editable={date <= today}
            log={logByDate.get(date)}
            onSaved={onDaySaved}
          />
        ))}
      </div>

      {/* Check-out */}
      {inProgress && (
        <div className="mt-6 border-t border-border/60 pt-4 space-y-2">
          <Label className="text-xs">Notas de salida (opcional)</Label>
          <Textarea value={checkoutNotes} onChange={e => setCheckoutNotes(e.target.value)} className="resize-none h-16 text-sm" placeholder="Estado al entregar…" />
          <Button className="w-full" onClick={checkOut} disabled={checkingOut}>
            {checkingOut ? 'Procesando…' : 'Check-out'}
          </Button>
        </div>
      )}

      {!inProgress && stay.notes && (
        <div className="mt-6 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas de salida</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{stay.notes}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Crear `app/dashboard/servicios/hotel/[id]/page.tsx`**

```tsx
import { BoardingStayDetail } from '@/components/servicios/BoardingStayDetail'

export default async function HotelStayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <BoardingStayDetail visitId={id} />
}
```

- [ ] **Step 3: Verificar tipos + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'
npx eslint components/servicios/BoardingStayDetail.tsx 'app/dashboard/servicios/hotel/[id]/page.tsx' -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;console.log(f.filePath.split("/veterinaias/")[1]);for(const m of r)console.log(`  ${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean")'
```
Expected: `0` y `clean`.

---

## Task 10: Verificación final

- [ ] **Step 1: Typecheck completo** — `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c 'error TS'` → `0`.

- [ ] **Step 2: Lint del set**

Run:
```bash
npx eslint \
  lib/utils/boarding.ts \
  'app/api/servicios/hotel/[id]/daily-logs/route.ts' \
  app/api/service-visits/active/route.ts app/dashboard/page.tsx \
  components/dashboard/ActiveServicesBand.tsx components/dashboard/DashboardHome.tsx \
  components/servicios/BoardingStaysTable.tsx components/servicios/BoardingStayDetailModal.tsx components/servicios/BoardingStayDetail.tsx \
  'app/dashboard/servicios/hotel/[id]/page.tsx' \
  -f json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0));let n=0;for(const f of d){const r=f.messages.filter(m=>!["@typescript-eslint/no-explicit-any","react-hooks/set-state-in-effect","react-hooks/purity","react-hooks/exhaustive-deps"].includes(m.ruleId));if(r.length){n++;console.log(f.filePath.split("/veterinaias/")[1]);for(const m of r)console.log(`  ${m.line}:${m.column} ${m.ruleId}`)}}if(!n)console.log("clean (solo patrones pre-existentes)")'
```
Expected: `clean (solo patrones pre-existentes)`.

- [ ] **Step 3: Verificación manual** — ver la sección Testing del spec (navegar a la página, llenar bitácora del día, badge salida vencida, chip, check-out).

- [ ] **Step 4: Commit (solo cuando el usuario lo pida)**

```bash
git add supabase/migrations/20260602000007_boarding_daily_log_unique.sql lib/utils/boarding.ts app/api/ app/dashboard/ components/dashboard/ components/servicios/
git commit -m "feat: Hotel — página de estancia con bitácora por día + pulido de salidas"
```

---

## Self-Review (cobertura del spec)

- Página de estancia con línea de tiempo día por día → Task 9. ✓
- Bitácora una por día editable (upsert + UNIQUE) → Task 1 (constraint) + Task 3 (upsert) + Task 9 (DayRow). ✓
- Días editables solo hasta hoy → Task 9 (`editable={date <= today}`). ✓
- Tabla navega a la página + badge salida vencida → Task 7. ✓
- Banda conserva modal; salida esperada + salida vencida → Task 5 (+ Task 8 badge en modal). ✓
- `expected_check_out` en items activos → Task 4 (endpoint + page). ✓
- Chip "Hotel" (salen hoy / vencidas), conteos server-side → Task 4 (cálculo) + Task 6 (render). ✓
- Helper `isCheckoutOverdue`/`isCheckoutToday`/`stayDays` → Task 2. ✓

**Placeholder scan:** sin TBD/TODO. **Consistencia:** `expected_check_out` se agrega a `ActiveServiceItem` (Task 5) y se mapea en endpoint+page (Task 4); `hotelCounts` se calcula en page (Task 4) y se consume en DashboardHome (Task 6); el shape de estancia (`expected_check_out`, `feeding_instructions`, `belongings`, `special_care`, `notes`, `pet`) es consistente entre `/[id]` GET, la página (Task 9) y la tabla (Task 7).
