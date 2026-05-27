import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Calendar, Settings2, ChevronRight, Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, tenants(name, type, subscription_status)')
    .eq('id', user!.id)
    .single() as any

  const tenant = profile?.tenants
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
          {greeting}, {firstName}
        </h1>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/dashboard/owners/new" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
          <Plus size={13} className="mr-1.5" />
          Nuevo dueño
        </Link>
        <Link href="/dashboard/appointments/new" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
          <Plus size={13} className="mr-1.5" />
          Nueva cita
        </Link>
      </div>

      {/* Work areas */}
      <div className="space-y-2">
        <p className="label-overline text-muted-foreground/50 px-1 mb-3">Módulos</p>

        <Link
          href="/dashboard/owners"
          className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            <Users size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-none">Dueños y Mascotas</p>
            <p className="text-xs text-muted-foreground mt-1">Directorio de clientes y expedientes clínicos</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
        </Link>

        <Link
          href="/dashboard/appointments"
          className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            <Calendar size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-none">Agenda</p>
            <p className="text-xs text-muted-foreground mt-1">Citas programadas y confirmaciones pendientes</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
        </Link>

        {profile?.role === 'admin' && (
          <Link
            href="/dashboard/settings/team"
            className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <Settings2 size={17} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">Equipo</p>
              <p className="text-xs text-muted-foreground mt-1">Roles, accesos e invitaciones</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
          </Link>
        )}
      </div>

      {/* Clinic info — minimal, not a feature card */}
      <div className="border-t border-border/60 pt-6">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground/60">
          <span>{tenant?.name}</span>
          <span>{tenant?.type === 'enterprise' ? 'Plan empresa' : 'Plan individual'}</span>
          <span className="font-mono">{user?.id.split('-')[0]}</span>
        </div>
      </div>
    </div>
  )
}
