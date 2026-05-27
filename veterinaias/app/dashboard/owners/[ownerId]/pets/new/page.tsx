import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { PetForm } from '@/components/pets/PetForm'

export default async function NewPetPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner } = await (supabase.from('owners') as any)
    .select('id, full_name')
    .eq('id', ownerId)
    .single()

  if (!owner) notFound()

  return (
    <FormPageLayout
      backHref={`/dashboard/owners/${ownerId}`}
      backLabel={owner.full_name}
      overline="Pacientes"
      title="Nueva mascota"
      contextPanel={
        <FormContextPanel>
          <ContextCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Responsable</p>
            <p className="text-sm font-semibold text-foreground mt-1">{owner.full_name}</p>
          </ContextCard>
          <ContextCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Campos requeridos</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                <span className="text-destructive">*</span> Nombre
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                <span className="text-destructive">*</span> Especie
              </span>
            </div>
          </ContextCard>
        </FormContextPanel>
      }
    >
      <PetForm ownerId={ownerId} />
    </FormPageLayout>
  )
}
