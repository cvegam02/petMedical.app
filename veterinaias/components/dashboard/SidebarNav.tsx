'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, PawPrint, Calendar, Settings2, ClipboardList } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio', exact: true },
  { href: '/dashboard/owners', icon: Users, label: 'Dueños' },
  { href: '/dashboard/pets', icon: PawPrint, label: 'Mascotas' },
  { href: '/dashboard/appointments', icon: Calendar, label: 'Citas' },
  { href: '/dashboard/historiales', icon: ClipboardList, label: 'Historiales' },
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
          <p className="text-[10px] font-bold text-foreground/35 uppercase tracking-[0.14em]">{label}</p>
        </div>
      )}
      {items.map(({ href, icon: Icon, label: itemLabel, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              isActive
                ? 'bg-card text-primary font-semibold shadow-sm border border-primary/10'
                : 'text-foreground/55 hover:text-foreground hover:bg-white/60'
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
      {role === 'admin' && renderItems(ADMIN_NAV_ITEMS, 'Administración')}
    </div>
  )
}
