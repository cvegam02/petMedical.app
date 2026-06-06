'use client'
import { useState, useEffect } from 'react'
import { BedDouble, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isCheckoutOverdue, stayDayLabel } from '@/lib/utils/boarding'
import { formatDate, formatDateTime } from '@/lib/utils/format'

export interface BoardingStay {
  id: string
  status: string
  started_at: string | null
  ended_at: string | null
  expected_check_out: string | null
  feeding_instructions: string | null
  belongings: string | null
  special_care: string | null
  notes: string | null
  pet: { id: string; name: string; species: { name: string } | null } | null
}

interface DailyLog {
  id: string
  log_date: string
  notes: string | null
  fed: boolean
  walked: boolean
  created_at: string
}


interface Props {
  visitId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}

export function BoardingStayDetailModal({ visitId, open, onOpenChange, onChanged }: Props) {
  const [stay, setStay] = useState<BoardingStay | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(false)
  const [syncedId, setSyncedId] = useState<string | null>(null)
  const [logNotes, setLogNotes] = useState('')
  const [fed, setFed] = useState(false)
  const [walked, setWalked] = useState(false)
  const [savingLog, setSavingLog] = useState(false)
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)

  async function load(id: string) {
    setLoading(true)
    try {
      const [stayRes, logsRes] = await Promise.all([
        fetch(`/api/servicios/hotel/${id}`),
        fetch(`/api/servicios/hotel/${id}/daily-logs`),
      ])
      const stayJson = await stayRes.json()
      const logsJson = await logsRes.json()
      setStay(stayRes.ok ? stayJson.data : null)
      setLogs(logsRes.ok ? (logsJson.data ?? []) : [])
    } catch {
      setStay(null); setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) { setSyncedId(null); return }
    if (!visitId || visitId === syncedId) return
    setSyncedId(visitId)
    setLogNotes(''); setFed(false); setWalked(false); setCheckoutNotes('')
    load(visitId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visitId])

  async function addLog() {
    if (!visitId) return
    setSavingLog(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}/daily-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: logNotes.trim() || undefined, fed, walked }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      setLogs(prev => [json.data, ...prev.filter(l => l.log_date !== json.data.log_date)])
      setLogNotes(''); setFed(false); setWalked(false)
      toast.success('Entrada agregada')
    } catch {
      toast.error('Error de red.')
    } finally {
      setSavingLog(false)
    }
  }

  async function checkOut() {
    if (!visitId) return
    setCheckingOut(true)
    try {
      const res = await fetch(`/api/servicios/hotel/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ended_at: new Date().toISOString(), ...(checkoutNotes.trim() ? { notes: checkoutNotes.trim() } : {}) }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error en el check-out'); return }
      toast.success('Check-out realizado')
      onOpenChange(false)
      onChanged?.()
    } catch {
      toast.error('Error de red.')
    } finally {
      setCheckingOut(false)
    }
  }

  const inProgress = stay && stay.started_at && !stay.ended_at

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble size={16} className="text-muted-foreground" />
            Detalle de estancia
          </DialogTitle>
        </DialogHeader>

        {loading || !stay ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>
        ) : (
          <div className="space-y-5 mt-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">{stay.pet?.name ?? '—'}</p>
                {stay.pet?.species?.name && <p className="text-xs text-muted-foreground">{stay.pet.species.name}</p>}
              </div>
              {inProgress && (
                isCheckoutOverdue(stay.expected_check_out, stay.started_at, stay.ended_at) ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border text-orange-600 bg-orange-50 border-orange-200">
                    Salida vencida
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                    {stayDayLabel(stay.started_at, stay.expected_check_out)}
                  </span>
                )
              )}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 space-y-1 text-sm">
              <p>Entrada: <span className="text-muted-foreground">{formatDateTime(stay.started_at)}</span></p>
              <p>Salida esperada: <span className="text-muted-foreground">{formatDateTime(stay.expected_check_out)}</span></p>
              {stay.ended_at && <p>Salida: <span className="text-muted-foreground">{formatDateTime(stay.ended_at)}</span></p>}
            </div>

            <div className="space-y-1.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recepción</p>
              <p><span className="font-medium">Alimentación:</span> {stay.feeding_instructions || '—'}</p>
              <p><span className="font-medium">Pertenencias:</span> {stay.belongings || '—'}</p>
              <p><span className="font-medium">Cuidados:</span> {stay.special_care || '—'}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bitácora diaria</p>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin entradas todavía.</p>
              ) : (
                <div className="space-y-1.5">
                  {logs.map(l => (
                    <div key={l.id} className="rounded-lg border border-border/60 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{formatDate(l.log_date)}</span>
                        <span className="flex gap-1.5">
                          {l.fed && <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">Alimentó</span>}
                          {l.walked && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Paseó</span>}
                        </span>
                      </div>
                      {l.notes && <p className="text-muted-foreground mt-1">{l.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {inProgress && (
                <div className="rounded-lg border border-dashed border-border/60 p-3 space-y-2 mt-2">
                  <Textarea value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Nota del día…" className="resize-none h-14 text-sm" />
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={fed} onChange={e => setFed(e.target.checked)} /> Alimentó
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={walked} onChange={e => setWalked(e.target.checked)} /> Paseó
                    </label>
                    <Button size="sm" variant="outline" className="ml-auto" onClick={addLog} disabled={savingLog}>
                      <Plus size={13} className="mr-1" />{savingLog ? 'Guardando…' : 'Agregar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {!inProgress && stay.notes && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas de salida</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{stay.notes}</p>
              </div>
            )}

            {inProgress && (
              <div className="space-y-2 border-t border-border/60 pt-4">
                <Label className="text-xs">Notas de salida (opcional)</Label>
                <Textarea value={checkoutNotes} onChange={e => setCheckoutNotes(e.target.value)} className="resize-none h-16 text-sm" placeholder="Estado al entregar…" />
                <Button className="w-full" onClick={checkOut} disabled={checkingOut}>
                  {checkingOut ? 'Procesando…' : 'Check-out'}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
