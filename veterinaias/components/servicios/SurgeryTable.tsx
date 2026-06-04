'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SurgeryRow {
  id: string
  started_at: string | null
  ended_at: string | null
  scheduled_at: string | null
  procedure: string | null
  diagnosis: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
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
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin cirugías registradas</p>
          <p className="text-xs text-muted-foreground mt-1">Agenda una cirugía y regístrala al concluir.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Mascota</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Procedimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(r => (
                <tr key={r.id} onClick={() => router.push(`/dashboard/servicios/cirugia/${r.id}`)} className="hover:bg-muted/20 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatDate(r.ended_at ?? r.started_at ?? r.scheduled_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.pet?.name ?? '—'}</p>
                    {r.pet?.species?.name && <p className="text-xs text-muted-foreground">{r.pet.species.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.procedure ?? r.diagnosis ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
