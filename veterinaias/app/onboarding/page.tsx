import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { TenantSetupForm } from '@/components/onboarding/TenantSetupForm'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If coming with an invitation token, auto-accept
  if (params.invite) {
    const admin = createAdminClient()
    const { data: invitation } = await admin
      .from('invitations')
      .select('*')
      .eq('token', params.invite)
      .eq('email', user.email!)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invitation) {
      await admin
        .from('user_profiles')
        .update({ tenant_id: invitation.tenant_id, role: invitation.role })
        .eq('id', user.id)
      await admin
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)
      redirect('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-lg px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">VeterinaIAs</h1>
          <p className="text-slate-500 mt-2">Configura tu clinica para empezar</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
            <CardDescription>
              Cuentanos sobre tu negocio para personalizar tu experiencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TenantSetupForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
