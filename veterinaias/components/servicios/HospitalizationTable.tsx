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
    .sort((a, b) => new Date(a.started_at!).getTime() - new Date(b.started_at!).getTime())
  const history = rows.filter(r => r.ended_at)
    .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())

  if (loading) return <ListSkeleton />

  return (
    <div className="space-y-6">

      {/* ── En curso ── */}
      {active.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
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
        </div>
      )}

      {/* ── Historial ── */}
      {history.length > 0 && (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
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
          <ListFooter count={rows.length} label={rows.length === 1 ? 'hospitalización' : 'hospitalizaciones'} />
        </div>
      )}

      {/* ── Empty state ── */}
      {rows.length === 0 && (
        <div className="text-center py-20 bg-card rounded-[1.5rem] border border-border overflow-hidden">
          <div className="text-4xl opacity-20 rotate-6 mb-4 inline-block">
            <HeartPulse size={40} />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Sin hospitalizaciones registradas</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-[260px] mx-auto">
            Las hospitalizaciones se inician desde la consulta o cirugía del paciente.
          </p>
        </div>
      )}

    </div>
  )
}
