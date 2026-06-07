# Unified Lists Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inconsistent avatar sizes, padding, hover states, skeleton loaders, empty states, section headers, and footers across 6 list components with a unified token set while preserving each list's structural differences.

**Architecture:** Extract 3 shared primitives (`ListSkeleton`, `ListFooter`, `SectionHeader`) into `components/ui/list-primitives.tsx`. Update each of the 6 components: SurgeryTable, GroomingSessionsTable, HospitalizationTable, BoardingHistoryTable, OwnerCard, and PetsPage/PetRow. No API routes or data-fetching changes.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, shadcn/ui, Lucide React

**Spec:** `docs/superpowers/specs/2026-06-07-unified-lists-design.md`

---

## File Map

| Action | File |
|--------|------|
| Create | `components/ui/list-primitives.tsx` |
| Modify | `components/servicios/SurgeryTable.tsx` |
| Modify | `components/servicios/GroomingSessionsTable.tsx` |
| Modify | `components/servicios/HospitalizationTable.tsx` |
| Modify | `components/servicios/BoardingHistoryTable.tsx` |
| Modify | `components/owners/OwnerCard.tsx` |
| Modify | `app/dashboard/owners/page.tsx` |
| Modify | `app/dashboard/pets/page.tsx` |

---

## Task 1: Create shared list primitives

**File:** Create `veterinaias/components/ui/list-primitives.tsx`

These 3 components are used in 4–6 places each. Extracting them ensures tokens are defined once.

- [ ] **Create `components/ui/list-primitives.tsx` with this exact content:**

```tsx
import React from 'react'

// ---------------------------------------------------------------------------
// ListSkeleton — uniform loading state for all 6 list components
// ---------------------------------------------------------------------------
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card rounded-[1.5rem] border border-border overflow-hidden divide-y divide-[#f3f5f7]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-3">
          <div className="w-9 h-9 rounded-[10px] bg-muted/40 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-[13px] w-1/4 bg-muted/40 animate-pulse rounded-[6px]" />
            <div className="h-[10px] w-1/6 bg-muted/20 animate-pulse rounded-[6px]" />
          </div>
          <div className="w-1/3 space-y-2">
            <div className="h-[12px] w-2/3 bg-muted/30 animate-pulse rounded-[6px]" />
          </div>
          <div className="w-16 h-[10px] bg-muted/20 animate-pulse rounded-[6px]" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ListFooter — count + "Actualizado" status, shared across all 6 lists
// ---------------------------------------------------------------------------
export function ListFooter({ count, label }: { count: number; label: string }) {
  return (
    <div className="px-6 py-[9px] bg-[#fafbfc] border-t border-[#f3f5f7] flex items-center justify-between">
      <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
        {count} {label}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="w-[5px] h-[5px] rounded-full bg-primary" />
        <span className="text-[9px] font-bold text-primary uppercase tracking-[0.05em]">Actualizado</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectionHeader — amber (En curso) · blue (Hoy) · muted (Historial/Próximas)
// ---------------------------------------------------------------------------
type SectionVariant = 'amber' | 'blue' | 'muted'

const VARIANT_STYLES: Record<SectionVariant, {
  bg: string; border: string; text: string; dot?: string
  badgeBg: string; badgeText: string
}> = {
  amber: {
    bg: 'bg-[#fffbeb]', border: 'border-b border-[#fde68a]',
    text: 'text-[#92400e]', dot: 'bg-amber-400',
    badgeBg: 'bg-[#fde68a]', badgeText: 'text-[#92400e]',
  },
  blue: {
    bg: 'bg-[#F3F8FC]', border: 'border-b border-[rgba(15,76,129,0.1)]',
    text: 'text-[#0F4C81]', dot: 'bg-[#337DB9]',
    badgeBg: 'bg-[rgba(15,76,129,0.1)]', badgeText: 'text-[#0F4C81]',
  },
  muted: {
    bg: 'bg-[#fafbfc]', border: 'border-b border-[#e7ebef]',
    text: 'text-muted-foreground/60',
    badgeBg: 'bg-[#f3f5f7]', badgeText: 'text-muted-foreground',
  },
}

export function SectionHeader({
  variant, title, count,
}: {
  variant: SectionVariant; title: string; count?: number
}) {
  const s = VARIANT_STYLES[variant]
  return (
    <div className={`flex items-center gap-2 px-4 py-[9px] ${s.bg} ${s.border}`}>
      {s.dot && <span className={`w-[7px] h-[7px] rounded-full ${s.dot} shrink-0`} />}
      <p className={`text-[9px] font-bold uppercase tracking-[0.15em] ${s.text} flex-1`}>{title}</p>
      {count !== undefined && (
        <span className={`font-mono text-[10px] font-bold px-[7px] py-[1px] rounded-[4px] ${s.badgeBg} ${s.badgeText}`}>
          {count}
        </span>
      )}
    </div>
  )
}
```

---

## Task 2: SurgeryTable — split active/history + unify tokens

