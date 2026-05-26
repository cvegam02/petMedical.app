'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
  exact?: boolean
}

interface SidebarNavProps {
  items: NavItem[]
  label?: string
}

export function SidebarNav({ items, label }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <div>
      {label && (
        <div className="pt-3 pb-1 px-3">
          <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">{label}</p>
        </div>
      )}
      {items.map(({ href, icon: Icon, label: itemLabel, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-accent text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Icon
              size={15}
              className={`shrink-0 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground/60 group-hover:text-foreground/70'
              }`}
            />
            {itemLabel}
          </Link>
        )
      })}
    </div>
  )
}
