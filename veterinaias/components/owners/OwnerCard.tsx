import Link from 'next/link'

interface OwnerCardProps {
  owner: {
    id: string
    full_name: string
    email: string | null
    phone: string
  }
}

export function OwnerCard({ owner }: OwnerCardProps) {
  return (
    <Link
      href={`/dashboard/owners/${owner.id}`}
      className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div>
        <p className="font-medium text-foreground">{owner.full_name}</p>
        <p className="text-sm text-muted-foreground">{owner.phone}{owner.email ? ` · ${owner.email}` : ''}</p>
      </div>
      <span className="text-muted-foreground text-sm">Ver →</span>
    </Link>
  )
}
