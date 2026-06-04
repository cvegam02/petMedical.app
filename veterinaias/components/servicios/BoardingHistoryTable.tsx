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
