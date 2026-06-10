'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'

interface AppSidebarProps {
  role: string
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname()

  if (pathname.startsWith('/dashboard/settings')) {
    return <SettingsSidebar />
  }

  return (
    <aside className="w-56 h-full flex flex-col bg-secondary border-r border-border shrink-0">
      <div className="px-4 h-14 flex items-center shrink-0">
        <Link href="/dashboard">
          <Image
            src="/mundeopet.png"
            alt="MundoPet"
            width={180}
            height={75}
            className="object-contain"
            priority
          />
        </Link>
      </div>
      <div className="mx-4 border-t border-border" />
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <SidebarNav role={role} />
      </nav>
    </aside>
  )
}
