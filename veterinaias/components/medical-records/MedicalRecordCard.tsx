import Link from 'next/link'
import { Pill, Paperclip, FileText, ChevronRight } from 'lucide-react'

interface MedicalRecordCardProps {
  record: {
    id: string
    reason: string
    diagnosis: string | null
    created_at: string
    weight_kg: number | null
    created_by_profile: { full_name: string } | null
    prescriptions: Array<{ id: string }>
    attachments: Array<{ id: string }>
    addendums: Array<{ id: string }>
  }
  petId: string
}

export function MedicalRecordCard({ record, petId }: MedicalRecordCardProps) {
  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  const hasBadges = record.prescriptions.length > 0 || record.attachments.length > 0 || record.addendums.length > 0

  return (
    <Link
      href={`/dashboard/pets/${petId}/records/${record.id}`}
      className="group relative block bg-card rounded-xl border border-border hover:border-primary/40 active:scale-[0.99] transition-all duration-200 overflow-hidden"
    >
      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-base leading-tight tracking-tight">{record.reason}</p>
            {record.diagnosis && (
              <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed line-clamp-2 italic">
                {record.diagnosis}
              </p>
            )}
          </div>
          <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
            <ChevronRight
              size={14}
              className="text-muted-foreground group-hover:text-primary transition-colors"
            />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex flex-col">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Fecha</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 tabular-nums uppercase">{date}</p>
          </div>
          {record.created_by_profile && (
            <div className="flex flex-col">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Atendió</p>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Dr. {record.created_by_profile.full_name}</p>
            </div>
          )}
          {record.weight_kg && (
            <div className="flex flex-col ml-auto">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-right">Peso</p>
              <p className="text-[11px] font-mono text-primary mt-0.5 tabular-nums">{record.weight_kg} kg</p>
            </div>
          )}
        </div>

        {/* Badges row */}
        {hasBadges && (
          <div className="flex items-center gap-2 mt-5">
            {record.prescriptions.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                <Pill size={11} className="text-muted-foreground" />
                {record.prescriptions.length} RECETAS
              </span>
            )}
            {record.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                <Paperclip size={11} className="text-muted-foreground" />
                {record.attachments.length} ADJUNTOS
              </span>
            )}
            {record.addendums.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/10">
                <FileText size={11} />
                {record.addendums.length} ADENDAS
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
