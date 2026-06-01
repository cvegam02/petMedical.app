'use client'
import { useState, useEffect } from 'react'
import { Scissors, CheckCircle2, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { PanelProps } from './index'

const ACTIVE_STATUSES = ['scheduled', 'confirmed']

interface GroomingSession {
  id: string
  started_at: string | null
  ended_at: string | null
  notes: string | null
  services: { id: string; service_name: string }[]
}

function formatDuration(startedAt: string, endedAt: string): string {
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function GroomingPanel({ appointment, onClose, onRefresh }: PanelProps) {
  const [loadingSession, setLoadingSession] = useState(false)
  const [session, setSession] = useState<GroomingSession | null>(null)
  const [startingSession, setStartingSession] = useState(false)
  const [concludeNotes, setConcludeNotes] = useState('')
  const [concluding, setConcluding] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null)

  const isActive = ACTIVE_STATUSES.includes(appointment.status)
  const sessionInProgress = session && session.started_at && !session.ended_at
  const sessionCompleted = session && session.ended_at

  useEffect(() => {
    setLoadingSession(true)
    setConcludeNotes('')
    setSession(null)
    fetch(`/api/servicios/estetica?appointmentId=${appointment.id}`)
      .then(r => r.json())
      .then(json => setSession(json.data ?? null))
      .catch(() => setSession(null))
      .finally(() => setLoadingSession(false))
  }, [appointment.id])

  async function handleStartSession() {
    if (!appointment.pet?.id) return
    setStartingSession(true)
    try {
      const res = await fetch('/api/servicios/estetica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: appointment.pet.id,
          appointment_id: appointment.id,
          session_date: new Date().toISOString().split('T')[0],
          started_at: new Date().toISOString(),
          services: [],
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al iniciar sesión'); return }
      toast.success('Sesión de estética iniciada')
      setSession(json.data)
      onRefresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setStartingSession(false)
    }
  }

  async function handleConcludeSession() {
    if (!session?.id) return
    setConcluding(true)
    try {
      const endedAt = new Date().toISOString()
      const res = await fetch(`/api/servicios/estetica/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: endedAt,
          ...(concludeNotes.trim() ? { notes: concludeNotes.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al concluir sesión'); return }

      await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      toast.success('Servicio de estética concluido')
      setSession({ ...json.data, services: session.services })
      onClose()
      onRefresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setConcluding(false)
    }
  }

  async function transition(newStatus: string) {
    setLoadingStatus(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al actualizar'); return }
      onClose()
      onRefresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setLoadingStatus(null)
    }
  }

  return (
    <>
      {/* Session status block */}
      <div className="px-6 py-4 border-t border-border/60">
        {loadingSession ? (
          <p className="text-xs text-muted-foreground">Cargando sesión...</p>
        ) : sessionCompleted ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-600 shrink-0" />
              <p className="text-sm font-semibold text-green-800">Servicio completado</p>
            </div>
            <div className="pl-[22px] space-y-1 text-xs text-green-700">
              <p>Inicio: {formatTime(session!.started_at!)}</p>
              <p>Salida: {formatTime(session!.ended_at!)}</p>
              <p className="font-semibold">Duración: {formatDuration(session!.started_at!, session!.ended_at!)}</p>
              {session!.notes && <p className="text-green-600 italic">{session!.notes}</p>}
            </div>
          </div>
        ) : sessionInProgress ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Timer size={14} className="text-amber-600 shrink-0" />
                <p className="text-sm font-semibold text-amber-800">Sesión en curso</p>
              </div>
              <p className="text-xs text-amber-700 pl-[22px]">
                Inicio: {formatTime(session!.started_at!)}
              </p>
              {session!.services.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pl-[22px]">
                  {session!.services.map(sv => (
                    <span key={sv.id} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {sv.service_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas finales (opcional)</Label>
              <Textarea
                placeholder="Observaciones del servicio, estado del pelaje..."
                value={concludeNotes}
                onChange={e => setConcludeNotes(e.target.value)}
                className="resize-none h-16 text-sm"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleConcludeSession}
              disabled={concluding}
            >
              {concluding ? 'Guardando...' : 'Concluir Servicio'}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 pt-4 border-t border-border/60">
        {!session && !loadingSession ? (
          isActive ? (
            <div className="space-y-2">
              <Button
                className="w-full justify-center gap-2 font-semibold"
                onClick={handleStartSession}
                disabled={startingSession}
              >
                <Scissors size={15} />
                {startingSession ? 'Iniciando...' : 'Iniciar sesión de estética'}
              </Button>
              <div className="flex items-center justify-center gap-4 mt-3">
                {appointment.status === 'scheduled' && (
                  <>
                    <button
                      type="button"
                      onClick={() => transition('confirmed')}
                      disabled={loadingStatus === 'confirmed'}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    >
                      {loadingStatus === 'confirmed' ? 'Confirmando…' : 'Confirmar cita'}
                    </button>
                    <span className="text-border text-xs">·</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => transition('no_show')}
                  disabled={loadingStatus === 'no_show'}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                  {loadingStatus === 'no_show' ? 'Guardando…' : 'No se presentó'}
                </button>
                <span className="text-border text-xs">·</span>
                <button
                  type="button"
                  onClick={() => transition('cancelled')}
                  disabled={loadingStatus === 'cancelled'}
                  className="text-xs text-destructive/60 hover:text-destructive transition-colors disabled:opacity-40"
                >
                  {loadingStatus === 'cancelled' ? 'Guardando…' : 'Cancelar'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-center text-muted-foreground py-1">
              {appointment.status === 'completed' && 'Cita completada.'}
              {appointment.status === 'cancelled' && 'Cita cancelada.'}
              {appointment.status === 'no_show' && 'El cliente no se presentó.'}
            </p>
          )
        ) : sessionCompleted ? (
          <p className="text-sm text-center text-muted-foreground py-1">Servicio completado.</p>
        ) : null}
      </div>
    </>
  )
}
