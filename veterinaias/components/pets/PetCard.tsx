import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

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

  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="group flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all"
    >
      {/* Species badge */}
      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <span className="text-base">{pet.species?.name?.toLowerCase() === 'felino' ? '🐱' : '🐾'}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground text-sm">{pet.name}</p>
          {age && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {age}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {pet.species?.name ?? ''}{pet.breed ? ` · ${pet.breed.name}` : ''} · {SEX_LABELS[pet.sex] ?? pet.sex}
          {pet.color ? ` · ${pet.color}` : ''}
        </p>
      </div>

      <ChevronRight
        size={15}
        className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0"
      />
    </Link>
  )
}
