'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, PawPrint, Calendar, Settings2 } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio', exact: true },
  { href: '/dashboard/owners', icon: Users, label: 'Dueños' },
  { href: '/dashboard/pets', icon: PawPrint, label: 'Mascotas' },
  { href: '/dashboard/appointments', icon: Calendar, label: 'Citas' },
]

const ADMIN_NAV_ITEMS = [
  { href: '/dashboard/settings/team', icon: Settings2, label: 'Equipo' },
]

interface SidebarNavProps {
  role: string
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname()

  const renderItems = (items: typeof NAV_ITEMS, label?: string) => (
    <div className="space-y-1">
      {label && (
        <div className="pt-6 pb-2 px-3">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.1em]">{label}</p>
        </div>
      )}
      {items.map(({ href, icon: Icon, label: itemLabel, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-primary/5 text-primary font-semibold'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <Icon
              size={15}
              className={`shrink-0 ${isActive ? 'text-primary' : 'text-zinc-400'}`}
            />
            <span className="tracking-tight">{itemLabel}</span>
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      {renderItems(NAV_ITEMS)}
      {role === 'admin' && renderItems(ADMIN_NAV_ITEMS, 'Administración')}
    </div>
  )
}
