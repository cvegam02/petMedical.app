// components/servicios/GroomingSessionsTable.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SessionRow {
  id: string
  session_date: string
  notes: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  services: { id: string; service_name: string }[]
}

interface Meta { total: number; page: number; limit: number }

interface GroomingSessionsTableProps {
  onNew: () => void
}

export function GroomingSessionsTable({ onNew }: GroomingSessionsTableProps) {
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

  const totalPages = Math.ceil(meta.total / meta.limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {meta.total} {meta.total === 1 ? 'sesión registrada' : 'sesiones registradas'}
        </p>
        <Button size="sm" onClick={onNew}>+ Nueva sesión</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin sesiones registradas</p>
          <p className="text-xs text-muted-foreground mt-1">
            Registra la primera sesión desde aquí o desde el perfil de una mascota.
          </p>
          <Button size="sm" className="mt-4" onClick={onNew}>+ Nueva sesión</Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Mascota</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Servicios</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Notas</th>
                  <th className="text-right px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {new Date(s.session_date + 'T12:00:00').toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{s.pet?.name ?? '—'}</p>
                      {s.pet?.species?.name && (
                        <p className="text-xs text-muted-foreground">{s.pet.species.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.services.map(sv => (
                          <span
                            key={sv.id}
                            className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                          >
                            {sv.service_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">
                      {s.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.pet?.id && (
                        <Link
                          href={`/dashboard/pets/${s.pet.id}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink size={12} />Ver mascota
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <Button
                variant="outline" size="sm"
                disabled={meta.page <= 1}
                onClick={() => load(meta.page - 1)}
              >
                Anterior
              </Button>
              <span>Página {meta.page} de {totalPages}</span>
              <Button
                variant="outline" size="sm"
                disabled={meta.page >= totalPages}
                onClick={() => load(meta.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
