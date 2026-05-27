import Link from 'next/link'
import { ChevronRight, Cat, Dog, PawPrint } from 'lucide-react'

interface PetCardProps {
  pet: {
    id: string
    name: string
    sex: string
    date_of_birth: string | null
    color: string | null
    species: { name: string } | null
    breed: { name: string } | null
  }
}

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

function calcAge(dob: string) {
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 12) return `${months}m`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years}a ${rem}m` : `${years}a`
}

export function PetCard({ pet }: PetCardProps) {
  const age = pet.date_of_birth ? calcAge(pet.date_of_birth) : null
  
  const speciesName = pet.species?.name?.toLowerCase() || ''
  const Icon = speciesName.includes('fel') ? Cat : speciesName.includes('can') || speciesName.includes('perr') ? Dog : PawPrint

  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="group relative flex items-center gap-4 p-4 bg-white rounded-xl border border-border/50 hover:border-primary/40 active:scale-[0.98] transition-all duration-200"
    >
      {/* Species Icon */}
      <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center shrink-0 border border-border/50 group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
        <Icon size={18} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground text-sm leading-none tracking-tight">{pet.name}</p>
          {age && (
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/80 tracking-tighter tabular-nums">
              {age}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 truncate tracking-tight">
          <span className="font-bold text-muted-foreground/40 uppercase text-[9px] tracking-wider">{pet.species?.name ?? ''}</span>
          {pet.breed ? ` · ${pet.breed.name}` : ''}
          <span className="mx-1.5 text-border">/</span>
          {SEX_LABELS[pet.sex] ?? pet.sex}
        </p>
      </div>

      <ChevronRight
        size={14}
        className="text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0"
      />
    </Link>
  )
}
