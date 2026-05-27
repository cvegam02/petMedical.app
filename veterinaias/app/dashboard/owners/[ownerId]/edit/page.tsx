import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FormPageLayout } from '@/components/ui/form-page-layout'
import { FormContextPanel, ContextCard } from '@/components/ui/form-context-panel'
import { OwnerForm } from '@/components/owners/OwnerForm'

export default async function EditOwnerPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner, error } = await (supabase.from('owners') as any)
    .select('id, full_name, email, phone, address')
    .eq('id', ownerId)
    .single()

  if (error || !owner) notFound()

  return (
    <FormPageLayout
      backHref={`/dashboard/owners/${ownerId}`}
      backLabel={owner.full_name}
      overline="Directorio"
      title="Editar dueño"
      contextPanel={
        <FormContextPanel>
          <ContextCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Campos requeridos</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                <span className="text-destructive">*</span> Nombre
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                <span className="text-destructive">*</span> Teléfono
              </span>
            </div>
          </ContextCard>
        </FormContextPanel>
      }
    >
      <OwnerForm
        ownerId={owner.id}
        defaultValues={{
          full_name: owner.full_name,
          phone: owner.phone,
          email: owner.email ?? '',
          address: owner.address ?? '',
        }}
      />
    </FormPageLayout>
  )
}
