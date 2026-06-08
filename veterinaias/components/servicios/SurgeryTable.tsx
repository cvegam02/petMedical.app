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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  return (dateStr.length === 10 ? dateStr : dateStr.slice(0, 10)) === todayStr()
}

function isFutureDate(dateStr: string | null): boolean {
  if (!dateStr) return false
  return (dateStr.length === 10 ? dateStr : dateStr.slice(0, 10)) > todayStr()
}

function fmtTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}


export function SurgeryTable() {
  const router = useRouter()
  const [rows, setRows] = useState<SurgeryRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/servicios/cirugia')
      const json = await res.json()
      setRows(json.data ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    window.addEventListener('appointment:created', load)
    return () => window.removeEventListener('appointment:created', load)
  }, [])

  if (loading) return <ListSkeleton />

  const active = rows.filter(r => derivedStatus(r) === 'in_progress')
  const scheduled = rows.filter(r => derivedStatus(r) === 'scheduled')
  const hoy = scheduled.filter(r => isToday(r.scheduled_at))
  const proximas = scheduled.filter(r => isFutureDate(r.scheduled_at))
  const historial = rows.filter(r => r.ended_at != null || (
    derivedStatus(r) === 'scheduled' && !isToday(r.scheduled_at) && !isFutureDate(r.scheduled_at)
  ))

  const hoySorted = [...hoy].sort(
    (a, b) => new Date(a.scheduled_at ?? '').getTime() - new Date(b.scheduled_at ?? '').getTime()
  )
  const proximasSorted = [...proximas].sort(
    (a, b) => new Date(a.scheduled_at ?? '').getTime() - new Date(b.scheduled_at ?? '').getTime()
  )
  const historialSorted = [...historial].sort((a, b) => {
    const da = new Date(a.ended_at ?? a.started_at ?? a.scheduled_at ?? '').getTime()
    const db = new Date(b.ended_at ?? b.started_at ?? b.scheduled_at ?? '').getTime()
    return db - da
  })

  if (rows.length === 0) {
    return (
      <div className="bg-card rounded-[1.5rem] border border-border overflow-hidden">
        <div className="text-center py-20">
          <div className="text-4xl opacity-20 rotate-6 mb-4 inline-block">
            <Syringe size={40} />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Sin cirugías registradas</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-[260px] mx-auto">
            Agenda una cirugía desde la agenda y regístrala al concluir.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── En quirófano (active) ── */}
      {active.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          <SectionHeader variant="amber" title="En quirófano" count={active.length} />
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
              + {active.length - 2} más en quirófano
            </p>
          )}
        </div>
      )}

      {/* ── Hoy ── */}
      {hoy.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          <SectionHeader variant="blue" title="Hoy" count={hoy.length} />
          <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[150px] shrink-0">Mascota</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Procedimiento</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[160px] shrink-0">Dueño</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[60px] shrink-0">Hora</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[100px] shrink-0">Estado</span>
            <span className="w-9 shrink-0" />
          </div>
          <div className="divide-y divide-[#f3f5f7]">
            {hoySorted.map((r, index) => {
              const PetIcon = getSpeciesIcon(r.pet?.species?.name)
              const badge = STATUS_BADGE[derivedStatus(r)]
              return (
                <div
                  key={r.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div
                    className="group relative flex items-center gap-4 px-6 py-3 hover:bg-primary/[0.01] transition-colors duration-200 cursor-pointer"
                    onClick={() => router.push(`/dashboard/servicios/cirugia/${r.id}`)}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 w-[150px] min-w-0 shrink-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">{r.pet?.name ?? '—'}</p>
                        {r.pet?.species?.name && <p className="text-[10px] text-muted-foreground truncate">{r.pet.species.name}</p>}
                      </div>
                    </div>
                    <p className="flex-1 text-[12px] text-muted-foreground truncate min-w-0">{r.procedure ?? r.diagnosis ?? '—'}</p>
                    <p className="w-[160px] text-[11px] text-muted-foreground shrink-0 truncate">{r.owner?.full_name ?? '—'}</p>
                    <p className="w-[60px] text-[12px] font-semibold tabular-nums text-foreground shrink-0">{fmtTime(r.scheduled_at)}</p>
                    <div className="w-[100px] shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        {badge.label}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Próximas ── */}
      {proximasSorted.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          <SectionHeader variant="muted" title="Próximas cirugías" count={proximasSorted.length} />
          <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[150px] shrink-0">Mascota</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Procedimiento</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[160px] shrink-0">Dueño</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[60px] shrink-0">Hora</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[100px] shrink-0">Estado</span>
            <span className="w-9 shrink-0" />
          </div>
          <div className="divide-y divide-[#f3f5f7]">
            {proximasSorted.map((r, index) => {
              const PetIcon = getSpeciesIcon(r.pet?.species?.name)
              const badge = STATUS_BADGE[derivedStatus(r)]
              return (
                <div
                  key={r.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div
                    className="group relative flex items-center gap-4 px-6 py-3 opacity-85 hover:opacity-100 hover:bg-primary/[0.01] transition-all duration-200 cursor-pointer"
                    onClick={() => router.push(`/dashboard/servicios/cirugia/${r.id}`)}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 w-[150px] min-w-0 shrink-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">{r.pet?.name ?? '—'}</p>
                        {r.pet?.species?.name && <p className="text-[10px] text-muted-foreground truncate">{r.pet.species.name}</p>}
                      </div>
                    </div>
                    <p className="flex-1 text-[12px] text-muted-foreground truncate min-w-0">{r.procedure ?? r.diagnosis ?? '—'}</p>
                    <p className="w-[160px] text-[11px] text-muted-foreground shrink-0 truncate">{r.owner?.full_name ?? '—'}</p>
                    <p className="w-[60px] text-[12px] font-semibold tabular-nums text-foreground shrink-0">{fmtTime(r.scheduled_at)}</p>
                    <div className="w-[100px] shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Historial ── */}
      {historial.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          <SectionHeader variant="muted" title="Historial" count={historial.length} />
          <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[140px]">Mascota</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Motivo</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[160px]">Responsable</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[80px]">Estado</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px]">Fecha</span>
            <span className="w-9" />
          </div>
          <div className="divide-y divide-[#f3f5f7]">
            {historialSorted.map((r, index) => {
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
                    <div className="flex items-center gap-3 w-[140px] min-w-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">{r.pet?.name ?? '—'}</p>
                        {r.pet?.species?.name && <p className="text-[10px] text-muted-foreground truncate">{r.pet.species.name}</p>}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-[12px] font-semibold text-foreground truncate">{r.diagnosis ?? r.procedure ?? '—'}</p>
                      {hasComplications && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={10} className="text-orange-500 shrink-0" />
                          <span className="text-[10px] font-medium text-orange-600">Complicaciones</span>
                        </div>
                      )}
                    </div>
                    <div className="w-[160px] shrink-0 min-w-0">
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
                    <div className="w-[80px] shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        {badge.label}
                      </span>
                    </div>
                    <div className="w-[90px] shrink-0 space-y-0.5">
                      <p className="text-[12px] font-medium text-foreground">{formatDate(primaryDate)}</p>
                      {r.follow_up_date && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CalendarCheck size={10} className="shrink-0" />
                          <span className="text-[10px]">{formatDate(r.follow_up_date, { day: '2-digit', month: 'short' })}</span>
                        </div>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all shrink-0">
                      <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <ListFooter count={rows.length} label={rows.length === 1 ? 'cirugía registrada' : 'cirugías registradas'} />
        </div>
      )}

    </div>
  )
}
