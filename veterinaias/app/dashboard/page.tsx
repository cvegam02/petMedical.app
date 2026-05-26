import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, tenants(name, type, subscription_status)')
    .eq('id', user!.id)
    .single() as any

  const tenant = profile?.tenants

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Bienvenido, {profile?.full_name}</h1>
      <p className="text-muted-foreground mb-8">{tenant?.name}</p>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Dueños y Mascotas', href: '/dashboard/owners', desc: 'Gestionar dueños y mascotas' },
          { label: 'Citas', href: '/dashboard/appointments', desc: 'Ver y agendar citas (próximamente)' },
          { label: 'Equipo', href: '/dashboard/settings/team', desc: 'Gestionar miembros del equipo' },
        ].map(({ label, href, desc }) => (
          <a key={href} href={href} className="block p-6 bg-card rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all">
            <h2 className="font-medium text-foreground mb-1">{label}</h2>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
