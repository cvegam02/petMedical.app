import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LogOut, ShieldCheck } from 'lucide-react'
import { Toaster } from 'sonner'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { signOutAction } from '@/app/actions/auth'

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
    <div className="min-h-dvh flex bg-zinc-50/50">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-zinc-200/60 bg-white shrink-0">

        {/* Brand */}
        <div className="px-6 py-8">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="text-white">
                <path d="M7 1C5.5 1 4.5 2 4.5 3.5C4.5 5 5.5 6 7 6C8.5 6 9.5 5 9.5 3.5C9.5 2 8.5 1 7 1Z" fill="currentColor"/>
                <path d="M2.5 4C1.7 4 1 4.7 1 5.5C1 6.3 1.7 7 2.5 7C3.3 7 4 6.3 4 5.5C4 4.7 3.3 4 2.5 4Z" fill="currentColor" opacity="0.7"/>
                <path d="M11.5 4C10.7 4 10 4.7 10 5.5C10 6.3 10.7 7 11.5 7C12.3 7 13 6.3 13 5.5C13 4.7 12.3 4 11.5 4Z" fill="currentColor" opacity="0.7"/>
                <path d="M3 8C2 8.5 1.5 9.5 2 11C2.5 12.5 4.5 13 7 13C9.5 13 11.5 12.5 12 11C12.5 9.5 12 8.5 11 8C10 7.5 9 8.5 7 8.5C5 8.5 4 7.5 3 8Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-zinc-950 tracking-tight leading-none">VeterinaIAs</p>
              <p className="label-overline font-mono text-zinc-400 mt-1.5 truncate">{tenantName}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          <SidebarNav role={profile?.role ?? ''} />
        </nav>

        {/* User Footer */}
        <div className="p-4">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-50 transition-colors group">
            <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-zinc-500">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-900 truncate leading-none">{profile?.full_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {profile?.role === 'admin' && <ShieldCheck size={9} className="text-primary/70" />}
                <p className="label-overline text-zinc-400">{profile?.role}</p>
              </div>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="p-1.5 text-zinc-300 hover:text-zinc-500 transition-colors opacity-0 group-hover:opacity-100">
                <LogOut size={13} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-white/40">
        <div className="max-w-5xl mx-auto px-10 py-10">
          {children}
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}
