'use client'
import { useEffect, useState } from 'react'
import { Scissors, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GroomingSessionModal } from './GroomingSessionModal'

interface SessionRow {
  id: string
  session_date: string
  notes: string | null
  services: { id: string; service_name: string }[]
  tenant: { name: string } | null
}

interface GroomingHistoryModalProps {
  petId: string
  petName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GroomingHistoryModal({ petId, petName, open, onOpenChange }: GroomingHistoryModalProps) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  async function loadSessions() {
    setLoading(true)
    const res = await fetch(`/api/pets/${petId}/grooming-sessions`)
    const json = await res.json()
    setSessions(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (open) loadSessions()
  }, [open, petId])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Scissors size={16} />Historial de Estética
              </DialogTitle>
              <Button size="sm" onClick={() => setAddOpen(true)} className="mr-6">
                <Plus size={14} className="mr-1" />Registrar sesión
              </Button>
            </div>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
              <p className="text-sm font-medium text-foreground">Sin sesiones registradas</p>
              <p className="text-xs text-muted-foreground mt-1">
                Registra la primera sesión de estética o agrégala desde la página de Servicios.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Servicios</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        {new Date(s.session_date).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
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
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                        {s.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <GroomingSessionModal
        open={addOpen}
        onOpenChange={setAddOpen}
        petId={petId}
        petName={petName}
        onSuccess={() => { setAddOpen(false); loadSessions() }}
      />
    </>
  )
}