**File:** `veterinaias/components/servicios/SurgeryTable.tsx`

**Changes:**
- Split rows: `in_progress` → amber 2-col active cards; `scheduled` + `completed` → history rows
- Avatar: `w-12 h-12 rounded-2xl` → `w-9 h-9 rounded-[10px]`
- Left accent: `w-1 h-0 group-hover:h-8` → `w-[3px] h-[28px] opacity-0 group-hover:opacity-100 transition-opacity`
- Row padding: `py-5` → `py-3`
- Column headers: `text-[10px]` → `text-[9px]`, `bg-muted/20` → `bg-[#f3f5f7]`
- Animation stagger: `35ms` → `30ms`
- Use `ListSkeleton`, `ListFooter`, `SectionHeader` from list-primitives
- Empty state: simplify to floating icon pattern

- [ ] **Replace the full file content:**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Syringe, AlertTriangle, CalendarCheck, User } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { ListSkeleton, ListFooter, SectionHeader } from '@/components/ui/list-primitives'

interface SurgeryRow {
  id: string
  started_at: string | null
  ended_at: string | null
  scheduled_at: string | null
  procedure: string | null
  diagnosis: string | null
  anesthesia_type: string | null
  complications: string | null
  follow_up_date: string | null
  owner: { id: string; full_name: string } | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

type SurgeryStatus = 'scheduled' | 'in_progress' | 'completed'

const STATUS_BADGE: Record<SurgeryStatus, { label: string; className: string; dot?: boolean }> = {
  scheduled:   { label: 'Programada',   className: 'text-blue-700 bg-blue-50 border-blue-200' },
  in_progress: { label: 'En quirófano', className: 'text-amber-700 bg-amber-50 border-amber-200', dot: true },
  completed:   { label: 'Completada',   className: 'text-green-700 bg-green-50 border-green-200' },
}

function derivedStatus(row: SurgeryRow): SurgeryStatus {
  if (row.ended_at) return 'completed'
  if (row.started_at) return 'in_progress'
  return 'scheduled'
}

function formatDate(d: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return '—'
  const base = d.length === 10 ? d + 'T12:00:00' : d
  return new Date(base).toLocaleDateString('es-MX', opts ?? { day: '2-digit', month: 'short', year: 'numeric' })
}

function dayNumber(startedAt: string | null): number {
  if (!startedAt) return 1
  const start = new Date(startedAt)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(1, Math.round((todayDay.getTime() - startDay.getTime()) / 86400000) + 1)
}

export function SurgeryTable() {
  const router = useRouter()
  const [rows, setRows] = useState<SurgeryRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/servicios/cirugia')
    const json = await res.json()
    setRows(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    window.addEventListener('appointment:created', load)
    return () => window.removeEventListener('appointment:created', load)
  }, [])

  const active = rows.filter(r => derivedStatus(r) === 'in_progress')
  const history = rows.filter(r => derivedStatus(r) !== 'in_progress')

  if (loading) return <ListSkeleton />

