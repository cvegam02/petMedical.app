import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OwnerForm } from '@/components/owners/OwnerForm'

export default async function EditOwnerPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner, error } = await supabase
    .from('owners')
    .select('id, full_name, email, phone, address')
    .eq('id', ownerId)
    .single()

  if (error || !owner) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Editar dueño</h1>
      <OwnerForm
        ownerId={owner.id}
        defaultValues={{
          full_name: owner.full_name,
          phone: owner.phone,
          email: owner.email ?? '',
          address: owner.address ?? '',
        }}
      />
    </div>
  )
}
