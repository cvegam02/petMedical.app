'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Cat, Dog, PawPrint, Syringe, AlertTriangle, CalendarCheck, User } from 'lucide-react'

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
  scheduled: { label: 'Programada', className: 'text-blue-700 bg-blue-50 border-blue-200' },
  in_progress: { label: 'En quirófano', className: 'text-amber-700 bg-amber-50 border-amber-200', dot: true },
  completed: { label: 'Completada', className: 'text-green-700 bg-green-50 border-green-200' },
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

function getPetIcon(speciesName: string | null | undefined) {
  const s = speciesName?.toLowerCase() ?? ''
  if (s.includes('fel') || s.includes('gat')) return Cat
  if (s.includes('can') || s.includes('perr')) return Dog
  return PawPrint
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

  return (
    <div>
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border/50 flex items-center px-6 gap-6">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-muted/40 animate-pulse rounded" />
                <div className="h-3 w-1/6 bg-muted/20 animate-pulse rounded" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-3 w-2/3 bg-muted/30 animate-pulse rounded" />
                <div className="h-3 w-1/3 bg-muted/20 animate-pulse rounded" />
              </div>
              <div className="w-24 h-6 bg-muted/20 animate-pulse rounded-full" />
              <div className="w-28 space-y-1.5">
                <div className="h-3 w-full bg-muted/20 animate-pulse rounded" />
                <div className="h-3 w-2/3 bg-muted/10 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-24 rounded-[2rem] border-2 border-dashed border-border/60 bg-muted/[0.02]">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl rotate-6 animate-pulse" />
            <div className="absolute inset-0 bg-card border border-border shadow-sm rounded-2xl flex items-center justify-center">
              <Syringe size={32} className="text-muted-foreground/20" />
            </div>
          </div>
          <p className="font-bold text-foreground text-xl tracking-tight">Sin cirugías registradas</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed">
            Agenda una cirugía desde la agenda y regístrala al concluir.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-6 px-6 py-5 bg-muted/20 border-b border-border/60">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-1/4">Mascota</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1">Motivo</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-36">Responsable</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-28">Estado</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-32">Fecha</p>
            <div className="w-9" />
          </div>

          <div className="divide-y divide-border/40">
            {rows.map((r, index) => {
              const PetIcon = getPetIcon(r.pet?.species?.name)
              const status = derivedStatus(r)
              const badge = STATUS_BADGE[status]
              const primaryDate = r.ended_at ?? r.started_at ?? r.scheduled_at
              const hasComplications = !!r.complications?.trim()

              return (
                <div
                  key={r.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <div
                    className="group relative flex items-center gap-6 py-5 px-6 hover:bg-primary/[0.01] active:scale-[0.998] transition-all duration-300 cursor-pointer"
                    onClick={() => router.push(`/dashboard/servicios/cirugia/${r.id}`)}
                  >
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full group-hover:h-8 transition-all duration-300" />

                    {/* Pet identity */}
                    <div className="flex items-center gap-4 w-1/4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted/50 to-muted border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500 shadow-sm shrink-0">
                        <PetIcon size={22} strokeWidth={1.5} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-[15px] leading-tight tracking-tight truncate group-hover:text-primary transition-colors">
                          {r.pet?.name ?? '—'}
                        </p>
                        {r.pet?.species?.name && (
                          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{r.pet.species.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Motivo */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-[14px] font-semibold text-foreground truncate leading-tight">
                        {r.diagnosis ?? r.procedure ?? '—'}
                      </p>
                    </div>

                    {/* Responsable */}
                    <div className="w-36 shrink-0 min-w-0">
                      {r.owner ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                            <User size={12} className="text-muted-foreground" />
                          </div>
                          <p className="text-[12px] font-medium text-foreground truncate">{r.owner.full_name}</p>
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Status + complications */}
                    <div className="w-28 shrink-0 space-y-1.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${badge.className}`}>
                        {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        {badge.label}
                      </span>
                      {hasComplications && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={11} className="text-orange-500 shrink-0" />
                          <span className="text-[10px] font-medium text-orange-600">Complicaciones</span>
                        </div>
                      )}
                    </div>

                    {/* Date + follow-up */}
                    <div className="w-32 shrink-0 space-y-1">
                      <p className="text-[13px] font-medium text-foreground">
                        {formatDate(primaryDate)}
                      </p>
                      {r.follow_up_date && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CalendarCheck size={11} className="shrink-0" />
                          <span className="text-[11px]">
                            Seguimiento: {formatDate(r.follow_up_date, { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <div className="shrink-0 flex items-center">
                      <div className="w-9 h-9 rounded-xl bg-muted/20 border border-transparent flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:bg-white group-hover:border-border group-hover:shadow-sm transition-all duration-300">
                        <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-5 bg-muted/5 border-t border-border/40 flex items-center justify-between">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
              {rows.length} {rows.length === 1 ? 'cirugía registrada' : 'cirugías registradas'}
            </p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
              <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Registros actualizados</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
