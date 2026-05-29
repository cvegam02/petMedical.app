'use client'

import { TimelineEntry } from './TimelineEntry'

interface MedicalTimelineProps {
  records: any[]
}

export function MedicalTimeline({ records }: MedicalTimelineProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 rounded-[2rem] border-2 border-dashed border-border/60 bg-zinc-50/50">
        <p className="font-bold text-foreground text-lg tracking-tight">Sin consultas registradas</p>
        <p className="text-sm text-muted-foreground mt-2">Este paciente no tiene consultas en el historial aún.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {records.length} consulta{records.length !== 1 ? 's' : ''} · orden cronológico descendente
      </p>
      <div className="relative space-y-3">
        <div className="absolute left-[1.1rem] top-0 bottom-0 w-px bg-border/60 -z-10" />
        <div className="space-y-3 pl-8">
          {records.map((record: any) => (
            <div key={record.id} className="relative">
              <div className="absolute -left-[1.65rem] top-5 w-2.5 h-2.5 rounded-full bg-primary/30 border-2 border-primary/60" />
              <TimelineEntry record={record} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
