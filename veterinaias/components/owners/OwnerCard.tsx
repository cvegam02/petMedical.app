import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface OwnerCardProps {
  owner: {
    id: string
    full_name: string
    email: string | null
    phone: string
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function OwnerCard({ owner }: OwnerCardProps) {
  const initials = getInitials(owner.full_name)

  return (
    <Link
      href={`/dashboard/owners/${owner.id}`}
      className="group flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-primary">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm leading-snug">{owner.full_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {owner.phone}{owner.email ? ` · ${owner.email}` : ''}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight
        size={15}
        className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0"
      />
    </Link>
  )
}
