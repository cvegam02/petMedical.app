import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PetForm } from '@/components/pets/PetForm'

export default async function EditPetPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await supabase
    .from('pets')
    .select('id, name, owner_id, species_id, breed_id, sex, date_of_birth, color, microchip, notes')
    .eq('id', petId)
    .single()

  if (error || !pet) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Editar mascota</h1>
      <PetForm
        ownerId={pet.owner_id}
        petId={pet.id}
        defaultValues={{
          name: pet.name,
          species_id: pet.species_id,
          breed_id: pet.breed_id ?? undefined,
          sex: pet.sex as 'male' | 'female' | 'unknown',
          date_of_birth: pet.date_of_birth ?? undefined,
          color: pet.color ?? undefined,
          microchip: pet.microchip ?? undefined,
          notes: pet.notes ?? undefined,
        }}
      />
    </div>
  )
}
