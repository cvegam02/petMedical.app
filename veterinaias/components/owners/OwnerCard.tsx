import Link from 'next/link'
import { ChevronRight, Phone, Mail, PawPrint } from 'lucide-react'

interface OwnerCardProps {
  owner: {
    id: string
    full_name: string
    email: string | null
    phone: string
    pets?: Array<{ id: string; name: string; species?: { name: string } }>
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
  const pets = owner.pets || []

  return (
    <Link
      href={`/dashboard/owners/${owner.id}`}
      className="group relative flex items-center gap-6 py-4 px-4 hover:bg-primary/[0.02] active:scale-[0.995] transition-all duration-200 border-b border-border/40 last:border-0"
    >
      {/* Column 1: Identity */}
      <div className="flex items-center gap-4 w-1/3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
          <span className="text-[11px] font-bold tracking-tight">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground text-sm leading-none tracking-tight truncate">
            {owner.full_name}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1.5 opacity-60">
            ID: {owner.id.split('-')[0]}
          </p>
        </div>
      </div>

      {/* Column 2: Contact */}
      <div className="flex flex-col gap-1 w-1/4 min-w-0">
        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
          <Phone size={12} className="opacity-40" />
          <p className="text-[11px] font-mono tracking-tighter tabular-nums">{owner.phone}</p>
        </div>
        {owner.email && (
          <div className="flex items-center gap-2 text-muted-foreground/60">
            <Mail size={12} className="opacity-30" />
            <p className="text-[11px] truncate tracking-tight">{owner.email}</p>
          </div>
        )}
      </div>

      {/* Column 3: Pets (The "Patient" chips) */}
      <div className="flex-1 flex flex-wrap gap-1.5 items-center">
        {pets.length > 0 ? (
          pets.map((pet) => (
            <span 
              key={pet.id}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary/50 text-foreground/70 border border-border/50 group-hover:border-primary/20 transition-colors"
            >
              <PawPrint size={10} className="text-primary/40" />
              {pet.name}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-muted-foreground/40 italic">Sin mascotas</span>
        )}
      </div>

      {/* Action Area */}
      <div className="shrink-0 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center text-zinc-300 group-hover:text-primary transition-all shadow-sm">
          <ChevronRight size={14} strokeWidth={3} />
        </div>
      </div>
    </Link>
  )
}
