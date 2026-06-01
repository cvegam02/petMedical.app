import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Printer } from 'lucide-react'
import { RecordDetailClient } from '@/components/medical-records/RecordDetailClient'
import { ShareConsultationModal } from '@/components/medical-records/ShareConsultationModal'

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ petId: string; recordId: string }>
}) {
  const { petId, recordId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: visitData, error } = await (supabase.from('service_visits') as any)
    .select(`
      id, created_at,
      pet:pet_id(id, name),
      consultation:consultation_records!visit_id(
        reason, diagnosis, treatment, notes,
        weight_kg, temperature_celsius,
        attended_by_profile:attended_by(full_name)
      ),
      prescriptions(id, medication_name, dosage, frequency, duration, notes),
      attachments(id, file_name, file_type, storage_path, created_at),
      addendums(id, content, created_at, created_by_profile:created_by(full_name))
    `)
    .eq('id', recordId)
    .single()

  if (error || !visitData) notFound()

  const consultationData = (visitData.consultation as any) ?? {}
  const record = {
    ...visitData,
    reason: consultationData.reason ?? '',
    diagnosis: consultationData.diagnosis ?? null,
    treatment: consultationData.treatment ?? null,
    notes: consultationData.notes ?? null,
    weight_kg: consultationData.weight_kg ?? null,
    temperature_celsius: consultationData.temperature_celsius ?? null,
    created_by_profile: consultationData.attended_by_profile ?? null,
  }

  const { data: regData } = await (supabase as any)
    .from('pet_registrations')
    .select('owner:owner_id(phone)')
    .eq('pet_id', petId)
    .maybeSingle()
  const ownerPhone = (regData?.owner as any)?.phone ?? null

  const hasPrescriptions = ((record.prescriptions as any[]) ?? []).length > 0
  const pet = record.pet as any
  const createdBy = record.created_by_profile as any
  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div>
      <Link
        href={`/dashboard/pets/${petId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        ← {pet?.name}
      </Link>

      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Consulta</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{record.reason}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {date}{createdBy?.full_name ? ` · Dr. ${createdBy.full_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasPrescriptions && (
              <a
                href={`/api/medical-records/${recordId}/prescription/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Printer size={14} />
                Imprimir receta
              </a>
            )}
            <ShareConsultationModal
              recordId={recordId}
              ownerPhone={ownerPhone}
              petName={pet?.name ?? ''}
            />
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
              Registro inmutable
            </span>
          </div>
        </div>

        {record.diagnosis && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Diagnóstico</p>
            <p className="text-sm text-foreground">{record.diagnosis}</p>
          </div>
        )}

        {record.treatment && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Tratamiento</p>
            <p className="text-sm text-foreground">{record.treatment}</p>
          </div>
        )}

        {(record.weight_kg || record.temperature_celsius) && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-2">Signos vitales</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {record.weight_kg && <span className="text-muted-foreground">Peso: <strong className="text-foreground">{record.weight_kg} kg</strong></span>}
              {record.temperature_celsius && <span className="text-muted-foreground">Temperatura: <strong className="text-foreground">{record.temperature_celsius} °C</strong></span>}
            </div>
          </div>
        )}

        {record.notes && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Notas</p>
            <p className="text-sm text-muted-foreground italic">{record.notes}</p>
          </div>
        )}

        {(record.prescriptions as any[]).length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-2">Recetas</p>
            <div className="space-y-2">
              {(record.prescriptions as any[]).map((p: any) => (
                <div key={p.id} className="bg-secondary rounded-lg p-3 text-sm border border-border">
                  <p className="font-medium text-foreground">{p.medication_name} — {p.dosage}</p>
                  <p className="text-muted-foreground">{p.frequency} por {p.duration}</p>
                  {p.notes && <p className="text-muted-foreground italic mt-0.5">{p.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <RecordDetailClient
        recordId={recordId}
        petId={petId}
        userId={user?.id ?? ''}
        initialAttachments={record.attachments as any[]}
        initialAddendums={record.addendums as any[]}
      />
    </div>
  )
}
