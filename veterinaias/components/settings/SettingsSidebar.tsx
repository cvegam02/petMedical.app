'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Building2, BookOpen, Plug, Users, ChevronLeft } from 'lucide-react'

interface SubItem {
  label: string
  href: string
  tab?: string
}

interface Section {
  label: string
  icon: React.ElementType
  href: string
  items?: SubItem[]
}

const SECTIONS: Section[] = [
  {
    label: 'Clínica',
    icon: Building2,
    href: '/dashboard/settings/clinica',
    items: [
      { label: 'Información', href: '/dashboard/settings/clinica' },
      { label: 'General',     href: '/dashboard/settings/clinica', tab: 'general' },
      { label: 'Recetas',     href: '/dashboard/settings/clinica', tab: 'recetas' },
    ],
  },
  {
    label: 'Catálogos',
    icon: BookOpen,
    href: '/dashboard/settings/catalogos',
    items: [
      { label: 'Vacunas',       href: '/dashboard/settings/catalogos' },
      { label: 'Medicamentos',  href: '/dashboard/settings/catalogos', tab: 'medicamentos' },
      { label: 'Estética',      href: '/dashboard/settings/catalogos', tab: 'estetica' },
    ],
  },
  { label: 'Integraciones', icon: Plug,  href: '/dashboard/settings/integraciones' },
  { label: 'Equipo',        icon: Users, href: '/dashboard/settings/team' },
]

export function SettingsSidebar() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const currentTab   = searchParams.get('tab')

  function subItemUrl(item: SubItem): string {
    return item.tab ? `${item.href}?tab=${item.tab}` : item.href
  }

  function isSubItemActive(item: SubItem): boolean {
    if (pathname !== item.href) return false
    return item.tab ? currentTab === item.tab : !currentTab
  }

  function isSectionActive(section: Section): boolean {
    return pathname.startsWith(section.href)
  }

  return (
    <aside className="w-56 h-full flex flex-col bg-secondary border-r border-border shrink-0">

      {/* Back link (replaces brand) */}
      <div className="px-4 h-14 flex items-center shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-foreground/55 hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2} />
          Dashboard
        </Link>
      </div>

      <div className="mx-4 border-t border-border" />

      {/* Overline */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-[10px] font-bold text-secondary-foreground/60 uppercase tracking-[0.14em]">
          Configuración
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
        {SECTIONS.map((section) => {
          const Icon   = section.icon
          const active = isSectionActive(section)
          return (
            <div key={section.href}>
              {/* Section row */}
              {section.items ? (
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    active ? 'text-foreground font-semibold' : 'text-foreground/55'
                  }`}
                >
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.5 : 1.75}
                    className={active ? 'text-foreground' : 'text-foreground/40'}
                  />
                  <span className="tracking-tight">{section.label}</span>
                </div>
              ) : (
                <Link
                  href={section.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    active
                      ? 'bg-card text-primary font-semibold shadow-sm border border-primary/10'
                      : 'text-foreground/55 hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.5 : 1.75}
                    className={active ? 'text-primary' : 'text-foreground/40'}
                  />
                  <span className="tracking-tight">{section.label}</span>
                </Link>
              )}

              {/* Sub-items */}
              {section.items && (
                <div className="ml-8 mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const subActive = isSubItemActive(item)
                    return (
                      <Link
                        key={subItemUrl(item)}
                        href={subItemUrl(item)}
                        className={`block px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                          subActive
                            ? 'bg-card text-primary font-semibold shadow-sm border border-primary/10'
                            : 'text-foreground/55 hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
