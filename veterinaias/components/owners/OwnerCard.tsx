import Link from 'next/link'
import { ChevronRight, Phone, Mail, PawPrint, User } from 'lucide-react'

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
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function OwnerCard({ owner }: OwnerCardProps) {
  const initials = getInitials(owner.full_name)
  const pets = owner.pets || []
  const visiblePets = pets.slice(0, 3)
  const extraCount = pets.length - visiblePets.length

  return (
    <Link
      href={`/dashboard/owners/${owner.id}`}
      className="group relative flex items-center gap-4 px-6 py-3 hover:bg-primary/[0.01] transition-colors duration-200 cursor-pointer"
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[28px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Column 1: Identity */}
      <div className="flex items-center gap-4 w-1/3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-muted/50 to-muted border border-border/60 flex items-center justify-center shrink-0 group-hover:border-primary/30 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500 shadow-sm">
          {initials ? (
            <span className="text-[12px] font-bold tracking-tight text-foreground/70 group-hover:text-primary transition-colors">
              {initials}
            </span>
          ) : (
            <User size={16} className="text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground text-[15px] leading-tight tracking-tight truncate group-hover:text-primary transition-colors">
            {owner.full_name}
          </p>
        </div>
      </div>

      {/* Column 2: Contact */}
      <div className="flex flex-col gap-2 w-1/4 min-w-0">
        <div className="flex items-center gap-3 text-foreground/90 group-hover:text-primary transition-colors">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
            <Phone size={12} className="text-primary" />
          </div>
          <p className="text-[13px] font-bold font-mono tracking-tight tabular-nums">{owner.phone}</p>
        </div>

        {owner.email ? (
          <div className="flex items-center gap-3 text-foreground/70">
            <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/40">
              <Mail size={12} className="text-muted-foreground" />
            </div>
            <p className="text-[12px] font-medium truncate tracking-tight">{owner.email}</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 opacity-30 italic">
            <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/20">
              <Mail size={12} />
            </div>
            <p className="text-[11px]">Sin correo</p>
          </div>
        )}
      </div>

      {/* Column 3: Pet chips */}
      <div className="flex-1 flex flex-wrap gap-1.5 items-center">
        {pets.length > 0 ? (
          <>
            {visiblePets.map((pet) => (
              <div
                key={pet.id}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-[2px] bg-primary/10 text-primary rounded-full border border-primary/20"
              >
                <PawPrint size={9} className="shrink-0" />
                <span>{pet.name}</span>
              </div>
            ))}
            {extraCount > 0 && (
              <div className="inline-flex items-center text-[10px] font-medium px-2 py-[2px] bg-[#f3f5f7] text-muted-foreground rounded-full border border-[#e7ebef]">
                +{extraCount}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-dashed border-border/60 opacity-40 italic">
            <span className="text-[10px] text-muted-foreground">Sin pacientes registrados</span>
          </div>
        )}
      </div>

      {/* Action Area */}
      <div className="shrink-0 flex items-center ml-2">
        <div className="w-9 h-9 rounded-[9px] bg-[#fafbfc] border border-transparent flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:border-[#e7ebef] group-hover:shadow-sm transition-all duration-300">
          <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  )
}
