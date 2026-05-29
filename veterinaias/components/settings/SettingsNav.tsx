'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, SlidersHorizontal, Plug, Users } from 'lucide-react'

const SECTIONS = [
  { href: '/dashboard/settings/clinica', icon: Building2, label: 'Clínica' },
  { href: '/dashboard/settings/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
  { href: '/dashboard/settings/integraciones', icon: Plug, label: 'Integraciones' },
  { href: '/dashboard/settings/team', icon: Users, label: 'Equipo' },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 border-b border-border mb-8">
      {SECTIONS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
