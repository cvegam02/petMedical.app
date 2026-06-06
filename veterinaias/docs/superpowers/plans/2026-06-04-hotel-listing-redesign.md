# Hotel Listing Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the Hotel page so active stays appear first as rich cards (owner, días restantes, today's note), followed by upcoming reservations, then history.

**Architecture:** Four targeted changes — (1) extract shared boarding utilities, (2) add owner + today's note to the list API, (3) replace `BoardingStaysTable` with two new focused components (`ActiveBoardingStays` cards and `BoardingHistoryTable`), (4) reorder the page. Both new client components share the same `/api/servicios/hotel` endpoint and filter in the browser.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS + shadcn/ui, Supabase

---

### Task 1: Extract shared boarding utils

**Files:**
- Modify: `veterinaias/lib/utils/boarding.ts`
- Modify: `veterinaias/components/servicios/BoardingStayDetail.tsx`

- [ ] **Step 1: Append helpers to `lib/utils/boarding.ts`**

```typescript
function toLocalDateStr(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function calendarDiff(fromDateStr: string, toDateStr: string): number {
  return Math.round(
    (new Date(toDateStr + 'T12:00:00').getTime() - new Date(fromDateStr + 'T12:00:00').getTime()) / 86400000
  )
}

export function stayDayLabel(startedAt: string | null, expectedCheckOut: string | null): string {
  if (!startedAt) return '—'
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const startDate = toLocalDateStr(startedAt)
  const day = Math.max(1, calendarDiff(startDate, todayDate) + 1)
  if (!expectedCheckOut) return `Día ${day}`
  const total = Math.max(1, calendarDiff(startDate, toLocalDateStr(expectedCheckOut)) + 1)
  return `Día ${day} de ${total}`
}

export function remainingDaysLabel(
  expectedCheckOut: string | null,
  endedAt: string | null,
  now: number = Date.now(),
): string | null {
  if (endedAt || !expectedCheckOut) return null
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const checkout = new Date(
    expectedCheckOut.length === 10 ? expectedCheckOut + 'T12:00:00' : expectedCheckOut
  )
  checkout.setHours(0, 0, 0, 0)
  const diff = Math.round((checkout.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return null
  if (diff === 0) return 'Sale hoy'
  return `${diff} día${diff === 1 ? '' : 's'} restante${diff === 1 ? '' : 's'}`
}
```

- [ ] **Step 2: Update `BoardingStayDetail.tsx` — remove duplicated helpers, import new ones**

In `veterinaias/components/servicios/BoardingStayDetail.tsx`:

1. Update the import line:
```typescript
// Before:
import { isCheckoutOverdue, stayDays } from '@/lib/utils/boarding'
// After:
import { isCheckoutOverdue, stayDays, stayDayLabel, remainingDaysLabel } from '@/lib/utils/boarding'
```

2. Delete these four local functions entirely (lines ~47–66):
```typescript
function toLocalDate(iso: string): string { ... }
function calendarDiff(fromDateStr: string, toDateStr: string): number { ... }
function stayDayLabel(startedAt: string | null, expectedCheckOut: string | null): string { ... }
function todayStr(): string { ... }
```

3. Replace `const today = todayStr()` inside `BoardingStayDetail` component body with:
```typescript
const pad = (n: number) => String(n).padStart(2, '0')
const _now = new Date()
const today = `${_now.getFullYear()}-${pad(_now.getMonth() + 1)}-${pad(_now.getDate())}`
```

- [ ] **Step 3: Type check**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors in `boarding.ts` or `BoardingStayDetail.tsx`

- [ ] **Step 4: Commit**

```bash
git add veterinaias/lib/utils/boarding.ts veterinaias/components/servicios/BoardingStayDetail.tsx
git commit -m "refactor: extract stayDayLabel and remainingDaysLabel to boarding utils"
```

---

### Task 2: Add owner and today's note to the list API

**Files:**
- Modify: `veterinaias/app/api/servicios/hotel/route.ts`

- [ ] **Step 1: Replace `STAY_SELECT` and `mapStay`**

In `veterinaias/app/api/servicios/hotel/route.ts`, replace the existing `STAY_SELECT` const and `mapStay` function with:

```typescript
const STAY_SELECT = `
  id, started_at, ended_at, status, created_at, appointment_id,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name, phone),
  record:boarding_records(expected_check_out, feeding_instructions, belongings, special_care, notes),
  daily_logs:boarding_daily_logs(log_date, notes, fed, walked)
`

function mapStay(row: any) {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  const today = new Date().toISOString().split('T')[0]
  const logs: any[] = Array.isArray(row.daily_logs) ? row.daily_logs : []
  const todayLog = logs.find((l: any) => l.log_date === today) ?? null
  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status,
    created_at: row.created_at,
    appointment_id: row.appointment_id,
    pet: row.pet ?? null,
    owner: row.owner ?? null,
    expected_check_out: record?.expected_check_out ?? null,
    feeding_instructions: record?.feeding_instructions ?? null,
    belongings: record?.belongings ?? null,
    special_care: record?.special_care ?? null,
    notes: record?.notes ?? null,
    today_note: todayLog?.notes ?? null,
  }
}
```

- [ ] **Step 2: Type check**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/api/servicios/hotel/route.ts
git commit -m "feat: add owner and today's note to hotel stays list API"
```

---

### Task 3: Create `ActiveBoardingStays` component

**Files:**
- Create: `veterinaias/components/servicios/ActiveBoardingStays.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, BedDouble } from 'lucide-react'
import { isCheckoutOverdue, stayDayLabel, remainingDaysLabel } from '@/lib/utils/boarding'

