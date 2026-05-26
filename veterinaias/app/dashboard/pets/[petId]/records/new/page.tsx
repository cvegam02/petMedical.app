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
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        ← {pet.name}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">Nueva consulta</h1>
      <p className="text-sm text-muted-foreground mb-6">Este registro será <strong>inmutable</strong> una vez guardado. Verifica la información antes de continuar.</p>
      <MedicalRecordForm petId={petId} />
    </div>
  )
}
