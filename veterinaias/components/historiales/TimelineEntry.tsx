'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Paperclip } from 'lucide-react'

interface Prescription {
  id: string
  medication_name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  notes: string | null
}

interface Addendum {
  id: string
  content: string
  created_at: string
  created_by_profile: { full_name: string } | null
}

interface Attachment {
  id: string
  file_name: string
  storage_path: string
}

interface MedicalRecord {
  id: string
  reason: string
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  created_at: string
  weight_kg: number | null
  temperature_celsius: number | null
  heart_rate_bpm: number | null
  respiratory_rate_bpm: number | null
  created_by_profile: { full_name: string } | null
  prescriptions: Prescription[]
  addendums: Addendum[]
  attachments: Attachment[]
}

export function TimelineEntry({ record }: { record: MedicalRecord }) {
  const [addendumOpen, setAddendumOpen] = useState(false)

  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const time = new Date(record.created_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })

  const vitals = [
    record.weight_kg != null && `Peso: ${record.weight_kg} kg`,
    record.temperature_celsius != null && `Temp: ${record.temperature_celsius}°C`,
    record.heart_rate_bpm != null && `FC: ${record.heart_rate_bpm} bpm`,
    record.respiratory_rate_bpm != null && `FR: ${record.respiratory_rate_bpm} rpm`,
  ].filter(Boolean) as string[]

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-sm text-foreground">{record.reason}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {date} · {time}
            {record.created_by_profile?.full_name && ` · Dr. ${record.created_by_profile.full_name}`}
          </p>
        </div>
      </div>

      {/* Fields */}
      {record.diagnosis && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Diagnóstico</p>
          <p className="text-sm text-foreground">{record.diagnosis}</p>
        </div>
      )}
      {record.treatment && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Tratamiento</p>
          <p className="text-sm text-foreground">{record.treatment}</p>
        </div>
      )}
      {record.notes && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Notas</p>
          <p className="text-sm text-foreground">{record.notes}</p>
        </div>
      )}

      {/* Vitals */}
      {vitals.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Signos vitales</p>
          <div className="flex flex-wrap gap-2">
            {vitals.map(v => (
              <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prescriptions */}
      {record.prescriptions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Medicamentos</p>
          <div className="space-y-1.5">
            {record.prescriptions.map(p => (
              <div key={p.id} className="text-xs text-foreground bg-muted/50 rounded-lg px-3 py-2">
                <span className="font-medium">{p.medication_name}</span>
                {[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}
                {p.notes && <span className="text-muted-foreground"> — {p.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {record.attachments.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Adjuntos</p>
          <div className="flex flex-wrap gap-2">
            {record.attachments.map(a => (
              <a
                key={a.id}
                href={`/api/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Paperclip size={11} />
                {a.file_name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Addendums */}
      {record.addendums.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setAddendumOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {addendumOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {record.addendums.length} corrección{record.addendums.length !== 1 ? 'es' : ''} posterior{record.addendums.length !== 1 ? 'es' : ''}
          </button>
          {addendumOpen && (
            <div className="mt-2 space-y-2">
              {record.addendums.map(a => (
                <div key={a.id} className="text-xs bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                  <p className="font-medium text-yellow-800 mb-0.5">
                    Corrección posterior ·{' '}
                    {new Date(a.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {a.created_by_profile?.full_name && ` · ${a.created_by_profile.full_name}`}
                  </p>
                  <p className="text-yellow-900">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