interface StayRow {
  id: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  today_note: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short',
  })
}

export function ActiveBoardingStays() {
  const router = useRouter()
  const [stays, setStays] = useState<StayRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/servicios/hotel')
      const json = await res.json()
      const all: StayRow[] = json.data ?? []
      setStays(all.filter(s => s.started_at && !s.ended_at))
    } catch {
      setStays([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const refetch = () => load()
    window.addEventListener('hotel:changed', refetch)
    return () => window.removeEventListener('hotel:changed', refetch)
  }, [])

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.1em]">En hospedaje</p>
        {!loading && stays.length > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {stays.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : stays.length === 0 ? (
        <div className="text-center py-12 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <BedDouble size={24} strokeWidth={1.5} className="mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-foreground">Sin huéspedes activos</p>
          <p className="text-xs text-muted-foreground mt-1">
            Haz check-in desde la agenda o el dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {stays.map(s => {
            const overdue = isCheckoutOverdue(s.expected_check_out, s.started_at, s.ended_at)
            const remaining = remainingDaysLabel(s.expected_check_out, s.ended_at)
            const subtitle = [s.pet?.species?.name, s.owner?.full_name].filter(Boolean).join(' · ')
            return (
              <div
                key={s.id}
                onClick={() => router.push(`/dashboard/servicios/hotel/${s.id}`)}
                className="rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors cursor-pointer p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {stayDayLabel(s.started_at, s.expected_check_out)}
                      </span>
                      {!overdue && remaining && (
                        <span className="text-xs px-2 py-0.5 rounded-full border text-muted-foreground border-border/60">
                          {remaining}
                        </span>
                      )}
                      {overdue && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-orange-600 bg-orange-50 border-orange-200">
                          Salida vencida
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-foreground">{s.pet?.name ?? '—'}</p>
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                    <div className="flex items-baseline gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>{formatDate(s.started_at)} → {formatDate(s.expected_check_out)}</span>
                      {s.today_note && (
                        <span className="italic">
                          &ldquo;{s.today_note.length > 60 ? s.today_note.slice(0, 57) + '…' : s.today_note}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30 mt-1 shrink-0" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/servicios/ActiveBoardingStays.tsx
git commit -m "feat: add ActiveBoardingStays cards with owner, días restantes, and today's note"
```

---

### Task 4: Create `BoardingHistoryTable` component

**Files:**
- Create: `veterinaias/components/servicios/BoardingHistoryTable.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface StayRow {
  id: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short',
  })
}

export function BoardingHistoryTable() {
  const router = useRouter()
  const [stays, setStays] = useState<StayRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/servicios/hotel')
      const json = await res.json()
      const all: StayRow[] = json.data ?? []
      setStays(all.filter(s => !!s.ended_at))
    } catch {
      setStays([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const refetch = () => load()
    window.addEventListener('hotel:changed', refetch)
    return () => window.removeEventListener('hotel:changed', refetch)
  }, [])

  if (loading || stays.length === 0) return null

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.1em]">Historial</p>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {stays.length}
        </span>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Mascota
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Entrada
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Salida
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {stays.map(s => (
              <tr
                key={s.id}
                onClick={() => router.push(`/dashboard/servicios/hotel/${s.id}`)}
                className="hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{s.pet?.name ?? '—'}</p>
                  {s.pet?.species?.name && (
                    <p className="text-xs text-muted-foreground">{s.pet.species.name}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground whitespace-nowrap">
                  {formatDate(s.started_at)}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(s.ended_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add veterinaias/components/servicios/BoardingHistoryTable.tsx
git commit -m "feat: add BoardingHistoryTable for ended boarding stays"
```

---

### Task 5: Update the hotel page and remove dead code

**Files:**
- Modify: `veterinaias/app/dashboard/servicios/hotel/page.tsx`
- Delete: `veterinaias/components/servicios/BoardingStaysTable.tsx`

- [ ] **Step 1: Replace page content**

Replace the entire content of `veterinaias/app/dashboard/servicios/hotel/page.tsx` with:

```typescript
import { BedDouble } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { ActiveBoardingStays } from '@/components/servicios/ActiveBoardingStays'
import { BoardingHistoryTable } from '@/components/servicios/BoardingHistoryTable'
import { HotelUpcomingReservations } from '@/components/servicios/HotelUpcomingReservations'
import { NewHotelReservationButton } from '@/components/servicios/NewHotelReservationButton'

export default async function HotelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user!.id)
    .single() as any

  const businessHours = (profile?.tenants as any)?.settings?.business_hours ?? DEFAULT_BUSINESS_HOURS

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name') as { data: { id: string; full_name: string }[] | null }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="space-y-1 mb-8">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Servicios</p>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BedDouble size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Hotel
          </h1>
          <NewHotelReservationButton team={team ?? []} businessHours={businessHours} />
        </div>
      </div>
      <ActiveBoardingStays />
      <HotelUpcomingReservations />
      <BoardingHistoryTable />
    </div>
  )
}
```

- [ ] **Step 2: Delete dead `BoardingStaysTable.tsx`**

```bash
rm veterinaias/components/servicios/BoardingStaysTable.tsx
```

- [ ] **Step 3: Full type check**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -40
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add veterinaias/app/dashboard/servicios/hotel/page.tsx
git rm veterinaias/components/servicios/BoardingStaysTable.tsx
git commit -m "feat: reorder hotel page — active stays first, then upcoming, then history"
```
