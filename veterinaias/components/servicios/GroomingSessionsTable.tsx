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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function isToday(dateStr: string): boolean {
  return (dateStr.length === 10 ? dateStr : dateStr.slice(0, 10)) === todayStr()
}

function isFutureDate(dateStr: string): boolean {
  return (dateStr.length === 10 ? dateStr : dateStr.slice(0, 10)) > todayStr()
}

function fmtTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateCompact(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}


export function GroomingSessionsTable() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)

  async function load(page = 1) {
    setLoading(true)
    try {
      const res = await fetch(`/api/servicios/estetica?page=${page}`)
      const json = await res.json()
      setSessions(json.data ?? [])
      setMeta(json.meta ?? { total: 0, page, limit: 20 })
    } catch {
      setSessions([])
      setMeta({ total: 0, page, limit: 20 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  function openDetail(s: SessionRow) {
    router.push(`/dashboard/servicios/estetica/${s.id}`)
  }

  if (loading) return <ListSkeleton />

  const totalPages = Math.ceil(meta.total / meta.limit)
  const active = sessions.filter(s => s.status === 'in_progress')
  const pending = sessions.filter(s => s.status === 'scheduled' || s.status === 'confirmed')
  const hoy = pending.filter(s => isToday(s.session_date))
  const proximas = pending.filter(s => isFutureDate(s.session_date))
  const historial = sessions.filter(s =>
    s.status === 'completed' || s.status === 'cancelled' || s.status === 'no_show' ||
    (pending.includes(s) && !isToday(s.session_date) && !isFutureDate(s.session_date))
  )

  const hoySorted = [...hoy].sort((a, b) => a.session_date.localeCompare(b.session_date))
  const proximasSorted = [...proximas].sort((a, b) => a.session_date.localeCompare(b.session_date))
  const historialSorted = [...historial].sort((a, b) => b.session_date.localeCompare(a.session_date))

  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-[1.5rem] border border-border overflow-hidden text-center py-20">
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
    <div className="space-y-6">

      {/* ── En curso (active) ── */}
      {active.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
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
        </div>
      )}

      {/* ── Hoy ── */}
      {hoy.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          <SectionHeader variant="blue" title="Hoy" count={hoy.length} />
          <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[150px] shrink-0">Mascota</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Servicios</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[160px] shrink-0">Responsable</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[60px] shrink-0">Hora</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[100px] shrink-0">Estado</span>
            <span className="w-9 shrink-0" />
          </div>
          <div className="divide-y divide-[#f3f5f7]">
            {hoySorted.map((s, index) => {
              const PetIcon = getSpeciesIcon(s.pet?.species?.name)
              const badge = STATUS_BADGE[s.status]
              const responsible = s.assigned_to_profile ?? s.owner
              return (
                <div
                  key={s.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div
                    className="group relative flex items-center gap-4 px-6 py-3 hover:bg-primary/[0.01] transition-colors duration-200 cursor-pointer"
                    onClick={() => openDetail(s)}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 w-[150px] min-w-0 shrink-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">{s.pet?.name ?? '—'}</p>
                        {s.pet?.species?.name && <p className="text-[10px] text-muted-foreground truncate">{s.pet.species.name}</p>}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                      {s.services.length > 0
                        ? s.services.slice(0, 2).map(sv => (
                            <span key={sv.id} className="text-[10px] font-medium px-2 py-[1px] rounded-full bg-primary/10 text-primary border border-primary/20">{sv.service_name}</span>
                          ))
                        : <span className="text-[11px] text-muted-foreground">—</span>
                      }
                    </div>
                    <div className="w-[160px] shrink-0 min-w-0">
                      {responsible ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                            <User size={10} className="text-muted-foreground" />
                          </div>
                          <p className="text-[11px] font-medium text-foreground truncate">{responsible.full_name}</p>
                        </div>
                      ) : <span className="text-[11px] text-muted-foreground/40">—</span>}
                    </div>
                    <p className="w-[60px] text-[12px] font-semibold tabular-nums text-foreground shrink-0">{fmtTime(s.session_date)}</p>
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
          <SectionHeader variant="muted" title="Próximas citas" count={proximasSorted.length} />
          <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[150px] shrink-0">Mascota</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Servicios</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[160px] shrink-0">Responsable</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[80px] shrink-0">Fecha / Hora</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[100px] shrink-0">Estado</span>
            <span className="w-9 shrink-0" />
          </div>
          <div className="divide-y divide-[#f3f5f7]">
            {proximasSorted.map((s, index) => {
              const PetIcon = getSpeciesIcon(s.pet?.species?.name)
              const badge = STATUS_BADGE[s.status]
              const responsible = s.assigned_to_profile ?? s.owner
              return (
                <div
                  key={s.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div
                    className="group relative flex items-center gap-4 px-6 py-3 opacity-85 hover:opacity-100 hover:bg-primary/[0.01] transition-all duration-200 cursor-pointer"
                    onClick={() => openDetail(s)}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 w-[150px] min-w-0 shrink-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">{s.pet?.name ?? '—'}</p>
                        {s.pet?.species?.name && <p className="text-[10px] text-muted-foreground truncate">{s.pet.species.name}</p>}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                      {s.services.length > 0
                        ? s.services.slice(0, 2).map(sv => (
                            <span key={sv.id} className="text-[10px] font-medium px-2 py-[1px] rounded-full bg-primary/10 text-primary border border-primary/20">{sv.service_name}</span>
                          ))
                        : <span className="text-[11px] text-muted-foreground">—</span>
                      }
                    </div>
                    <div className="w-[160px] shrink-0 min-w-0">
                      {responsible ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                            <User size={10} className="text-muted-foreground" />
                          </div>
                          <p className="text-[11px] font-medium text-foreground truncate">{responsible.full_name}</p>
                        </div>
                      ) : <span className="text-[11px] text-muted-foreground/40">—</span>}
                    </div>
                    <div className="w-[80px] shrink-0 space-y-[1px]">
                      <p className="text-[10px] text-muted-foreground">{fmtDateCompact(s.session_date)}</p>
                      <p className="text-[12px] font-semibold tabular-nums text-foreground">{fmtTime(s.session_date)}</p>
                    </div>
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
          <SectionHeader variant="muted" title="Historial" count={meta.total} />
          <div className="flex items-center gap-4 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[140px]">Mascota</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">Servicios</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[160px]">Responsable</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[90px]">Fecha</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 w-[80px]">Estado</span>
            <span className="w-9" />
          </div>
          <div className="divide-y divide-[#f3f5f7]">
            {historialSorted.map((s, index) => {
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
                    <div className="flex items-center gap-3 w-[140px] min-w-0">
                      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#f3f5f7] to-[#e7ebef] border border-[#d0d8e0] flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                        <PetIcon size={16} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-foreground leading-tight truncate group-hover:text-primary transition-colors">{s.pet?.name ?? '—'}</p>
                        {s.pet?.species?.name && <p className="text-[10px] text-muted-foreground truncate">{s.pet.species.name}</p>}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                      {s.services.length > 0
                        ? s.services.map(sv => (
                            <span key={sv.id} className="text-[10px] font-medium px-2 py-[1px] rounded-full bg-primary/10 text-primary border border-primary/20">{sv.service_name}</span>
                          ))
                        : <span className="text-[11px] text-muted-foreground">—</span>
                      }
                    </div>
                    <div className="w-[160px] shrink-0 min-w-0">
                      {responsible ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                            <User size={10} className="text-muted-foreground" />
                          </div>
                          <p className="text-[11px] font-medium text-foreground truncate">{responsible.full_name}</p>
                        </div>
                      ) : <span className="text-[11px] text-muted-foreground/40">—</span>}
                    </div>
                    <div className="w-[90px] shrink-0 space-y-0.5">
                      <p className="text-[12px] font-medium text-foreground">
                        {new Date(s.session_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {s.started_at && s.ended_at && (
                        <p className="text-[10px] text-muted-foreground">{formatDuration(s.started_at, s.ended_at)}</p>
                      )}
                    </div>
                    <div className="w-[80px] shrink-0">
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
          {totalPages > 1 && (
            <div className="px-6 py-3 bg-[#fafbfc] border-t border-[#f3f5f7] flex items-center justify-between text-sm text-muted-foreground">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>
                Anterior
              </Button>
              <span>Página {meta.page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={meta.page >= totalPages} onClick={() => load(meta.page + 1)}>
                Siguiente
              </Button>
            </div>
          )}
          <ListFooter count={meta.total} label={meta.total === 1 ? 'sesión registrada' : 'sesiones registradas'} />
        </div>
      )}

    </div>
  )
}
