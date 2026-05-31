import { createClient } from '@/lib/supabase/server'
import { WalkInConsultationPage } from '@/components/medical-records/WalkInConsultationPage'

export default async function NewWalkInConsultationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: currentProfile } = await (supabase.from('user_profiles') as any)
    .select('tenant_id')
    .eq('id', user?.id ?? '')
    .single()

  const { data: vets } = await (supabase.from('user_profiles') as any)
    .select('id, full_name')
    .eq('tenant_id', currentProfile?.tenant_id ?? '')
    .neq('role', 'assistant')
    .order('full_name')

  return <WalkInConsultationPage vets={vets ?? []} currentVetId={user?.id ?? ''} />
}
