'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ShieldCheck, LogOut, User, ChevronDown } from 'lucide-react'
import { signOutAction } from '@/app/actions/auth'

interface UserMenuProps {
  fullName: string
  role: string
  initials: string
}

export function UserMenu({ fullName, role, initials }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-muted/60 transition-colors"
      >
        <div className="text-right leading-none">
          <p className="text-xs font-semibold text-foreground">{fullName}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            {role === 'admin' && <ShieldCheck size={9} className="text-primary/70" />}
            <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-primary/80">{initials}</span>
        </div>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-popover border border-border rounded-lg shadow-md overflow-hidden z-50">
          <Link
            href="/dashboard/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <User size={14} className="text-muted-foreground" />
            Mi Perfil
          </Link>
          <div className="border-t border-border" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/8 transition-colors"
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
