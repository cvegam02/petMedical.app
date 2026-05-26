import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { SidebarNav } from '@/components/dashboard/SidebarNav'

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
  const initials = profile?.full_name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col border-r border-border bg-background shrink-0">

        {/* Brand */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary-foreground">
                <path d="M7 1C5.5 1 4.5 2 4.5 3.5C4.5 5 5.5 6 7 6C8.5 6 9.5 5 9.5 3.5C9.5 2 8.5 1 7 1Z" fill="currentColor"/>
                <path d="M2.5 4C1.7 4 1 4.7 1 5.5C1 6.3 1.7 7 2.5 7C3.3 7 4 6.3 4 5.5C4 4.7 3.3 4 2.5 4Z" fill="currentColor" opacity="0.7"/>
                <path d="M11.5 4C10.7 4 10 4.7 10 5.5C10 6.3 10.7 7 11.5 7C12.3 7 13 6.3 13 5.5C13 4.7 12.3 4 11.5 4Z" fill="currentColor" opacity="0.7"/>
                <path d="M3 8C2 8.5 1.5 9.5 2 11C2.5 12.5 4.5 13 7 13C9.5 13 11.5 12.5 12 11C12.5 9.5 12 8.5 11 8C10 7.5 9 8.5 7 8.5C5 8.5 4 7.5 3 8Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground tracking-tight leading-none truncate">VeterinaIAs</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{tenantName}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <SidebarNav role={profile?.role ?? ''} />
        </nav>

        {/* User Footer */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-accent transition-colors cursor-default">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate leading-none">{profile?.full_name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{profile?.role}</p>
            </div>
            <LogOut size={13} className="text-muted-foreground/40 shrink-0" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
