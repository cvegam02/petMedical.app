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
      <h1 className="text-2xl font-bold mb-2">Bienvenido, {profile?.full_name}</h1>
      <p className="text-slate-500 mb-8">{tenant?.name}</p>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pacientes', href: '/dashboard/patients', desc: 'Gestionar dueños y mascotas' },
          { label: 'Citas', href: '/dashboard/appointments', desc: 'Ver y agendar citas' },
          { label: 'Expedientes', href: '/dashboard/records', desc: 'Historial clinico' },
        ].map(({ label, href, desc }) => (
          <a key={href} href={href} className="block p-6 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
            <h2 className="font-semibold mb-1">{label}</h2>
            <p className="text-sm text-slate-500">{desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
