import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { PetForm } from '@/components/pets/PetForm'

export default async function EditPetPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const [petResult, regResult] = await Promise.all([
    (supabase.from('pets') as any)
      .select('id, name, species_id, breed, sex, date_of_birth, color, microchip, notes, sterilized, habitat, feeding, cohabitation, cohabitation_details')
      .eq('id', petId)
      .single(),
    (supabase.from('pet_registrations') as any)
      .select('owner_id, owner:owner_id(id, full_name)')
      .eq('pet_id', petId)
      .maybeSingle(),
  ])

  if (petResult.error || !petResult.data) notFound()

  const pet = petResult.data
  const registration = regResult.data
  const owner = registration?.owner as any

  return (
    <FormPageLayout
      backHref={`/dashboard/pets/${petId}`}
      backLabel={pet.name}
      overline="Pacientes"
      title="Editar mascota"
      contextPanel={
        <FormContextPanel>
          <ContextCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Responsable</p>
            <p className="text-sm font-semibold text-foreground mt-1">{owner?.full_name ?? '—'}</p>
          </ContextCard>
        </FormContextPanel>
      }
    >
      <PetForm
        ownerId={registration?.owner_id ?? ''}
        petId={pet.id}
        defaultValues={{
          name: pet.name,
          species_id: pet.species_id,
          breed: pet.breed ?? undefined,
          sex: pet.sex as 'male' | 'female' | 'unknown',
          date_of_birth: pet.date_of_birth ?? undefined,
          color: pet.color ?? undefined,
          microchip: pet.microchip ?? undefined,
          notes: pet.notes ?? undefined,
          sterilized: pet.sterilized ?? undefined,
          habitat: pet.habitat ?? undefined,
          feeding: pet.feeding ?? undefined,
          cohabitation: pet.cohabitation ?? undefined,
          cohabitation_details: pet.cohabitation_details ?? undefined,
        }}
      />
    </FormPageLayout>
  )
}
