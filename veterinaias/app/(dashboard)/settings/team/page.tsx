import { createClient } from '@/lib/supabase/server'
import { InviteUserForm } from '@/components/team/InviteUserForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, tenants(name, type)')
    .eq('id', user!.id)
    .single() as any

  const { data: members } = await supabase
    .from('user_profiles')
    .select('id, full_name, role')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('created_at')

  const { data: pendingInvites } = await supabase
    .from('invitations')
    .select('id, email, role')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .is('accepted_at', null)

  const canInvite = profile?.role === 'admin'
  const tenantType = profile?.tenants?.type ?? 'individual'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Equipo</h1>

      <Card>
        <CardHeader><CardTitle>Miembros activos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members?.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="font-medium">{m.full_name}</span>
                <Badge variant="secondary">{m.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {pendingInvites && pendingInvites.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Invitaciones pendientes</CardTitle></CardHeader>
          <CardContent>
            {pendingInvites.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-2">
                <span className="text-slate-600">{inv.email}</span>
                <Badge>{inv.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canInvite && (
        <Card>
          <CardHeader><CardTitle>Invitar nuevo usuario</CardTitle></CardHeader>
          <CardContent>
            <InviteUserForm tenantType={tenantType} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
