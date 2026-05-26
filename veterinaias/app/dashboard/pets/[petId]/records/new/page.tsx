import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordForm } from '@/components/medical-records/MedicalRecordForm'

export default async function NewRecordPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await (supabase.from('pets') as any)
    .select('id, name, owner_id')
    .eq('id', petId)
    .single()

  if (error || !pet) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/dashboard/pets/${petId}`}
        className="text-sm text-slate-500 hover:text-slate-700 mb-2 block"
      >
        &larr; {pet.name}
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nuevo Expediente Clínico</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800">
        Este expediente será <strong>inmutable</strong> una vez guardado. Verifica la información antes de continuar.
      </div>
      <MedicalRecordForm petId={petId} />
    </div>
  )
}
