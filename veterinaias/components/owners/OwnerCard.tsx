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
      className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
    >
      <div>
        <p className="font-medium text-slate-900">{owner.full_name}</p>
        <p className="text-sm text-slate-500">{owner.phone}{owner.email ? ` · ${owner.email}` : ''}</p>
      </div>
      <span className="text-slate-400 text-sm">Ver →</span>
    </Link>
  )
}
