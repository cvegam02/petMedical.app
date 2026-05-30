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

  return (
    <Link
      href={`/dashboard/owners/${owner.id}`}
      className="group relative flex items-center gap-6 py-5 px-6 hover:bg-primary/[0.01] active:scale-[0.998] transition-all duration-300 border-b border-border/40 last:border-0"
    >
      {/* Indicador de acento lateral - Solo visible en hover */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full group-hover:h-8 transition-all duration-300 ease-out-expo" />

      {/* Column 1: Identity */}
      <div className="flex items-center gap-4 w-1/3 min-w-0">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted/50 to-muted border border-border/60 flex items-center justify-center shrink-0 group-hover:border-primary/30 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500 shadow-sm">
            {initials ? (
              <span className="text-[13px] font-bold tracking-tight text-foreground/70 group-hover:text-primary transition-colors">
                {initials}
              </span>
            ) : (
              <User size={18} className="text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
            )}
          </div>
          {/* Badge de cantidad de mascotas si tiene más de 0 */}
          {pets.length > 0 && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center animate-in zoom-in duration-500 delay-300">
              <span className="text-[9px] font-bold text-primary">{pets.length}</span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground text-[15px] leading-tight tracking-tight truncate group-hover:text-primary transition-colors">
            {owner.full_name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70 font-mono uppercase tracking-wider">
              {owner.id.split('-')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Column 2: Contact - Enhanced Visibility */}
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

      {/* Column 3: Pets (The "Patient" chips) */}
      <div className="flex-1 flex flex-wrap gap-2 items-center">
        {pets.length > 0 ? (
          pets.map((pet) => (
            <div 
              key={pet.id}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-card border border-border group-hover:border-primary/20 group-hover:bg-primary/[0.02] transition-all duration-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <PawPrint size={10} className="text-primary/40 group-hover:text-primary transition-colors" />
              <span className="text-foreground/80 group-hover:text-foreground">{pet.name}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-dashed border-border/60 opacity-40 italic">
            <span className="text-[10px] text-muted-foreground">Sin pacientes registrados</span>
          </div>
        )}
      </div>

      {/* Action Area */}
      <div className="shrink-0 flex items-center ml-2">
        <div className="w-9 h-9 rounded-xl bg-muted/20 border border-transparent flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:bg-white group-hover:border-border group-hover:shadow-sm transition-all duration-300">
          <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  )
}
