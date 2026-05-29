import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordForm } from '@/components/medical-records/MedicalRecordForm'
import type { IncompletePatient } from '@/components/medical-records/MedicalRecordForm'
import { PetBanner } from '@/components/medical-records/PetBanner'

export default async function MedicalRecordNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ petId: string }>
  searchParams: Promise<{ appointmentId?: string }>
}) {
  const { petId } = await params
  const { appointmentId } = await searchParams
  const supabase = await createClient()

  const { data: pet, error } = await (supabase.from('pets') as any)
    .select('id, name, sex, date_of_birth, notes, breed, species:species_id(name)')
    .eq('id', petId)
    .single()

  if (error || !pet) {
    console.error('Pet not found or error:', error)
    notFound()
  }

  const { data: registration } = await (supabase.from('pet_registrations') as any)
    .select('owner:owner_id(full_name)')
    .eq('pet_id', petId)
    .maybeSingle()

  // Detect incomplete profile (stub owner created during first-visit scheduling)
  let incompletePatient: IncompletePatient | null = null

  if (appointmentId) {
    const { data: appointment } = await (supabase.from('appointments') as any)
      .select('owner_id')
      .eq('id', appointmentId)
      .maybeSingle()

    if (appointment?.owner_id) {
      const [ownerResult, petProfileResult] = await Promise.all([
        (supabase.from('owners') as any)
          .select('id, full_name, email, phone')
          .eq('id', appointment.owner_id)
          .single(),
        (supabase.from('pets') as any)
          .select('id, species_id, sex, date_of_birth')
          .eq('id', petId)
          .single(),
      ])

      const owner = ownerResult.data
      if (owner && !owner.phone && !owner.email) {
        incompletePatient = {
          owner: {
            id: owner.id,
            full_name: owner.full_name,
            phone: owner.phone,
            email: owner.email,
          },
          pet: petProfileResult.data
            ? {
                id: petProfileResult.data.id,
                species_id: petProfileResult.data.species_id,
                sex: petProfileResult.data.sex,
                date_of_birth: petProfileResult.data.date_of_birth,
              }
            : null,
        }
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/dashboard/pets/${petId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        ← {pet.name}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">Nueva consulta</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Este registro será <strong>inmutable</strong> una vez guardado. Verifica la información antes de continuar.
      </p>
      <div className="sticky top-0 z-10">
        <PetBanner
          name={pet.name}
          species={(pet.species as any)?.name}
          breed={pet.breed}
          sex={pet.sex}
          dateOfBirth={pet.date_of_birth}
          notes={pet.notes}
          ownerName={(registration?.owner as any)?.full_name}
        />
      </div>
      <div className="mt-4">
        <MedicalRecordForm
          petId={petId}
          appointmentId={appointmentId}
          incompletePatient={incompletePatient}
        />
      </div>
    </div>
  )
}
