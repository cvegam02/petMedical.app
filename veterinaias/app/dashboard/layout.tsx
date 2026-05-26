import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  interface DashboardProfile {
    full_name: string
    role: string
    tenant_id: string | null
    tenants: { name: string } | null
  }

  const { data: profile } = (await supabase
    .from('user_profiles')
    .select('full_name, role, tenant_id, tenants(name)')
    .eq('id', user!.id)
    .single()) as { data: DashboardProfile | null; error: unknown }

  const tenantName = profile?.tenants?.name ?? ''

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-background border-r border-border flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-border">
          <p className="font-semibold text-sm text-foreground truncate leading-tight">{tenantName}</p>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{profile?.role}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <Link href="/dashboard" className="flex items-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">Inicio</Link>
          <Link href="/dashboard/owners" className="flex items-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">Dueños y Mascotas</Link>
          <Link href="/dashboard/appointments" className="flex items-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">Citas</Link>
          {profile?.role === 'admin' && (
            <Link href="/dashboard/settings/team" className="flex items-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">Equipo</Link>
          )}
        </nav>
        <div className="px-4 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground truncate">{profile?.full_name}</p>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-background overflow-auto">
        {children}
      </main>
    </div>
  )
}
