// components/servicios/GroomingSessionsTable.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SessionRow {
  id: string
  session_date: string
  notes: string | null
  started_at: string | null
  ended_at: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  services: { id: string; service_name: string }[]
}

interface Meta { total: number; page: number; limit: number }

interface GroomingSessionsTableProps {
  onNew: () => void
}

function sessionStatus(s: SessionRow): 'pending' | 'in_progress' | 'completed' {
  if (s.ended_at) return 'completed'
  if (s.started_at) return 'in_progress'
  return 'pending'
}

function formatDuration(startedAt: string, endedAt: string): string {
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function GroomingSessionsTable({ onNew }: GroomingSessionsTableProps) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [finalizingId, setFinalizingId] = useState<string | null>(null)
  const [finalizeNotes, setFinalizeNotes] = useState('')
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load(page = 1) {
    setLoading(true)
    const res = await fetch(`/api/servicios/estetica?page=${page}`)
    const json = await res.json()
    setSessions(json.data ?? [])
    setMeta(json.meta ?? { total: 0, page, limit: 20 })
    setLoading(false)
  }

  useEffect(() => { load(1) }, [])

  function openFinalize(id: string, currentNotes: string | null) {
    setFinalizingId(id)
    setFinalizeNotes(currentNotes ?? '')
    setFinalizeOpen(true)
  }

  async function handleFinalize() {
    if (!finalizingId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/servicios/estetica/${finalizingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ended_at: new Date().toISOString(), notes: finalizeNotes || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al finalizar'); return }
      toast.success('Sesión finalizada')
      setFinalizeOpen(false)
      load(meta.page)
    } catch {
      toast.error('Error de red.')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(meta.total / meta.limit)
  const inProgress = sessions.filter(s => sessionStatus(s) === 'in_progress')

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
                  <Button size="sm" variant="outline" onClick={() => openFinalize(s.id, s.notes)}>
                    Finalizar
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
            Inicia una sesión desde el detalle de una cita de estética.
          </p>
          <Button size="sm" className="mt-4" onClick={onNew}>+ Nueva sesión manual</Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Mascota</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Servicios</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Duración real</th>
                  <th className="text-right px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sessions.map(s => {
                  const status = sessionStatus(s)
                  return (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        {status === 'in_progress' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />En curso
                          </span>
                        )}
                        {status === 'completed' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            Completada
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="text-xs text-muted-foreground">Manual</span>
                        )}
                      </td>
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
                          {s.services.length > 0
                            ? s.services.map(sv => (
                                <span key={sv.id} className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                  {sv.service_name}
                                </span>
                              ))
                            : <span className="text-xs text-muted-foreground">—</span>
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {s.started_at && s.ended_at
                          ? formatDuration(s.started_at, s.ended_at)
                          : s.started_at && !s.ended_at
                          ? <span className="text-amber-600">En curso...</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {status === 'in_progress' && (
                            <Button size="sm" variant="outline" onClick={() => openFinalize(s.id, s.notes)}>
                              Finalizar
                            </Button>
                          )}
                          {s.pet?.id && (
                            <Link
                              href={`/dashboard/pets/${s.pet.id}`}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ExternalLink size={12} />Ver mascota
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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

      {/* Finalizar modal */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Finalizar sesión</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            El dueño recogió a la mascota. Se registrará la hora de salida ahora.
          </p>
          <div className="space-y-1 mt-1">
            <Label>Notas finales (opcional)</Label>
            <Textarea
              placeholder="Observaciones, incidencias, estado del pelaje..."
              value={finalizeNotes}
              onChange={e => setFinalizeNotes(e.target.value)}
              className="resize-none h-24"
            />
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setFinalizeOpen(false)}>Cancelar</Button>
            <Button onClick={handleFinalize} disabled={saving}>
              {saving ? 'Guardando...' : 'Confirmar salida'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
