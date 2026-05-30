import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserMenu } from '@/components/dashboard/UserMenu'
import { Toaster } from 'sonner'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { PawPrint } from 'lucide-react'

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
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <PawPrint size={20} className="text-primary" strokeWidth={2} />
              </div>
              <p className="text-base font-medium text-foreground tracking-tight leading-none">
                Mundo<span className="font-bold">Pet</span>
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
          <header className="h-14 shrink-0 sticky top-0 z-20 bg-card border-b border-border shadow-sm flex items-center px-6 relative">

            {/* Center — clinic identity */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              {tenantLogoUrl ? (
                <div className="w-[55px] h-[55px] rounded-md border border-border bg-card overflow-hidden shrink-0 flex items-center justify-center">
                  <Image src={tenantLogoUrl} alt={tenantName} width={55} height={55} className="object-contain" unoptimized />
                </div>
              ) : null}
              <p className="text-sm font-semibold text-foreground tracking-tight">{tenantName}</p>
            </div>

            {/* Right — user menu */}
            <div className="flex-1 flex items-center justify-end">
              <UserMenu
                fullName={profile?.full_name ?? ''}
                role={profile?.role ?? ''}
                initials={initials}
              />
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
