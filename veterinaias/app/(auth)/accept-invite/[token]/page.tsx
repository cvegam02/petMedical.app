import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: invitation } = await admin
    .from('invitations')
    .select('id, tenant_id, email, role, tenants(name)')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-500">Invitacion invalida o expirada.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await admin.from('user_profiles')
      .update({ tenant_id: invitation.tenant_id, role: invitation.role })
      .eq('id', user.id)
    await admin.from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)
    redirect('/dashboard')
  }

  const tenantName = (invitation as any).tenants?.name ?? 'la clinica'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitacion a {tenantName}</CardTitle>
          <CardDescription>
            Fuiste invitado como <strong>{invitation.role}</strong>. Crea tu cuenta para aceptar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Registrate con el email <strong>{invitation.email}</strong> para unirte.
          </p>
          <a href={`/register?invite=${token}`} className="block w-full text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
            Crear cuenta
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
