'use client'
import {
  Calendar,
  User,
  Heart,
  Stethoscope,
  Activity,
  FileText
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Prescription {
  id: string
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  notes: string | null
}

interface MedicalRecord {
  id: string
  reason: string
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  weight_kg: number | null
  temperature_celsius: number | null
  heart_rate_bpm: number | null
  respiratory_rate_bpm: number | null
  created_at: string
  created_by_profile: {
    full_name: string
  } | null
  prescriptions: Prescription[]
}

interface MedicalRecordDetailModalProps {
  record: MedicalRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MedicalRecordDetailModal({
  record,
  open,
  onOpenChange,
}: MedicalRecordDetailModalProps) {
  if (!record) return null

  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 border-border/80 shadow-2xl overflow-hidden">
        <DialogHeader className="p-6 bg-muted/20 border-b border-border/40">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Detalle de Consulta</p>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {record.reason}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
            <Calendar size={11} />
            {date}
            {record.created_by_profile?.full_name && (
              <>
                <span>·</span>
                <span className="font-medium text-foreground/80">Dr. {record.created_by_profile.full_name}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Signos Vitales */}
          {(record.weight_kg || record.temperature_celsius || record.heart_rate_bpm || record.respiratory_rate_bpm) && (
            <div className="bg-muted/15 p-4 rounded-xl border border-border/40 space-y-3">
              <h4 className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={11} className="text-primary/70" /> Signos vitales
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-foreground">
                {record.weight_kg && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-normal text-muted-foreground/50">Peso</p>
                    <p className="text-foreground">{record.weight_kg} kg</p>
                  </div>
                )}
                {record.temperature_celsius && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-normal text-muted-foreground/50">Temperatura</p>
                    <p className="text-foreground">{record.temperature_celsius} °C</p>
                  </div>
                )}
                {record.heart_rate_bpm && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-normal text-muted-foreground/50">F. Cardíaca</p>
                    <p className="text-foreground">{record.heart_rate_bpm} bpm</p>
                  </div>
                )}
                {record.respiratory_rate_bpm && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-normal text-muted-foreground/50">F. Respiratoria</p>
                    <p className="text-foreground">{record.respiratory_rate_bpm} rpm</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnóstico & Tratamiento */}
          <div className="space-y-4">
            {record.diagnosis && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
                  <Stethoscope size={11} className="text-primary/60" /> Diagnóstico
                </span>
                <p className="text-sm text-foreground leading-relaxed pl-4 border-l border-border">{record.diagnosis}</p>
              </div>
            )}

            {record.treatment && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
                  <Heart size={11} className="text-primary/60" /> Tratamiento
                </span>
                <p className="text-sm text-foreground leading-relaxed pl-4 border-l border-border">{record.treatment}</p>
              </div>
            )}

            {record.notes && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={11} className="text-primary/60" /> Notas adicionales
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed italic pl-4 border-l border-border">"{record.notes}"</p>
              </div>
            )}
          </div>

          {/* Recetas */}
          {record.prescriptions && record.prescriptions.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-border/40">
              <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
                Medicamentos Indicados
              </span>
              <div className="space-y-2">
                {record.prescriptions.map((p) => (
                  <div key={p.id} className="bg-muted/10 p-3 rounded-lg border border-border/40 text-xs flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">{p.medication_name} — {p.dosage}</span>
                    <span className="text-muted-foreground text-[11px]">{p.frequency} por {p.duration}</span>
                    {p.notes && <span className="text-muted-foreground/70 italic text-[10px] mt-0.5">"{p.notes}"</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/20 border-t border-border/40 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cerrar detalle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
