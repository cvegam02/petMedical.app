import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { RecordDetailClient } from '@/components/medical-records/RecordDetailClient'

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ petId: string; recordId: string }>
}) {
  const { petId, recordId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: record, error } = await supabase
    .from('medical_records')
    .select(`
      id, reason, diagnosis, treatment, notes,
      weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
      created_at,
      pet:pet_id(id, name, owner:owner_id(id, full_name)),
      created_by_profile:created_by(full_name),
      prescriptions(id, medication_name, dosage, frequency, duration, notes),
      attachments(id, file_name, file_type, storage_path, created_at),
      addendums(id, content, created_at, created_by_profile:created_by(full_name))
    `)
    .eq('id', recordId)
    .single()

  if (error || !record) notFound()

  const pet = record.pet as any
  const createdBy = record.created_by_profile as any
  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/dashboard/pets/${petId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 block">
        ← {pet?.name}
      </Link>

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{record.reason}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {date} · {createdBy?.full_name ?? 'Veterinario'}
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">Inmutable</span>
        </div>

        {record.diagnosis && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Diagnóstico</p>
            <p className="text-slate-700">{record.diagnosis}</p>
          </div>
        )}

        {record.treatment && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Tratamiento</p>
            <p className="text-slate-700">{record.treatment}</p>
          </div>
        )}

        {(record.weight_kg || record.temperature_celsius || record.heart_rate_bpm || record.respiratory_rate_bpm) && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Signos Vitales</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {record.weight_kg && <span className="text-slate-600">Peso: <strong>{record.weight_kg} kg</strong></span>}
              {record.temperature_celsius && <span className="text-slate-600">Temperatura: <strong>{record.temperature_celsius} °C</strong></span>}
              {record.heart_rate_bpm && <span className="text-slate-600">F. Cardíaca: <strong>{record.heart_rate_bpm} lpm</strong></span>}
              {record.respiratory_rate_bpm && <span className="text-slate-600">F. Respiratoria: <strong>{record.respiratory_rate_bpm} rpm</strong></span>}
            </div>
          </div>
        )}

        {record.notes && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notas</p>
            <p className="text-slate-600 text-sm italic">{record.notes}</p>
          </div>
        )}

        {(record.prescriptions as any[]).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Recetas</p>
            <div className="space-y-2">
              {(record.prescriptions as any[]).map((p: any) => (
                <div key={p.id} className="bg-slate-50 rounded p-3 text-sm">
                  <p className="font-medium">{p.medication_name} — {p.dosage}</p>
                  <p className="text-slate-500">{p.frequency} por {p.duration}</p>
                  {p.notes && <p className="text-slate-500 italic">{p.notes}</p>}
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
