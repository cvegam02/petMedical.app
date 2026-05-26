import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordCard } from '@/components/medical-records/MedicalRecordCard'
import { Button } from '@/components/ui/button'

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

export default async function PetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await supabase
    .from('pets')
    .select(`
      id, name, sex, date_of_birth, color, microchip, notes, created_at,
      owner:owner_id(id, full_name),
      species:species_id(name),
      breed:breed_id(name),
      medical_records(
        id, reason, diagnosis, weight_kg, created_at,
        created_by_profile:created_by(full_name),
        prescriptions(id),
        attachments(id),
        addendums(id)
      )
    `)
    .eq('id', petId)
    .order('created_at', { referencedTable: 'medical_records', ascending: false })
    .single()

  if (error || !pet) notFound()

  const owner = pet.owner as any
  const species = pet.species as any
  const breed = pet.breed as any
  const records = (pet.medical_records as any[]) ?? []

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/dashboard/owners/${owner?.id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 block">
        ← {owner?.full_name}
      </Link>

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pet.name}</h1>
            <p className="text-slate-500 mt-1">
              {species?.name}{breed ? ` · ${breed.name}` : ''} · {SEX_LABELS[pet.sex] ?? pet.sex}
              {pet.color ? ` · ${pet.color}` : ''}
            </p>
            {pet.date_of_birth && (
              <p className="text-slate-500 text-sm mt-1">
                Nacimiento: {new Date(pet.date_of_birth).toLocaleDateString('es-MX')}
              </p>
            )}
            {pet.microchip && <p className="text-slate-500 text-sm">Microchip: {pet.microchip}</p>}
            {pet.notes && <p className="text-slate-600 text-sm mt-2 italic">{pet.notes}</p>}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/pets/${petId}/edit`}>Editar</Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Historial Clínico ({records.length})</h2>
        <Button asChild>
          <Link href={`/dashboard/pets/${petId}/records/new`}>+ Nuevo expediente</Link>
        </Button>
      </div>

      {records.length === 0 ? (
        <p className="text-slate-500 text-sm">No hay expedientes registrados para esta mascota.</p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <MedicalRecordCard key={record.id} record={record} petId={petId} />
          ))}
        </div>
      )}
    </div>
  )
}
