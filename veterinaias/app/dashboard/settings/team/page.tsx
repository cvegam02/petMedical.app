import { createClient } from '@/lib/supabase/server'
import { InviteUserForm } from '@/components/team/InviteUserForm'
import { Badge } from '@/components/ui/badge'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  doctor: 'Doctor',
  assistant: 'Asistente',
}

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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Equipo</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Gestiona los miembros y accesos de tu clínica.</p>
      </div>

      {/* Miembros activos */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Miembros activos</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          {members && members.length > 0 ? (
            <div className="divide-y divide-border/60">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{m.full_name}</span>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              Sin miembros registrados.
            </div>
          )}
        </div>
      </div>

      {/* Invitaciones pendientes */}
      {pendingInvites && pendingInvites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Invitaciones pendientes</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border/60">
              {pendingInvites.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{inv.email}</span>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {ROLE_LABELS[inv.role] ?? inv.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invitar nuevo usuario */}
      {canInvite && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">Invitar usuario</h3>
            <p className="text-xs text-muted-foreground mt-0.5">El usuario recibirá un email con un enlace de acceso.</p>
          </div>
          <InviteUserForm tenantType={tenantType} />
        </div>
      )}
    </div>
  )
}
