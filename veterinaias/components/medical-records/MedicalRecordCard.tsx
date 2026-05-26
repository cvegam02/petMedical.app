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
      className="group block bg-card rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm leading-snug">{record.reason}</p>
            {record.diagnosis && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{record.diagnosis}</p>
            )}
          </div>
          <ChevronRight
            size={15}
            className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0 mt-0.5"
          />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3">
          <p className="text-xs text-muted-foreground/70">{date}</p>
          {record.created_by_profile && (
            <p className="text-xs text-muted-foreground/70">Dr. {record.created_by_profile.full_name}</p>
          )}
          {record.weight_kg && (
            <p className="text-xs text-muted-foreground/70">{record.weight_kg} kg</p>
          )}
        </div>

        {/* Badges row */}
        {hasBadges && (
          <div className="flex items-center gap-2 mt-3">
            {record.prescriptions.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                <Pill size={10} />
                {record.prescriptions.length} receta{record.prescriptions.length > 1 ? 's' : ''}
              </span>
            )}
            {record.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                <Paperclip size={10} />
                {record.attachments.length} adjunto{record.attachments.length > 1 ? 's' : ''}
              </span>
            )}
            {record.addendums.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
                <FileText size={10} />
                {record.addendums.length} adenda{record.addendums.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
