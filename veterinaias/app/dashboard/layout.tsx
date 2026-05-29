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
    tenants: { name: string; settings: { logo_url?: string | null } | null } | null
  }

  const { data: profile } = (await supabase
    .from('user_profiles')
    .select('full_name, role, tenant_id, tenants(name, settings)')
    .eq('id', user!.id)
    .single()) as { data: DashboardProfile | null; error: unknown }

  const tenantName = profile?.tenants?.name ?? ''
  const tenantLogoUrl = (profile?.tenants?.settings as any)?.logo_url ?? null
  const initials = profile?.full_name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    /* Accent rail — thin primary stripe at the very top of the entire chrome */
    <div className="min-h-dvh flex flex-col border-t-[3px] border-primary bg-background">
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-56 h-[calc(100dvh-3px)] sticky top-0 flex flex-col bg-secondary border-r border-border shrink-0">

          {/* Brand */}
          <div className="px-4 h-14 flex items-center shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Image src="/icon.png" alt="petMedical.app" width={55} height={55} className="rounded-md shrink-0" />
              <p className="text-base font-medium text-foreground tracking-tight leading-none">
                pet<span className="font-bold">Medical</span>.app
              </p>
            </Link>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-border" />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <SidebarNav role={profile?.role ?? ''} />
          </nav>
        </aside>

        {/* Content column */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Topbar */}
          <header className="h-14 shrink-0 sticky top-0 z-20 bg-white border-b border-border shadow-sm flex items-center px-6 relative">

            {/* Center — clinic identity */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              {tenantLogoUrl ? (
                <div className="w-[55px] h-[55px] rounded-md border border-border bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  <Image src={tenantLogoUrl} alt={tenantName} width={55} height={55} className="object-contain" unoptimized />
                </div>
              ) : null}
              <p className="text-sm font-semibold text-foreground tracking-tight">{tenantName}</p>
            </div>

            {/* Right — user info + logout */}
            <div className="flex-1 flex items-center justify-end gap-2.5">
              <div className="text-right leading-none">
                <p className="text-xs font-semibold text-foreground">{profile?.full_name}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  {profile?.role === 'admin' && <ShieldCheck size={9} className="text-primary/70" />}
                  <p className="text-[10px] text-muted-foreground capitalize">{profile?.role}</p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-primary/80">{initials}</span>
              </div>

              <div className="w-px h-5 bg-border mx-0.5" />

              <form action={signOutAction}>
                <button
                  type="submit"
                  title="Cerrar sesión"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </form>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto">
            <div className="max-w-5xl mx-auto px-10 py-10">
              {children}
            </div>
          </main>
        </div>
      </div>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}
