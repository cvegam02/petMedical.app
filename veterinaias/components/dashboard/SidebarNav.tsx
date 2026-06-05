'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, PawPrint, Calendar, Settings2, Scissors, BedDouble, Syringe, HeartPulse, Stethoscope } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio', exact: true },
  { href: '/dashboard/owners', icon: Users, label: 'Dueños' },
  { href: '/dashboard/pets', icon: PawPrint, label: 'Mascotas' },
  { href: '/dashboard/appointments', icon: Calendar, label: 'Calendario' },
]

const SERVICES_NAV_ITEMS = [
  { href: '/dashboard/servicios/consulta', icon: Stethoscope, label: 'Consultas' },
  { href: '/dashboard/servicios/estetica', icon: Scissors, label: 'Estética' },
  { href: '/dashboard/servicios/hotel', icon: BedDouble, label: 'Hotel' },
  { href: '/dashboard/servicios/cirugia', icon: Syringe, label: 'Cirugía' },
  { href: '/dashboard/servicios/hospitalizacion', icon: HeartPulse, label: 'Hospitalización' },
]

const ADMIN_NAV_ITEMS = [
  { href: '/dashboard/settings', icon: Settings2, label: 'Configuración' },
]

interface SidebarNavProps {
  role: string
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname()

  const renderItems = (items: typeof NAV_ITEMS, label?: string) => (
    <div className="space-y-0.5">
      {label && (
        <div className="pt-5 pb-1.5 px-3">
          <p className="text-[10px] font-bold text-secondary-foreground/60 uppercase tracking-[0.14em]">{label}</p>
        </div>
      )}
      {items.map(({ href, icon: Icon, label: itemLabel, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${isActive
                ? 'bg-card text-primary font-semibold shadow-sm border border-primary/10'
                : 'text-foreground/55 hover:text-foreground hover:bg-muted'
              }`}
          >
            <Icon
              size={15}
              strokeWidth={isActive ? 2.5 : 1.75}
              className={`shrink-0 ${isActive ? 'text-primary' : 'text-foreground/40'}`}
            />
            <span className="tracking-tight">{itemLabel}</span>
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-1">
      {renderItems(NAV_ITEMS)}
      {renderItems(SERVICES_NAV_ITEMS, 'Servicios')}
      {role === 'admin' && renderItems(ADMIN_NAV_ITEMS, 'Administración')}
    </div>
  )
}
