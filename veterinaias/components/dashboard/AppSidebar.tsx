'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'

interface AppSidebarProps {
  role: string
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname()
  const inSettings = pathname.startsWith('/dashboard/settings')

  // Track direction for the swap animation. Only update when inSettings changes.
  const prevRef      = useRef<boolean | null>(null)
  const directionRef = useRef<'settings' | 'main' | null>(null)

  if (prevRef.current !== null && prevRef.current !== inSettings) {
    directionRef.current = inSettings ? 'settings' : 'main'
  }
  prevRef.current = inSettings

  const animClass =
    directionRef.current === 'settings' ? 'sidebar-enter-settings' :
    directionRef.current === 'main'     ? 'sidebar-enter-main' : ''

  // Changing the key forces React to unmount the old sidebar and mount a fresh
  // one, which triggers the CSS enter animation.
  const sidebarKey = inSettings ? 'settings' : 'main'

  if (inSettings) {
    return (
      <div key={sidebarKey} className={`w-56 shrink-0 h-full ${animClass}`}>
        <SettingsSidebar />
      </div>
    )
  }

  return (
    <div key={sidebarKey} className={`w-56 shrink-0 h-full ${animClass}`}>
      <aside className="w-full h-full flex flex-col bg-secondary border-r border-border">
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
    </div>
  )
}
