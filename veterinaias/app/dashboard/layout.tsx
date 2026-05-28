import Image from 'next/image'
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
        <div className="px-5 py-5 border-b border-zinc-100">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="petMedical.app" width={36} height={36} className="rounded-lg shrink-0" />
            <div className="min-w-0">
              <p className="text-base text-zinc-950 tracking-tight leading-none">pet<span className="font-bold">Medical</span>.app</p>
              <p className="label-overline font-mono text-zinc-400 mt-1.5 truncate">{tenantName}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <SidebarNav role={profile?.role ?? ''} />
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-zinc-100">
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
