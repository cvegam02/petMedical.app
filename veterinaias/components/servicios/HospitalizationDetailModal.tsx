'use client'
import { useState, useEffect } from 'react'
import { HeartPulse, CheckCircle2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import type { HospitalizationDailyLog } from '@/lib/types/database'

interface HospVisit {
  id: string
  started_at: string | null
  ended_at: string | null
  status: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  reason: string | null
  diagnosis: string | null
  weight_kg: number | null
  treatment_plan: string | null
  discharge_notes: string | null
  discharge_diagnosis: string | null
  post_discharge_instructions: string | null
}

interface Props {
  visitId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
  onScheduleFollowUp?: (petId: string) => void
}

function dayNumber(startedAt: string | null): number {
  if (!startedAt) return 1
  const start = new Date(startedAt)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(1, Math.round((todayDay.getTime() - startDay.getTime()) / 86400000) + 1)
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function HospitalizationDetailModal({ visitId, open, onOpenChange, onChanged, onScheduleFollowUp }: Props) {
  const [hosp, setHosp] = useState<HospVisit | null>(null)
  const [logs, setLogs] = useState<HospitalizationDailyLog[]>([])
  const [loading, setLoading] = useState(false)
  const [syncedId, setSyncedId] = useState<string | null>(null)

  const [logNotes, setLogNotes] = useState('')
  const [logMeds, setLogMeds] = useState('')
  const [logFed, setLogFed] = useState(false)
  const [logTemp, setLogTemp] = useState('')
  const [savingLog, setSavingLog] = useState(false)

  const [showDischarge, setShowDischarge] = useState(false)
  const [dischargeNotes, setDischargeNotes] = useState('')
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('')
  const [dischargeInstructions, setDischargeInstructions] = useState('')
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false)
  const [dischargeSaving, setDischargeSaving] = useState(false)

  async function load(id: string) {
    setLoading(true)
    try {
      const [hospRes, logsRes] = await Promise.all([
        fetch(`/api/servicios/hospitalizacion/${id}`),
        fetch(`/api/servicios/hospitalizacion/${id}/daily-logs`),
      ])
      const hospJson = await hospRes.json()
      const logsJson = await logsRes.json()
      setHosp(hospRes.ok ? hospJson.data : null)
      setLogs(logsRes.ok ? logsJson.data ?? [] : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && visitId && visitId !== syncedId) {
      setSyncedId(visitId)
      load(visitId)
    }
    if (!open) {
      setHosp(null)
      setLogs([])
      setSyncedId(null)
      setShowDischarge(false)
    }
  }, [open, visitId])

  async function handleAddLog() {
    if (!visitId) return
    setSavingLog(true)
    try {
      const res = await fetch(`/api/servicios/hospitalizacion/${visitId}/daily-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: logNotes.trim() || undefined,
          medications: logMeds.trim() || undefined,
          fed: logFed,
          temperature: logTemp ? parseFloat(logTemp) : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar entrada'); return }
      toast.success('Entrada registrada')
      setLogNotes(''); setLogMeds(''); setLogFed(false); setLogTemp('')
      setLogs(prev => {
        const existing = prev.findIndex(l => l.log_date === json.data.log_date)
        if (existing >= 0) {
          return prev.map((l, i) => i === existing ? json.data : l)
        }
        return [...prev, json.data].sort((a, b) => a.log_date.localeCompare(b.log_date))
      })
    } catch {
      toast.error('Error de red.')
    } finally {
      setSavingLog(false)
    }
  }

  async function handleDischarge() {
    if (!visitId) return
    setDischargeSaving(true)
    try {
      const res = await fetch(`/api/servicios/hospitalizacion/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          discharge_notes: dischargeNotes.trim() || undefined,
          discharge_diagnosis: dischargeDiagnosis.trim() || undefined,
          post_discharge_instructions: dischargeInstructions.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al dar de alta'); return }
      toast.success('Alta registrada')
      onChanged?.()
      if (scheduleFollowUp && hosp?.pet?.id) {
        onOpenChange(false)
        onScheduleFollowUp?.(hosp.pet.id)
      } else {
        onOpenChange(false)
      }
    } catch {
      toast.error('Error de red.')
    } finally {
      setDischargeSaving(false)
    }
  }

  const inProgress = hosp?.started_at && !hosp.ended_at

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse size={18} className="text-primary/60" />
            {loading ? 'Cargando…' : (hosp?.pet?.name ?? 'Hospitalización')}
            {inProgress && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · Día {dayNumber(hosp!.started_at)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-center text-muted-foreground py-8">Cargando…</p>}

        {!loading && hosp && (
          <div className="space-y-5 pt-1">
            {hosp.ended_at && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Alta completada</p>
                  <p className="text-xs text-green-700 mt-0.5">Egreso: {formatDate(hosp.ended_at)}</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Ingreso</p>
              {hosp.reason && (
                <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">Motivo</p>
                  <p className="text-sm">{hosp.reason}</p></div>
              )}
              {hosp.diagnosis && (
                <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mt-2">Diagnóstico</p>
                  <p className="text-sm">{hosp.diagnosis}</p></div>
              )}
              {hosp.treatment_plan && (
                <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mt-2">Plan de tratamiento</p>
                  <p className="text-sm">{hosp.treatment_plan}</p></div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-3">Bitácora diaria</p>
              {logs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">Sin entradas aún.</p>
              )}
              <div className="space-y-2 mb-4">
                {logs.map(log => (
                  <div key={log.id} className="rounded-lg border border-border bg-card px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground/60">{formatDate(log.log_date)}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {log.fed && <span className="text-green-600 font-medium">✓ Alimentado</span>}
                        {log.temperature != null && <span>{log.temperature}°C</span>}
                      </div>
                    </div>
                    {log.notes && <p className="text-sm">{log.notes}</p>}
                    {log.medications && <p className="text-xs text-muted-foreground">Meds: {log.medications}</p>}
                  </div>
                ))}
              </div>

              {inProgress && (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground/60">Nueva entrada de hoy</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Notas de evolución</Label>
                    <Textarea value={logNotes} onChange={e => setLogNotes(e.target.value)}
                      className="resize-none h-16 text-sm" placeholder="Estado general, observaciones…" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Medicamentos administrados</Label>
                    <Input value={logMeds} onChange={e => setLogMeds(e.target.value)}
                      className="text-sm" placeholder="Medicación, dosis…" />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">Temperatura (°C)</Label>
                      <Input type="number" step="0.1" min="30" max="45"
                        value={logTemp} onChange={e => setLogTemp(e.target.value)}
                        className="text-sm" placeholder="38.5" />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <Checkbox id="fed" checked={logFed} onCheckedChange={v => setLogFed(v === true)} />
                      <label htmlFor="fed" className="text-sm cursor-pointer">Alimentado</label>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleAddLog} disabled={savingLog}>
                    <Plus size={14} />
                    {savingLog ? 'Guardando…' : 'Agregar entrada'}
                  </Button>
                </div>
              )}
            </div>

            {inProgress && !showDischarge && (
              <Button variant="destructive" className="w-full" onClick={() => setShowDischarge(true)}>
                Dar de alta
              </Button>
            )}

            {inProgress && showDischarge && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <p className="text-sm font-bold">Alta hospitalaria</p>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Notas de egreso</Label>
                  <Textarea value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)}
                    className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
                    placeholder="Estado al egreso, evolución general…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Diagnóstico final</Label>
                  <Input value={dischargeDiagnosis} onChange={e => setDischargeDiagnosis(e.target.value)}
                    className="bg-muted/30 focus:bg-white transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-bold">Instrucciones para el dueño</Label>
                  <Textarea value={dischargeInstructions} onChange={e => setDischargeInstructions(e.target.value)}
                    className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
                    placeholder="Cuidados en casa, restricciones, señales de alerta…" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="follow-up" checked={scheduleFollowUp}
                    onCheckedChange={v => setScheduleFollowUp(v === true)} />
                  <label htmlFor="follow-up" className="text-sm cursor-pointer">
                    Agendar cita de seguimiento (consulta)
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDischarge(false)}>
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={handleDischarge} disabled={dischargeSaving}>
                    {dischargeSaving ? 'Guardando…' : 'Confirmar alta'}
                  </Button>
                </div>
              </div>
            )}

            {hosp.ended_at && (hosp.discharge_notes || hosp.discharge_diagnosis || hosp.post_discharge_instructions) && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Alta</p>
                {hosp.discharge_diagnosis && (
                  <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">Diagnóstico final</p>
                    <p className="text-sm">{hosp.discharge_diagnosis}</p></div>
                )}
                {hosp.discharge_notes && (
                  <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mt-2">Notas de egreso</p>
                    <p className="text-sm">{hosp.discharge_notes}</p></div>
                )}
                {hosp.post_discharge_instructions && (
                  <div><p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mt-2">Instrucciones</p>
                    <p className="text-sm">{hosp.post_discharge_instructions}</p></div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
