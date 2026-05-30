import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/profile/ProfileForm'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, phone, professional_license, professional_address')
    .eq('id', user.id)
    .single() as any

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Cuenta</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Perfil</h1>
      </div>
      <ProfileForm
        fullName={profile?.full_name ?? ''}
        phone={profile?.phone ?? null}
        professionalLicense={profile?.professional_license ?? null}
        professionalAddress={profile?.professional_address ?? null}
      />
    </div>
  )
}
