'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { HeartPulse } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PrefillData {
  sourceVisitId: string
  serviceType: string
  pet: { id: string; name: string; species: { name: string } | null } | null
  diagnosis: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitId?: string | null
  appointmentId?: string | null
  onAdmitted: (hospVisitId: string) => void
}

export function AdmitPatientModal({ open, onOpenChange, visitId, appointmentId, onAdmitted }: Props) {
  const [prefill, setPrefill] = useState<PrefillData | null>(null)
  const [loadingPrefill, setLoadingPrefill] = useState(false)

  const [reason, setReason] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!visitId && !appointmentId) return

    setLoadingPrefill(true)
    const param = visitId ? `visitId=${visitId}` : `appointmentId=${appointmentId}`
    fetch(`/api/servicios/hospitalizacion/prefill?${param}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setPrefill(json.data)
          setDiagnosis(json.data.diagnosis ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrefill(false))
  }, [open, visitId, appointmentId])

  function reset() {
    setPrefill(null)
    setReason('')
    setDiagnosis('')
    setWeightKg('')
    setTreatmentPlan('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prefill?.sourceVisitId) return
    if (!reason.trim()) { toast.error('El motivo es requerido'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/servicios/hospitalizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_visit_id: prefill.sourceVisitId,
          reason: reason.trim(),
          ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
          ...(weightKg ? { weight_kg: parseFloat(weightKg) } : {}),
          ...(treatmentPlan.trim() ? { treatment_plan: treatmentPlan.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al registrar ingreso'); return }
      toast.success('Paciente hospitalizado')
      reset()
      onOpenChange(false)
      onAdmitted(json.data.id)
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const serviceLabel = prefill?.serviceType === 'surgery' ? 'Cirugía' : 'Consulta'

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse size={18} className="text-primary/60" />
            Registrar ingreso
          </DialogTitle>
        </DialogHeader>

        {loadingPrefill ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando datos…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {prefill?.pet && (
              <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 space-y-0.5">
                <p className="text-sm font-semibold">{prefill.pet.name}</p>
                <p className="text-xs text-muted-foreground">
                  {prefill.pet.species?.name ?? '—'} · Origen: {serviceLabel}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold">
                Motivo de hospitalización <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Descripción del motivo de internamiento…"
                className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold">Diagnóstico al ingreso</Label>
              <Input
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                placeholder="Pre-cargado de la consulta/cirugía, editable"
                className="bg-muted/30 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">Peso al ingreso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  placeholder="0.0"
                  className="bg-muted/30 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-bold">Plan de tratamiento inicial</Label>
              <Textarea
                value={treatmentPlan}
                onChange={e => setTreatmentPlan(e.target.value)}
                placeholder="Medicación, procedimientos planificados…"
                className="resize-none h-20 bg-muted/30 focus:bg-white transition-all"
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving || !prefill}>
              {saving ? 'Registrando ingreso…' : 'Registrar ingreso'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
