import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Calendar, ArrowRight, Settings2, Plus, Search, ChevronRight } from 'lucide-react'

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

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Header - Montserrat Bold Hierarchy */}
      <header>
        <div className="inline-flex items-center gap-2 mb-4 px-2 py-0.5 rounded border border-primary/20 bg-primary/[0.03]">
          <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">
            {tenant?.name || 'VETERINAIAS'}
          </span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {greeting}, <span className="text-primary italic font-semibold">{firstName}.</span>
        </h1>
        <p className="text-muted-foreground mt-3 text-lg font-medium leading-relaxed max-w-2xl">
          Panel de control clínico. Selecciona una estación de trabajo para comenzar.
        </p>
      </header>

      {/* Main Experience - Asymmetric Workstations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Workstation 01: Patients Core (Primary) */}
        <Link
          href="/dashboard/owners"
          className="lg:col-span-8 group relative p-10 bg-white rounded-2xl border border-border shadow-sm hover:border-primary/50 active:scale-[0.985] transition-all duration-200 overflow-hidden"
        >
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
                <Users size={28} strokeWidth={2.2} />
              </div>
              <div className="flex items-center gap-2 text-primary font-mono text-[10px] font-bold tracking-widest border border-primary/20 px-3 py-1 rounded bg-primary/[0.03]">
                ESTACIÓN_01 <ArrowRight size={10} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div className="mt-12">
              <h3 className="text-2xl font-bold text-foreground tracking-tight">Dueños y Mascotas</h3>
              <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-sm font-medium">
                Acceso total al núcleo de datos clínico: expedientes, historiales y gestión de responsables.
              </p>
            </div>

            <div className="mt-10 flex items-center gap-4">
               <div className="h-11 flex items-center gap-2 px-6 bg-primary text-white rounded-lg text-xs font-bold shadow-md hover:bg-accent hover:text-white transition-all active:scale-[0.97]">
                  <Search size={15} strokeWidth={2.5} />
                  EXPLORAR DIRECTORIO
               </div>
               <div className="h-11 flex items-center gap-2 px-6 bg-white text-foreground rounded-lg text-xs font-bold border border-border hover:bg-muted transition-all active:scale-[0.97]">
                  <Plus size={15} strokeWidth={2.5} />
                  NUEVO REGISTRO
               </div>
            </div>
          </div>
        </Link>

        {/* Workstation 02: Ops & Settings (Secondary) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <Link
            href="/dashboard/appointments"
            className="group flex items-center gap-5 p-6 bg-white rounded-2xl border border-border shadow-sm hover:border-primary/40 active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border/50">
              <Calendar size={22} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm tracking-tight">Agenda</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-tight">Citas Programadas</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/dashboard/settings/team"
            className="group flex items-center gap-5 p-6 bg-white rounded-2xl border border-border shadow-sm hover:border-primary/40 active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border/50">
              <Settings2 size={22} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm tracking-tight">Equipo</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1 tracking-tight">Roles y Accesos</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
          </Link>

          {/* Clinic Summary - Montserrat Context */}
          <div className="mt-auto p-6 rounded-2xl border border-border bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Información de Cuenta</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <p className="text-xs text-muted-foreground font-medium">Suscripción</p>
                <p className="text-xs font-bold text-foreground uppercase tracking-tight">{tenant?.subscription_status || 'Activa'}</p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <p className="text-xs text-muted-foreground font-medium">Tipo de Clínica</p>
                <p className="text-xs font-bold text-foreground uppercase tracking-tight">{tenant?.type || 'Consultorio'}</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <p className="text-xs text-muted-foreground font-medium">ID de Estación</p>
                <p className="text-[10px] font-mono font-medium text-primary uppercase tracking-tighter">
                  #{user?.id.split('-')[0]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
