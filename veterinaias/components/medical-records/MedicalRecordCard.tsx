import Link from 'next/link'

interface MedicalRecordCardProps {
  record: {
    id: string
    reason: string
    diagnosis: string | null
    created_at: string
    weight_kg: number | null
    created_by_profile: { full_name: string } | null
    prescriptions: Array<{ id: string; medication_name: string }>
    attachments: Array<{ id: string }>
    addendums: Array<{ id: string }>
  }
  petId: string
}

export function MedicalRecordCard({ record, petId }: MedicalRecordCardProps) {
  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Link
      href={`/dashboard/pets/${petId}/records/${record.id}`}
      className="block p-4 bg-card rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-foreground">{record.reason}</p>
          {record.diagnosis && <p className="text-sm text-muted-foreground mt-1">{record.diagnosis}</p>}
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground/70">
            <span>{date}</span>
            {record.weight_kg && <span>· {record.weight_kg} kg</span>}
            {record.created_by_profile && <span>· Dr. {record.created_by_profile.full_name}</span>}
            {record.prescriptions.length > 0 && <span>· {record.prescriptions.length} receta(s)</span>}
            {record.attachments.length > 0 && <span>· {record.attachments.length} adjunto(s)</span>}
            {record.addendums.length > 0 && <span>· {record.addendums.length} adenda(s)</span>}
          </div>
        </div>
        <span className="text-muted-foreground text-sm ml-4">Ver →</span>
      </div>
    </Link>
  )
}
