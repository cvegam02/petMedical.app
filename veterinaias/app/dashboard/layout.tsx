import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserMenu } from '@/components/dashboard/UserMenu'
import { Toaster } from 'sonner'
import { AppSidebar } from '@/components/dashboard/AppSidebar'

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
    <div className="h-dvh flex flex-col border-t-[3px] border-secondary-foreground bg-background overflow-hidden">
      <div className="flex flex-1 min-h-0">

        {/* Sidebar — conmuta entre principal y settings */}
        <AppSidebar role={profile?.role ?? ''} />

        {/* Content column */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Topbar */}
          <header className="h-14 shrink-0 sticky top-0 z-20 bg-card border-b border-border shadow-sm flex items-center px-6 relative">

            {/* Center — clinic identity */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              {tenantLogoUrl ? (
                <div className="w-[55px] h-[55px] rounded-md border border-border bg-card overflow-hidden shrink-0 flex items-center justify-center">
                  <Image src={tenantLogoUrl} alt={tenantName} width={55} height={55} className="object-contain" unoptimized />
                </div>
              ) : null}
              <p className="text-sm font-semibold text-secondary-foreground tracking-tight">{tenantName}</p>
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
          <main className="flex-1 min-h-0 overflow-y-auto">
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
