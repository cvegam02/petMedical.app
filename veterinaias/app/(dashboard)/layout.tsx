import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, tenant_id, tenants(name)')
    .eq('id', user!.id)
    .single() as any

  const tenantName = profile?.tenants?.name ?? ''

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <p className="font-bold text-sm truncate">{tenantName}</p>
          <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Inicio</Link>
          <Link href="/dashboard/patients" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Pacientes</Link>
          <Link href="/dashboard/appointments" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Citas</Link>
          {profile?.role === 'admin' && (
            <Link href="/dashboard/settings/team" className="block px-3 py-2 rounded text-sm hover:bg-slate-700">Equipo</Link>
          )}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <p className="text-sm text-slate-300 truncate">{profile?.full_name}</p>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-slate-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
