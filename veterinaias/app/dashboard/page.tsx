import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Calendar, ArrowRight, Settings2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

const QUICK_ACTIONS = [
  {
    icon: Users,
    label: 'Dueños y Mascotas',
    desc: 'Buscar pacientes, agregar dueños, ver historiales clínicos',
    href: '/dashboard/owners',
    primary: true,
  },
  {
    icon: Calendar,
    label: 'Agenda',
    desc: 'Ver y agendar citas del día',
    href: '/dashboard/appointments',
    primary: false,
    badge: 'Próximamente',
  },
  {
    icon: Settings2,
    label: 'Equipo',
    desc: 'Gestionar miembros y permisos',
    href: '/dashboard/settings/team',
    primary: false,
  },
]

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
    <div>
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest mb-2">{tenant?.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {greeting}, {firstName}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          ¿En qué vas a trabajar hoy?
        </p>
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        {QUICK_ACTIONS.map(({ icon: Icon, label, desc, href, primary, badge }) => (
          <Link
            key={href}
            href={href}
            className={`group flex items-center gap-5 p-5 rounded-xl border transition-all ${
              primary
                ? 'bg-card border-border hover:border-primary/40 hover:shadow-md'
                : 'bg-card border-border hover:border-border hover:shadow-sm opacity-80 hover:opacity-100'
            }`}
          >
            {/* Icon */}
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              primary ? 'bg-primary/10 group-hover:bg-primary/15' : 'bg-muted'
            }`}>
              <Icon size={20} className={primary ? 'text-primary' : 'text-muted-foreground'} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground text-sm">{label}</p>
                {badge && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
            </div>

            {/* Arrow */}
            <ArrowRight
              size={16}
              className="text-muted-foreground/30 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all shrink-0"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
