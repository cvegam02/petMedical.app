'use client'
import { useEffect, useState } from 'react'
import { HeartPulse } from 'lucide-react'

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

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <section>
          <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-3">En curso</p>
          <div className="space-y-2">
            {active.map(row => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row.id)}
                className="w-full text-left rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3.5 hover:shadow-sm hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{row.pet?.name ?? '—'}</p>
                      {row.reason && <p className="text-xs text-muted-foreground truncate">{row.reason}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-blue-700 whitespace-nowrap shrink-0">
                    Día {dayNumber(row.started_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-3">Historial</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Paciente</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Motivo</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Ingreso</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map(row => (
                  <tr key={row.id} onClick={() => onSelect(row.id)}
                    className="hover:bg-muted/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium">{row.pet?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{row.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.started_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.ended_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <HeartPulse size={32} className="text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">No hay hospitalizaciones registradas.</p>
          <p className="text-xs text-muted-foreground/60">
            Las hospitalizaciones se inician desde la consulta o cirugía del paciente.
          </p>
        </div>
      )}
    </div>
  )
}
