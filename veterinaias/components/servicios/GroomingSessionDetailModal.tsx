'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Scissors, Clock, ExternalLink, CalendarDays, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type GroomingVisitStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface GroomingSessionDetail {
  id: string
  status: GroomingVisitStatus
  session_date: string
  notes: string | null
  intake_notes: string | null
  started_at: string | null
  ended_at: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
  services: { id: string; service_name: string }[]
  owner: { id: string; full_name: string } | null
}

const STATUS_CONFIG: Record<GroomingVisitStatus, { label: string; className: string }> = {
  scheduled: { label: 'Programada', className: 'text-blue-700 bg-blue-50 border-blue-200' },
  in_progress: { label: 'En curso', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  completed: { label: 'Completada', className: 'text-green-700 bg-green-50 border-green-200' },
  cancelled: { label: 'Cancelada', className: 'text-muted-foreground bg-muted/40 border-border' },
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(startedAt: string, endedAt: string): string {
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

interface Props {
  session: GroomingSessionDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after the session is successfully finalized, so the parent can refresh. */
  onFinalized?: () => void
}

export function GroomingSessionDetailModal({ session, open, onOpenChange, onFinalized }: Props) {
  const [finalNotes, setFinalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncedId, setSyncedId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const inProgress = session?.status === 'in_progress'

  // Keep the elapsed-time counter live while an in-progress session is shown.
  useEffect(() => {
    if (!open || !inProgress) return
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [open, inProgress])

  // Sync the notes field to the active session (React-recommended "derive state
  // during render" pattern — avoids an effect just to reset the textarea).
  if (session && session.id !== syncedId) {
    setSyncedId(session.id)
    setFinalNotes(session.notes ?? '')
  }

  if (!session) return null

  const status = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.completed
  const elapsedMins = inProgress && session.started_at
    ? Math.max(0, Math.round((now - new Date(session.started_at).getTime()) / 60000))
    : null

  async function handleFinalize() {
    if (!session) return
    setSaving(true)
    try {
      const res = await fetch(`/api/servicios/estetica/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          ...(finalNotes.trim() ? { notes: finalNotes.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al finalizar'); return }
      toast.success('Sesión finalizada')
      onOpenChange(false)
      onFinalized?.()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors size={16} className="text-muted-foreground" />
            Detalle de sesión
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Pet + status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-foreground">{session.pet?.name ?? '—'}</p>
              {session.pet?.species?.name && (
                <p className="text-xs text-muted-foreground">{session.pet.species.name}</p>
              )}
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${status.className}`}>
              {inProgress && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              {status.label}
            </span>
          </div>

          {/* Times */}
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <CalendarDays size={14} className="text-muted-foreground shrink-0" />
              <span>{formatDateTime(session.session_date)}</span>
            </div>
            {session.started_at && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock size={13} className="shrink-0" />
                <span>
                  Entrada {formatDateTime(session.started_at)}
                  {session.ended_at && (
                    <> · Salida {formatDateTime(session.ended_at)} · {formatDuration(session.started_at, session.ended_at)}</>
                  )}
                </span>
              </div>
            )}
            {elapsedMins !== null && (
              <div className="flex items-center gap-2 text-amber-600 text-xs font-medium">
                <Timer size={13} className="shrink-0" />
                <span>{elapsedMins} min transcurridos</span>
              </div>
            )}
          </div>

          {/* Services */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Servicios</p>
            {session.services.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {session.services.map(sv => (
                  <span key={sv.id} className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {sv.service_name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin servicios registrados</p>
            )}
          </div>

          {/* Reception notes — always read-only (captured at intake) */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas de recepción</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {session.intake_notes?.trim() ? session.intake_notes : <span className="text-muted-foreground">Sin notas de recepción</span>}
            </p>
          </div>

          {/* Final notes — editable while in progress, read-only otherwise */}
          {inProgress ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Notas finales (opcional)
              </Label>
              <Textarea
                placeholder="Observaciones del servicio realizado, estado del pelaje al finalizar..."
                value={finalNotes}
                onChange={e => setFinalNotes(e.target.value)}
                className="resize-none h-20"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas finales</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {session.notes?.trim() ? session.notes : <span className="text-muted-foreground">Sin notas finales</span>}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {session.pet?.id ? (
              <Link
                href={`/dashboard/pets/${session.pet.id}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ExternalLink size={13} className="mr-1.5" />Ver mascota
              </Link>
            ) : <span />}

            {inProgress && (
              <Button size="sm" onClick={handleFinalize} disabled={saving}>
                {saving ? 'Guardando...' : 'Finalizar servicio'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
