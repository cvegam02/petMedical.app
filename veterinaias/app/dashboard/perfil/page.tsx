import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { roleRequiresLicense } from '@/lib/auth/roles'
import { AlertCircle } from 'lucide-react'

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ complete?: string }>
}) {
  const { complete } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, phone, professional_license, professional_address, role, is_super_admin')
    .eq('id', user.id)
    .single() as any

  const licenseRequired = !profile?.is_super_admin && roleRequiresLicense(profile?.role)
  const mustCompleteLicense = complete === 'cedula' && licenseRequired && !profile?.professional_license?.trim()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Cuenta</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Perfil</h1>
      </div>

      {mustCompleteLicense && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Completa tu cédula profesional</p>
            <p className="text-muted-foreground mt-0.5">
              Para usar el sistema necesitas registrar tu cédula. Es la que aparecerá en las recetas que emitas.
            </p>
          </div>
        </div>
      )}

      <ProfileForm
        fullName={profile?.full_name ?? ''}
        phone={profile?.phone ?? null}
        professionalLicense={profile?.professional_license ?? null}
        professionalAddress={profile?.professional_address ?? null}
        licenseRequired={licenseRequired}
      />
    </div>
  )
}
