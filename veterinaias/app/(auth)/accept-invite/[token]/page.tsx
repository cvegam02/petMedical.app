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
    const inv = invitation as any
    await (admin.from('user_profiles') as any)
      .update({ tenant_id: inv.tenant_id, role: inv.role })
      .eq('id', user.id)
    await (admin.from('invitations') as any)
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', inv.id)
    redirect('/dashboard')
  }

  const inv = invitation as any
  const tenantName = inv.tenants?.name ?? 'la clinica'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitacion a {tenantName}</CardTitle>
          <CardDescription>
            Fuiste invitado como <strong>{inv.role}</strong>. Crea tu cuenta para aceptar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Registrate con el email <strong>{inv.email}</strong> para unirte.
          </p>
          <a href={`/register?invite=${token}`} className="block w-full text-center bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
            Crear cuenta
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
