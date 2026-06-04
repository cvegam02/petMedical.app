# Consultation Service Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/dashboard/servicios/consulta` — a filterable list of all tenant consultations with quick navigation to each patient's record — plus a "Consultas" sidebar entry.

**Architecture:** Three new files: an API route that queries `service_visits` (type=consultation) with embedded `consultation_records`, a client `ConsultationList` component with vet/date filters, and a server page component that loads the team and renders the list. One sidebar modification.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgREST), Tailwind CSS, shadcn/ui, lucide-react.

---

## File Map

**New files**
- `app/api/servicios/consulta/route.ts` — GET handler, filters, mapping
- `components/servicios/ConsultationList.tsx` — client component: table + filters
- `app/dashboard/servicios/consulta/page.tsx` — server component: loads team, renders list + header

**Modified**
- `components/dashboard/SidebarNav.tsx` — add Consultas nav item

---

## Task 1: API — GET /api/servicios/consulta

**Files:**
- Create: `app/api/servicios/consulta/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VISIT_SELECT = `
  id, created_at,
  pet:pet_id(id, name, species:species_id(name)),
  owner:owner_id(id, full_name),
  record:consultation_records(attended_by, reason, diagnosis, vet_profile:attended_by(id, full_name))
`

interface ConsultationRow {
  id: string
  created_at: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
  reason: string | null
  diagnosis: string | null
  attended_by: string | null
  attended_by_name: string | null
}

function mapRow(row: any): ConsultationRow {
  const record = Array.isArray(row.record) ? row.record[0] : row.record
  const vetProfile = Array.isArray(record?.vet_profile) ? record?.vet_profile[0] : record?.vet_profile
  return {
    id: row.id,
    created_at: row.created_at,
    pet: row.pet ?? null,
    owner: row.owner ?? null,
    reason: record?.reason ?? null,
    diagnosis: record?.diagnosis ?? null,
    attended_by: record?.attended_by ?? null,
    attended_by_name: vetProfile?.full_name ?? null,
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!(profile as any)?.tenant_id)
    return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  const tenantId = (profile as any).tenant_id
  const url = new URL(req.url)
  const vet = url.searchParams.get('vet')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  let query = (supabase as any)
    .from('service_visits')
    .select(VISIT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('service_type', 'consultation')
    .order('created_at', { ascending: false })
    .limit(100)

  if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`)
  if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener consultas' }, { status: 500 })

  let rows: ConsultationRow[] = (data ?? []).map(mapRow)

  // Filter by vet post-fetch (PostgREST can't filter on embedded table columns directly)
  if (vet) rows = rows.filter(r => r.attended_by === vet)

  return NextResponse.json({ data: rows })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/servicios/consulta/route.ts
git commit -m "feat: add GET /api/servicios/consulta with vet and date filters"
```

---

## Task 2: ConsultationList component + SidebarNav

**Files:**
- Create: `components/servicios/ConsultationList.tsx`
- Modify: `components/dashboard/SidebarNav.tsx`

- [ ] **Step 1: Create `components/servicios/ConsultationList.tsx`**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope } from 'lucide-react'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface ConsultationRow {
  id: string
  created_at: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
  reason: string | null
  diagnosis: string | null
  attended_by: string | null
  attended_by_name: string | null
}

interface TeamMember {
  id: string
  full_name: string
}

interface Props {
  team: TeamMember[]
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function ConsultationList({ team }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<ConsultationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVet, setSelectedVet] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  async function load(vet: string, from: string, to: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (vet) params.set('vet', vet)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/servicios/consulta?${params.toString()}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(selectedVet, fromDate, toDate) }, [selectedVet, fromDate, toDate])

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Veterinario</Label>
          <select
            value={selectedVet}
            onChange={e => setSelectedVet(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos los veterinarios</option>
            {team.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {(selectedVet || fromDate || toDate) && (
          <button
            type="button"
            onClick={() => { setSelectedVet(''); setFromDate(''); setToDate('') }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors h-9 px-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Stethoscope size={32} className="text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">No hay consultas registradas.</p>
          <Link href="/dashboard/records/new" className="text-xs text-primary hover:underline">
            Registrar consulta
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Paciente</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Especie</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Dueño</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Motivo</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Veterinario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => row.pet?.id && router.push(`/dashboard/pets/${row.pet.id}/records/${row.id}`)}
                  className="hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{row.pet?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.pet?.species?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.owner?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{row.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.attended_by_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `components/dashboard/SidebarNav.tsx`**

Add `Stethoscope` to the lucide-react import (it's not currently imported — verify by reading line 4 first):

```typescript
import { Home, Users, PawPrint, Calendar, Settings2, Scissors, BedDouble, Syringe, HeartPulse, Stethoscope } from 'lucide-react'
```

Add "Consultas" as the **first** entry in `SERVICES_NAV_ITEMS` (consultation should appear first as the most common service):

```typescript
const SERVICES_NAV_ITEMS = [
  { href: '/dashboard/servicios/consulta', icon: Stethoscope, label: 'Consultas' },
  { href: '/dashboard/servicios/estetica', icon: Scissors, label: 'Estética' },
  { href: '/dashboard/servicios/hotel', icon: BedDouble, label: 'Hotel' },
  { href: '/dashboard/servicios/cirugia', icon: Syringe, label: 'Cirugía' },
  { href: '/dashboard/servicios/hospitalizacion', icon: HeartPulse, label: 'Hospitalización' },
]
```

- [ ] **Step 3: Commit**

```bash
git add components/servicios/ConsultationList.tsx components/dashboard/SidebarNav.tsx
git commit -m "feat: add ConsultationList component and Consultas sidebar entry"
```

---

## Task 3: Consultation service page

**Files:**
- Create: `app/dashboard/servicios/consulta/page.tsx`

- [ ] **Step 1: Create the directory and page file**

```typescript
import { Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ConsultationList } from '@/components/servicios/ConsultationList'

export default async function ConsultaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single() as any

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .neq('role', 'assistant')
    .order('full_name') as { data: { id: string; full_name: string }[] | null }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Servicios</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Stethoscope size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Consultas
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Historial de consultas médicas registradas en la clínica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/records/new"
            className={buttonVariants({})}
          >
            + Nueva consulta
          </Link>
        </div>
      </div>
      <ConsultationList team={team ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/servicios/consulta/page.tsx
git commit -m "feat: add /dashboard/servicios/consulta page"
```

---

## Verification

- [ ] Navigate to `/dashboard/servicios/consulta` — page loads with the header and table
- [ ] Without filters: shows all consultations, ordered newest first
- [ ] Filter by vet → table re-fetches and shows only that vet's consultations
- [ ] Filter by date range → table shows consultations in that window
- [ ] "Limpiar filtros" button resets all filters
- [ ] Click a row → navigates to `/dashboard/pets/[petId]/records/[id]`
- [ ] Empty state (no consultations or no results for filters) → shows Stethoscope icon + message
- [ ] "Nueva consulta" button → navigates to `/dashboard/records/new`
- [ ] Sidebar shows "Consultas" as first entry under Servicios with Stethoscope icon, active state works
