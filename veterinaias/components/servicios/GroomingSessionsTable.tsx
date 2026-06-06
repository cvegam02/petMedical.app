'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ChevronRight, Scissors, User } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'
import { Button } from '@/components/ui/button'

type SessionStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

interface SessionRow {
  id: string            // appointment.id — used for navigation
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
  scheduled:   { label: 'Programada',  className: 'text-secondary-foreground bg-secondary/40 border-border' },
  confirmed:   { label: 'Confirmada',  className: 'text-blue-700 bg-blue-50 border-blue-200' },
  in_progress: { label: 'En curso',    className: 'text-amber-700 bg-amber-50 border-amber-200', dot: true },
  completed:   { label: 'Completada',  className: 'text-green-700 bg-green-50 border-green-200' },
  cancelled:   { label: 'Cancelada',   className: 'text-muted-foreground bg-muted/40 border-border' },
  no_show:     { label: 'No se presentó', className: 'text-muted-foreground bg-muted/40 border-border' },
}

function formatDuration(startedAt: string, endedAt: string): string {
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
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
  const inProgress = sessions.filter(s => s.status === 'in_progress')

  return (
    <div>
      {/* In-progress banner */}
      {inProgress.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">En curso</p>
          <div className="space-y-2">
            {inProgress.map(s => {
              const elapsedMins = s.started_at
                ? Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000)
                : 0
              return (
                <div key={s.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="text-sm font-medium text-foreground">{s.pet?.name ?? '—'}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={11} />{elapsedMins} min transcurridos
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openDetail(s)}>
                    Finalizar
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Header: count */}
      <div className="flex items-center gap-2 mb-6">
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">Sesiones</p>
        {!loading && (
          <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[12px] font-mono px-2 py-0.5 rounded-md border border-border/50">
            {meta.total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border/50 flex items-center px-6 gap-6">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-muted/40 animate-pulse rounded" />
                <div className="h-3 w-1/6 bg-muted/20 animate-pulse rounded" />
              </div>
              <div className="w-20 h-5 bg-muted/30 animate-pulse rounded-full" />
              <div className="w-28 h-3 bg-muted/20 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-24 rounded-[2rem] border-2 border-dashed border-border/60 bg-muted/[0.02]">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl rotate-6 animate-pulse" />
            <div className="absolute inset-0 bg-card border border-border shadow-sm rounded-2xl flex items-center justify-center">
              <Scissors size={32} className="text-muted-foreground/20" />
            </div>
          </div>
          <p className="font-bold text-foreground text-xl tracking-tight">Sin sesiones registradas</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed">
            Agenda una cita de estética desde el calendario o usa el botón de arriba.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
            {/* Column headers */}
            <div className="flex items-center gap-6 px-6 py-5 bg-muted/20 border-b border-border/60">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-52">Mascota</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1">Servicios</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-36">Responsable</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-28">Fecha</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-24">Estado</p>
              <div className="w-9" />
            </div>

            <div className="divide-y divide-border/40">
              {sessions.map((s, index) => {
                const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.scheduled
                const PetIcon = getSpeciesIcon(s.pet?.species?.name)
                return (
                  <div
                    key={s.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    <div
                      className="group relative flex items-center gap-6 py-5 px-6 hover:bg-primary/[0.01] active:scale-[0.998] transition-all duration-300 cursor-pointer"
                      onClick={() => openDetail(s)}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full group-hover:h-8 transition-all duration-300" />

                      {/* Pet */}
                      <div className="flex items-center gap-4 w-52 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted/50 to-muted border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500 shadow-sm shrink-0">
                          <PetIcon size={22} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-[15px] leading-tight tracking-tight truncate group-hover:text-primary transition-colors">
                            {s.pet?.name ?? '—'}
                          </p>
                          {s.pet?.species?.name && (
                            <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{s.pet.species.name}</p>
                          )}
                        </div>
                      </div>

                      {/* Services */}
                      <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                        {s.services.length > 0
                          ? s.services.map(sv => (
                              <span key={sv.id} className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {sv.service_name}
                              </span>
                            ))
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </div>

                      {/* Responsable */}
                      <div className="w-36 shrink-0 min-w-0">
                        {s.assigned_to_profile ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                              <User size={12} className="text-muted-foreground" />
                            </div>
                            <p className="text-[12px] font-medium text-foreground truncate">{s.assigned_to_profile.full_name}</p>
                          </div>
                        ) : s.owner ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                              <User size={12} className="text-muted-foreground" />
                            </div>
                            <p className="text-[12px] font-medium text-foreground truncate">{s.owner.full_name}</p>
                          </div>
                        ) : (
                          <span className="text-[12px] text-muted-foreground/40">—</span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="w-28 shrink-0">
                        <p className="text-[13px] font-medium text-foreground">
                          {new Date(s.session_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        {s.started_at && s.ended_at && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{formatDuration(s.started_at, s.ended_at)}</p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="w-24 shrink-0">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${badge.className}`}>
                          {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                          {badge.label}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="shrink-0 flex items-center" onClick={e => e.stopPropagation()}>
                        {s.status === 'in_progress' ? (
                          <Button size="sm" variant="outline" onClick={() => openDetail(s)} className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs">
                            Finalizar
                          </Button>
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-muted/20 border border-transparent flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:bg-white group-hover:border-border group-hover:shadow-sm transition-all duration-300">
                            <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 bg-muted/5 border-t border-border/40 flex items-center justify-between">
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                {meta.total} {meta.total === 1 ? 'sesión registrada' : 'sesiones registradas'}
              </p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Registros actualizados</span>
              </div>
            </div>
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
      )}
    </div>
  )
}
