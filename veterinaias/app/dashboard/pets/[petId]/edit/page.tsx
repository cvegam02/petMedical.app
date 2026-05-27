import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { PetForm } from '@/components/pets/PetForm'

export default async function EditPetPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await (supabase.from('pets') as any)
    .select('id, name, owner_id, species_id, breed_id, sex, date_of_birth, color, microchip, notes, owner:owner_id(id, full_name)')
    .eq('id', petId)
    .single()

  if (error || !pet) notFound()

  const owner = pet.owner as any

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
    </FormPageLayout>
  )
}