  if (rows.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl opacity-20 rotate-6 mb-4 inline-block">
          <Syringe size={40} />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Sin cirugías registradas</p>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[260px] mx-auto">
          Agenda una cirugía desde la agenda y regístrala al concluir.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">

      {/* ── En curso ── */}
      {active.length > 0 && (
        <>
          <SectionHeader variant="amber" title="En curso" count={active.length} />
          <div className="grid grid-cols-2 gap-2 p-3 bg-[#fffbeb] border-b border-[#fde68a]">
            {active.slice(0, 2).map(r => {
              const PetIcon = getSpeciesIcon(r.pet?.species?.name)
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => router.push(`/dashboard/servicios/cirugia/${r.id}`)}
                  className="bg-white border border-[#fde68a] rounded-[8px] p-[11px] text-left hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#fef9c3] to-[#fde68a] border border-[#fcd34d] flex items-center justify-center shrink-0">
                      <PetIcon size={16} strokeWidth={1.5} className="text-[#92400e]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] text-foreground leading-tight truncate">{r.pet?.name ?? '—'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {r.pet?.species?.name ?? '—'}{r.owner ? ` · ${r.owner.full_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground truncate">{r.diagnosis ?? r.procedure ?? '—'}</p>
                    <span className="text-[10px] font-bold px-2 py-[2px] bg-[#fef3c7] text-[#92400e] rounded-[20px] border border-[#fde68a] shrink-0 whitespace-nowrap">
                      Día {dayNumber(r.started_at)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          {active.length > 2 && (
            <p className="text-center text-[11px] text-primary font-semibold py-2 bg-[#fffbeb] border-b border-[#fde68a]">
              + {active.length - 2} más en curso
            </p>
          )}
        </>
      )}

      {/* ── Historial ── */}
      {history.length > 0 && (
        <>
          <SectionHeader variant="muted" title="Historial" count={history.length} />
          {/* Column headers */}
          <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[140px]">Mascota</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Motivo</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[110px]">Responsable</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[80px]">Estado</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px]">Fecha</span>
            <span className="w-9" />
          </div>
          <div className="divide-y divide-[#f3f5f7]">
            {history.map((r, index) => {
              const PetIcon = getSpeciesIcon(r.pet?.species?.name)
              const status = derivedStatus(r)
              const badge = STATUS_BADGE[status]
              const primaryDate = r.ended_at ?? r.started_at ?? r.scheduled_at
              const hasComplications = !!r.complications?.trim()

              return (
                <div
                  key={r.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div
                    className="group relative flex items-center gap-4 py-3 px-6 hover:bg-primary/[0.01] transition-colors duration-200 cursor-pointer"
                    onClick={() => router.push(`/dashboard/servicios/cirugia/${r.id}`)}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Pet */}
                    <div className="flex items-center gap-3 w-[140px] min-w-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                          {r.pet?.name ?? '—'}
                        </p>
                        {r.pet?.species?.name && (
                          <p className="text-[10px] text-muted-foreground truncate">{r.pet.species.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Motivo */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {r.diagnosis ?? r.procedure ?? '—'}
                      </p>
                      {hasComplications && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={10} className="text-orange-500 shrink-0" />
                          <span className="text-[10px] font-medium text-orange-600">Complicaciones</span>
                        </div>
                      )}
                    </div>

                    {/* Responsable */}
                    <div className="w-[110px] shrink-0 min-w-0">
                      {r.owner ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                            <User size={10} className="text-muted-foreground" />
                          </div>
                          <p className="text-[11px] font-medium text-foreground truncate">{r.owner.full_name}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Estado */}
                    <div className="w-[80px] shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        {badge.label}
                      </span>
                    </div>

                    {/* Fecha */}
                    <div className="w-[90px] shrink-0 space-y-0.5">
                      <p className="text-[12px] font-medium text-foreground">{formatDate(primaryDate)}</p>
                      {r.follow_up_date && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CalendarCheck size={10} className="shrink-0" />
                          <span className="text-[10px]">{formatDate(r.follow_up_date, { day: '2-digit', month: 'short' })}</span>
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <ListFooter count={rows.length} label={rows.length === 1 ? 'cirugía registrada' : 'cirugías registradas'} />
    </div>
  )
}
```

---

## Task 3: GroomingSessionsTable — convert active banner + unify tokens

**File:** `veterinaias/components/servicios/GroomingSessionsTable.tsx`

**Changes:**
- Replace the amber banner with `SectionHeader` + 2-col cards grid for `in_progress` sessions
- History section (everything except in_progress): `SectionHeader variant="muted"` + compact rows
- In-progress list rows had a "Finalizar" button → now in_progress appears only in the active grid (not in the list)
- Avatar: `w-12 h-12 rounded-2xl` → `w-9 h-9 rounded-[10px]`
- Row padding: `py-5` → `py-3`
- Column headers: `text-[10px]` → `text-[9px]`, `bg-muted/20` → `bg-[#f3f5f7]`
- Animation stagger: `35ms` → `30ms`
- Use `ListSkeleton`, `ListFooter`, `SectionHeader`
- Elapsed time in active card: show `X min` badge instead of "Día N"

- [ ] **Replace the full file content:**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Scissors, User } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { formatDuration } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { ListSkeleton, ListFooter, SectionHeader } from '@/components/ui/list-primitives'

type SessionStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

interface SessionRow {
  id: string
  visit_id: string | null
  status: SessionStatus
  session_date: string
  started_at: string | null
  ended_at: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  owner: { id: string; full_name: string } | null
  assigned_to_profile: { id: string; full_name: string } | null
  services: { id: string; service_name: string }[]
}

interface Meta { total: number; page: number; limit: number }

const STATUS_BADGE: Record<SessionStatus, { label: string; className: string; dot?: boolean }> = {
  scheduled:   { label: 'Programada',       className: 'text-secondary-foreground bg-secondary/40 border-border' },
  confirmed:   { label: 'Confirmada',        className: 'text-blue-700 bg-blue-50 border-blue-200' },
  in_progress: { label: 'En curso',          className: 'text-amber-700 bg-amber-50 border-amber-200', dot: true },
  completed:   { label: 'Completada',        className: 'text-green-700 bg-green-50 border-green-200' },
  cancelled:   { label: 'Cancelada',         className: 'text-muted-foreground bg-muted/40 border-border' },
  no_show:     { label: 'No se presentó',    className: 'text-muted-foreground bg-muted/40 border-border' },
}

export function GroomingSessionsTable() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)

  async function load(page = 1) {
    setLoading(true)
    const res = await fetch(`/api/servicios/estetica?page=${page}`)
    const json = await res.json()
    setSessions(json.data ?? [])
    setMeta(json.meta ?? { total: 0, page, limit: 20 })
    setLoading(false)
  }

  useEffect(() => { load(1) }, [])

  function openDetail(s: SessionRow) {
    router.push(`/dashboard/servicios/estetica/${s.id}`)
  }

  const totalPages = Math.ceil(meta.total / meta.limit)
  const active = sessions.filter(s => s.status === 'in_progress')
  const history = sessions.filter(s => s.status !== 'in_progress')

  if (loading) return <ListSkeleton />

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl opacity-20 rotate-6 mb-4 inline-block">
          <Scissors size={40} />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Sin sesiones registradas</p>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[260px] mx-auto">
          Agenda una cita de estética desde el calendario o usa el botón de arriba.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">

        {/* ── En curso ── */}
        {active.length > 0 && (
          <>
            <SectionHeader variant="amber" title="En curso" count={active.length} />
            <div className="grid grid-cols-2 gap-2 p-3 bg-[#fffbeb] border-b border-[#fde68a]">
              {active.slice(0, 2).map(s => {
                const PetIcon = getSpeciesIcon(s.pet?.species?.name)
                const elapsedMins = s.started_at
                  ? Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000)
                  : 0
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openDetail(s)}
                    className="bg-white border border-[#fde68a] rounded-[8px] p-[11px] text-left hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#fef9c3] to-[#fde68a] border border-[#fcd34d] flex items-center justify-center shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-[#92400e]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate">{s.pet?.name ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.pet?.species?.name ?? '—'}{s.owner ? ` · ${s.owner.full_name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {s.services.slice(0, 2).map(sv => (
                          <span key={sv.id} className="text-[9px] font-medium px-1.5 py-[1px] rounded-full bg-primary/10 text-primary border border-primary/20 truncate max-w-[80px]">
                            {sv.service_name}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-[2px] bg-[#fef3c7] text-[#92400e] rounded-[20px] border border-[#fde68a] shrink-0 whitespace-nowrap">
                        {elapsedMins} min
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            {active.length > 2 && (
              <p className="text-center text-[11px] text-primary font-semibold py-2 bg-[#fffbeb] border-b border-[#fde68a]">
                + {active.length - 2} más en curso
              </p>
            )}
          </>
        )}

        {/* ── Historial ── */}
        {history.length > 0 && (
          <>
            <SectionHeader variant="muted" title="Historial" count={history.length} />
            {/* Column headers */}
            <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[140px]">Mascota</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Servicios</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[110px]">Responsable</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px]">Fecha</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[80px]">Estado</span>
              <span className="w-9" />
            </div>
            <div className="divide-y divide-[#f3f5f7]">
              {history.map((s, index) => {
                const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.scheduled
                const PetIcon = getSpeciesIcon(s.pet?.species?.name)
                const responsible = s.assigned_to_profile ?? s.owner
                return (
                  <div
                    key={s.id}
                    className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div
                      className="group relative flex items-center gap-4 py-3 px-6 hover:bg-primary/[0.01] transition-colors duration-200 cursor-pointer"
                      onClick={() => openDetail(s)}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Pet */}
                      <div className="flex items-center gap-3 w-[140px] min-w-0">
                        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                          <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                            {s.pet?.name ?? '—'}
                          </p>
                          {s.pet?.species?.name && (
                            <p className="text-[10px] text-muted-foreground truncate">{s.pet.species.name}</p>
                          )}
                        </div>
                      </div>

                      {/* Services */}
                      <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                        {s.services.length > 0
                          ? s.services.map(sv => (
                              <span key={sv.id} className="text-[10px] font-medium px-2 py-[1px] rounded-full bg-primary/10 text-primary border border-primary/20">
                                {sv.service_name}
                              </span>
                            ))
                          : <span className="text-[11px] text-muted-foreground">—</span>
                        }
                      </div>

                      {/* Responsable */}
                      <div className="w-[110px] shrink-0 min-w-0">
                        {responsible ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                              <User size={10} className="text-muted-foreground" />
                            </div>
                            <p className="text-[11px] font-medium text-foreground truncate">{responsible.full_name}</p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">—</span>
                        )}
                      </div>

                      {/* Fecha */}
                      <div className="w-[90px] shrink-0 space-y-0.5">
                        <p className="text-[12px] font-medium text-foreground">
                          {new Date(s.session_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        {s.started_at && s.ended_at && (
                          <p className="text-[10px] text-muted-foreground">{formatDuration(s.started_at, s.ended_at)}</p>
                        )}
                      </div>

                      {/* Estado */}
                      <div className="w-[80px] shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                          {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                          {badge.label}
                        </span>
                      </div>

                      {/* Chevron */}
                      <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
                        <ChevronRight size={15} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <ListFooter count={meta.total} label={meta.total === 1 ? 'sesión registrada' : 'sesiones registradas'} />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>
            Anterior
          </Button>
          <span>Página {meta.page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={meta.page >= totalPages} onClick={() => load(meta.page + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </>
  )
}
```

---

## Task 4: HospitalizationTable — full rebuild (table → flex-rows)

**File:** `veterinaias/components/servicios/HospitalizationTable.tsx`

**Changes:**
- Replace `<table>/<thead>/<tr>/<td>` pattern with flex-row pattern (same as other Operacional lists)
- Replace `<p>Cargando…</p>` with `ListSkeleton`
- Replace blue buttons for active cases with amber 2-col cards grid
- Add section headers (`SectionHeader amber/muted`)
- Add `ListFooter`
- Active cards show "Día N" badge using existing `dayNumber()` helper
- History columns: Mascota · Motivo · Ingreso · Alta · Chevron (no Responsable — not in HospRow interface)

- [ ] **Replace the full file content:**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { ChevronRight, HeartPulse } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { ListSkeleton, ListFooter, SectionHeader } from '@/components/ui/list-primitives'

interface HospRow {
  id: string
  started_at: string | null
  ended_at: string | null
  status: string
  reason: string | null
  diagnosis: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function dayNumber(startedAt: string | null): number {
  if (!startedAt) return 1
  const start = new Date(startedAt)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(1, Math.round((todayDay.getTime() - startDay.getTime()) / 86400000) + 1)
}

interface Props {
  onSelect: (visitId: string) => void
}

export function HospitalizationTable({ onSelect }: Props) {
  const [rows, setRows] = useState<HospRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/servicios/hospitalizacion')
      const json = await res.json()
      setRows(json.data ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('hospitalization:changed', handler)
    return () => window.removeEventListener('hospitalization:changed', handler)
  }, [])

  const active = rows.filter(r => r.started_at && !r.ended_at)
  const history = rows.filter(r => r.ended_at)

  if (loading) return <ListSkeleton />

  if (rows.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl opacity-20 rotate-6 mb-4 inline-block">
          <HeartPulse size={40} />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Sin hospitalizaciones registradas</p>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[260px] mx-auto">
          Las hospitalizaciones se inician desde la consulta o cirugía del paciente.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">

      {/* ── En curso ── */}
      {active.length > 0 && (
        <>
          <SectionHeader variant="amber" title="En curso" count={active.length} />
          <div className="grid grid-cols-2 gap-2 p-3 bg-[#fffbeb] border-b border-[#fde68a]">
            {active.slice(0, 2).map(row => {
              const PetIcon = getSpeciesIcon(row.pet?.species?.name)
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className="bg-white border border-[#fde68a] rounded-[8px] p-[11px] text-left hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#fef9c3] to-[#fde68a] border border-[#fcd34d] flex items-center justify-center shrink-0">
                      <PetIcon size={16} strokeWidth={1.5} className="text-[#92400e]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] text-foreground leading-tight truncate">{row.pet?.name ?? '—'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{row.pet?.species?.name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground truncate">{row.reason ?? row.diagnosis ?? '—'}</p>
                    <span className="text-[10px] font-bold px-2 py-[2px] bg-[#fef3c7] text-[#92400e] rounded-[20px] border border-[#fde68a] shrink-0 whitespace-nowrap">
                      Día {dayNumber(row.started_at)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          {active.length > 2 && (
            <p className="text-center text-[11px] text-primary font-semibold py-2 bg-[#fffbeb] border-b border-[#fde68a]">
              + {active.length - 2} más en curso
            </p>
          )}
        </>
      )}

      {/* ── Historial ── */}
      {history.length > 0 && (
        <>
          <SectionHeader variant="muted" title="Historial" count={history.length} />
          {/* Column headers */}
          <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[140px]">Mascota</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Motivo</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px]">Ingreso</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px]">Alta</span>
            <span className="w-9" />
          </div>
          <div className="divide-y divide-[#f3f5f7]">
            {history.map((row, index) => {
              const PetIcon = getSpeciesIcon(row.pet?.species?.name)
              return (
                <div
                  key={row.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div
                    className="group relative flex items-center gap-4 py-3 px-6 hover:bg-primary/[0.01] transition-colors duration-200 cursor-pointer"
                    onClick={() => onSelect(row.id)}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Pet */}
                    <div className="flex items-center gap-3 w-[140px] min-w-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                          {row.pet?.name ?? '—'}
                        </p>
                        {row.pet?.species?.name && (
                          <p className="text-[10px] text-muted-foreground truncate">{row.pet.species.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Motivo */}
                    <p className="flex-1 text-[12px] font-medium text-foreground truncate min-w-0">
                      {row.reason ?? row.diagnosis ?? '—'}
                    </p>

                    {/* Ingreso */}
                    <p className="w-[90px] text-[11px] text-muted-foreground shrink-0">{formatDate(row.started_at)}</p>

                    {/* Alta */}
                    <p className="w-[90px] text-[11px] text-muted-foreground shrink-0">{formatDate(row.ended_at)}</p>

                    {/* Chevron */}
                    <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <ListFooter count={rows.length} label={rows.length === 1 ? 'hospitalización' : 'hospitalizaciones'} />
    </div>
  )
}
```

---

## Task 5: BoardingHistoryTable — unify tokens

**File:** `veterinaias/components/servicios/BoardingHistoryTable.tsx`

**Changes:**
- Avatar: `w-12 h-12 rounded-2xl` → `w-9 h-9 rounded-[10px]`
- Left accent: `w-1 h-0 group-hover:h-8` → `w-[3px] h-[28px] opacity-0 group-hover:opacity-100`
- Row padding: `py-5` → `py-3`
- Column headers: `text-[10px] bg-muted/20` → `text-[9px] bg-[#f3f5f7]`
- Section header: remove custom div, use `SectionHeader variant="muted"`
- Animation stagger: `35ms` → `30ms`
- Use `ListFooter`, `SectionHeader`; `loading || stays.length === 0 → null` stays as-is (no skeleton needed since loading returns null)

- [ ] **Replace the full file content:**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { ListFooter, SectionHeader } from '@/components/ui/list-primitives'

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
      <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
        <SectionHeader variant="muted" title="Historial" count={stays.length} />

        {/* Column headers */}
        <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Mascota</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px]">Entrada</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px]">Salida</span>
          <span className="w-9" />
        </div>

        <div className="divide-y divide-[#f3f5f7]">
          {stays.map((s, index) => {
            const PetIcon = getSpeciesIcon(s.pet?.species?.name)
            return (
              <div
                key={s.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className="group relative flex items-center gap-4 py-3 px-6 hover:bg-primary/[0.01] transition-colors duration-200 cursor-pointer"
                  onClick={() => router.push(`/dashboard/servicios/hotel/${s.id}`)}
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Pet identity */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                      <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                        {s.pet?.name ?? '—'}
                      </p>
                      {s.pet?.species?.name && (
                        <p className="text-[10px] text-muted-foreground truncate">{s.pet.species.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Entrada */}
                  <p className="w-[90px] text-[12px] font-medium text-foreground shrink-0">{formatDate(s.started_at)}</p>

                  {/* Salida */}
                  <p className="w-[90px] text-[11px] text-muted-foreground shrink-0">{formatDate(s.ended_at)}</p>

                  {/* Chevron */}
                  <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
                    <ChevronRight size={15} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <ListFooter count={stays.length} label={stays.length === 1 ? 'estadía completada' : 'estadías completadas'} />
      </div>
    </div>
  )
}
```

---

## Task 6: OwnerCard — unify tokens

**File:** `veterinaias/components/owners/OwnerCard.tsx`

**Changes:**
- Avatar: `w-12 h-12 rounded-xl` → `w-9 h-9 rounded-full` (circular, initials font adjusted)
- Remove the pet-count badge overlay on avatar (-top-1.5 -right-1.5)
- Row padding: `py-5` → `py-3`
- Left accent: `w-1 h-0 group-hover:h-8` → `w-[3px] h-[28px] opacity-0 group-hover:opacity-100`
- Pet chips: from white border chips to green pill style `bg-[#f1fcf7] text-[#1D865C] border-[#b6edda]`
- Max 3 chips + "+ N más" overflow
- Contact column: replace icon chip wrappers with plain flex rows
- Drop the phone/email icon chip backgrounds (too heavy for unified style)

- [ ] **Replace the full file content:**

```tsx
import Link from 'next/link'
import { ChevronRight, Phone, Mail } from 'lucide-react'

interface OwnerCardProps {
  owner: {
    id: string
    full_name: string
    email: string | null
    phone: string
    pets?: Array<{ id: string; name: string; species?: { name: string } }>
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function OwnerCard({ owner }: OwnerCardProps) {
  const initials = getInitials(owner.full_name)
  const pets = owner.pets ?? []
  const visiblePets = pets.slice(0, 3)
  const overflow = pets.length - 3

  return (
    <Link
      href={`/dashboard/owners/${owner.id}`}
      className="group relative flex items-center gap-4 py-3 px-6 hover:bg-primary/[0.01] transition-colors duration-200 border-b border-[#f3f5f7] last:border-0"
    >
      {/* Left accent */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Column 1: Identity */}
      <div className="flex items-center gap-3 w-[200px] min-w-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
          {initials ? (
            <span className="text-[11px] font-bold tracking-tight text-foreground/70 group-hover:text-primary transition-colors">
              {initials}
            </span>
          ) : null}
        </div>
        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">
          {owner.full_name}
        </p>
      </div>

      {/* Column 2: Contact */}
      <div className="flex flex-col gap-1 w-[150px] min-w-0 shrink-0">
        <div className="flex items-center gap-1.5 text-foreground/80">
          <Phone size={10} className="text-muted-foreground shrink-0" />
          <p className="text-[12px] font-semibold font-mono tabular-nums truncate">{owner.phone}</p>
        </div>
        {owner.email ? (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail size={10} className="shrink-0" />
            <p className="text-[11px] truncate">{owner.email}</p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/40 italic pl-[14px]">Sin correo</p>
        )}
      </div>

      {/* Column 3: Mascotas */}
      <div className="flex-1 flex flex-wrap gap-1.5 items-center min-w-0">
        {visiblePets.length > 0 ? (
          <>
            {visiblePets.map(pet => (
              <span
                key={pet.id}
                className="text-[10px] font-bold px-[8px] py-[2px] rounded-[20px] bg-[#f1fcf7] text-[#1D865C] border border-[#b6edda]"
              >
                {pet.name}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[10px] font-bold px-[8px] py-[2px] rounded-[20px] bg-[#f3f5f7] text-muted-foreground border border-[#e7ebef]">
                +{overflow} más
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground/40 italic">Sin pacientes</span>
        )}
      </div>

      {/* Chevron */}
      <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
        <ChevronRight size={15} strokeWidth={2.5} />
      </div>
    </Link>
  )
}
```

---

## Task 7: OwnersPage — padding + footer + animation tokens

**File:** `veterinaias/app/dashboard/owners/page.tsx`

**Changes:**
- Column headers: `px-10` → `px-6`
- Footer: `px-10` → `px-6`, update text to match ListFooter style tokens
- Animation stagger: `40ms` → `30ms`
- Skeleton rows: `w-12 h-12` → `w-9 h-9`, `rounded-xl` → `rounded-full`

- [ ] **Apply these 4 targeted edits:**

**Edit 1** — column header padding:
```
OLD: className="flex items-center gap-6 px-10 py-5 bg-muted/20 border-b border-border/60"
NEW: className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]"
```

**Edit 2** — column header text sizes (3 `<p>` tags inside the header div, change `text-[10px]` → `text-[9px]`):
```
OLD: className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-1/3"
NEW: className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-[200px]"

OLD: className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-1/4"
NEW: className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-[150px]"

OLD: className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1"
NEW: className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1"
```

**Edit 3** — footer:
```
OLD: className="px-10 py-5 bg-muted/5 border-t border-border/40 flex items-center justify-between"
NEW: className="px-6 py-[9px] bg-[#fafbfc] border-t border-[#f3f5f7] flex items-center justify-between"

OLD: className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest"
     Mostrando {owners.length} registros activos
NEW: className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground"
     {owners.length} {owners.length === 1 ? 'dueño registrado' : 'dueños registrados'}

OLD: <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
     <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Base de datos sincronizada</span>
NEW: <span className="w-[5px] h-[5px] rounded-full bg-primary" />
     <span className="text-[9px] font-bold text-primary uppercase tracking-[0.05em]">Actualizado</span>
```

**Edit 4** — animation stagger:
```
OLD: style={{ animationDelay: `${index * 40}ms` }}
NEW: style={{ animationDelay: `${index * 30}ms` }}
```

**Edit 5** — skeleton avatar:
```
OLD: className="w-12 h-12 rounded-xl bg-muted/40 animate-pulse"
NEW: className="w-9 h-9 rounded-full bg-muted/40 animate-pulse"
```

---

## Task 8: PetsPage + PetRow — avatar, sex badge, species chips

**File:** `veterinaias/app/dashboard/pets/page.tsx`

**Changes:**
- Avatar: `w-14 h-14 rounded-2xl` → `w-9 h-9 rounded-[10px]`
- Sex badge: `w-6 h-6 bottom-[-3px] right-[-3px] border-2` → `w-[14px] h-[14px] bottom-[-2px] right-[-2px] border-[1.5px]`, symbol size `text-[10px]` → `text-[8px]`
- Row padding: `py-5 px-6` → `py-3 px-6`
- Species/breed column: drop icon chips, use plain text lines
- Left accent: `w-1 h-0 group-hover:h-8` → `w-[3px] h-[28px] opacity-0 group-hover:opacity-100`
- Column headers: `px-10 py-5 bg-muted/20` → `px-6 py-[9px] bg-[#f3f5f7]`, text `text-[10px]` → `text-[9px]`
- Footer: same token updates as Task 7
- Skeleton: `w-14 h-14` → `w-9 h-9`
- Animation stagger: `35ms` → `30ms`
- Owner column: simplify — remove the label "Responsable" row above the name, keep just name + icon

- [ ] **Replace the `PetRow` function and update list header/footer. Full replacement of `PetRow`:**

```tsx
function PetRow({ pet }: { pet: Pet }) {
  const speciesName = pet.species?.name?.toLowerCase() ?? ''
  const isCat = speciesName.includes('fel') || speciesName.includes('gat')
  const isDog = speciesName.includes('can') || speciesName.includes('perr')
  const Icon = isCat ? Cat : isDog ? Dog : PawPrint

  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="group relative flex items-center gap-4 py-3 px-6 hover:bg-primary/[0.01] transition-colors duration-200 border-b border-[#f3f5f7] last:border-0"
    >
      {/* Left accent */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Column 1: Identity */}
      <div className="flex items-center gap-3 w-[200px] min-w-0">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors">
            <Icon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
          <div className={`absolute bottom-[-2px] right-[-2px] w-[14px] h-[14px] rounded-full border-[1.5px] border-white flex items-center justify-center ${
            pet.sex === 'male' ? 'bg-[#3B82F6]' : pet.sex === 'female' ? 'bg-[#EC4899]' : 'bg-gray-400'
          }`}>
            <span className="text-[8px] font-bold text-white leading-none">
              {pet.sex === 'male' ? '♂' : pet.sex === 'female' ? '♀' : '?'}
            </span>
          </div>
        </div>
        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">
          {pet.name}
        </p>
      </div>

      {/* Column 2: Species / Breed */}
      <div className="flex flex-col gap-0.5 w-[150px] min-w-0 shrink-0">
        <p className="text-[12px] font-semibold text-foreground truncate">{pet.species?.name ?? '—'}</p>
        {pet.breed && <p className="text-[10px] text-muted-foreground truncate">{pet.breed}</p>}
      </div>

      {/* Column 3: Owner */}
      <div className="flex-1 min-w-0">
        {pet.owner ? (
          <div className="flex items-center gap-2 text-foreground/70 group-hover:text-foreground transition-colors">
            <div className="w-5 h-5 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0 group-hover:border-primary/20 transition-colors">
              <User size={10} className="text-muted-foreground group-hover:text-primary" />
            </div>
            <p className="text-[12px] font-medium truncate">{pet.owner.full_name}</p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/40 italic">Sin dueño asignado</p>
        )}
      </div>

      {/* Chevron */}
      <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
        <ChevronRight size={15} strokeWidth={2.5} />
      </div>
    </Link>
  )
}
```

- [ ] **Update column header div in `PetsPage`:**

```
OLD: className="flex items-center gap-6 px-10 py-5 bg-muted/20 border-b border-border/60"
NEW: className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]"
```

- [ ] **Update column header text nodes (3 `<p>` tags):**

```
OLD: className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-1/3"
     Información del Paciente
NEW: className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-[200px]"
     Mascota

OLD: className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-1/4"
     Especie y Raza
NEW: className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-[150px]"
     Especie y Raza

OLD: className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1"
     Responsable
NEW: className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1"
     Responsable
```

- [ ] **Update footer div:**

```
OLD: className="px-10 py-5 bg-muted/5 border-t border-border/40 flex items-center justify-between"
NEW: className="px-6 py-[9px] bg-[#fafbfc] border-t border-[#f3f5f7] flex items-center justify-between"

OLD: className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest"
     {pets.length} {pets.length === 1 ? 'paciente activo' : 'pacientes activos'}
NEW: className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground"
     {pets.length} {pets.length === 1 ? 'paciente registrado' : 'pacientes registrados'}

OLD: <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
     <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Registros actualizados</span>
NEW: <span className="w-[5px] h-[5px] rounded-full bg-primary" />
     <span className="text-[9px] font-bold text-primary uppercase tracking-[0.05em]">Actualizado</span>
```

- [ ] **Update skeleton avatar:**

```
OLD: className="w-14 h-14 rounded-xl bg-muted/40 animate-pulse"
NEW: className="w-9 h-9 rounded-[10px] bg-muted/40 animate-pulse shrink-0"
```

- [ ] **Update animation stagger:**

```
OLD: style={{ animationDelay: `${index * 35}ms` }}
NEW: style={{ animationDelay: `${index * 30}ms` }}
```

---

## Self-Review

**Spec coverage check:**
- ✅ Avatar 36px uniform — Tasks 2, 3, 4, 5, 6, 8
- ✅ px-6 header padding everywhere — Tasks 2, 3, 4, 5, 7, 8
- ✅ Column headers `text-[9px] bg-[#f3f5f7]` — all tasks
- ✅ Left accent `w-[3px] h-[28px] opacity-0 group-hover:opacity-100` — Tasks 2, 3, 4, 5, 6, 8
- ✅ Chevron `w-9 h-9 rounded-[9px]` with border+shadow on hover — all tasks
- ✅ Skeleton `ListSkeleton` — Tasks 2, 3, 4 (BoardingHistoryTable returns null on loading; OwnerCard/PetRow handle loading in page, skeleton rows updated in Tasks 7 and 8)
- ✅ Footer `ListFooter` — Tasks 2, 3, 4, 5; Tasks 7 and 8 update inline footer
- ✅ Section headers `SectionHeader` component — Tasks 2, 3, 4, 5
- ✅ Animation 30ms — Tasks 2, 3, 4, 5, 7, 8
- ✅ HospitalizationTable `<table>` → flex-rows — Task 4
- ✅ Owner avatar `rounded-full` — Task 6
- ✅ Pet sex badge `w-[14px] h-[14px]` — Task 8
- ✅ Green pill chips for pets — Task 6
- ✅ Species/breed inline text (no icon chips) — Task 8
- ✅ Empty states simplified — Tasks 2, 3, 4

**Placeholder scan:** No TBDs. All steps have exact code.

**Type consistency:** `SectionHeader` props match usage in all tasks (`variant`, `title`, `count`). `ListFooter` props match (`count`, `label`). `ListSkeleton` prop `rows` defaults to 5. `getSpeciesIcon` usage unchanged across all tasks.
