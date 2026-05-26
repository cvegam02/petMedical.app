import Link from 'next/link'

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

export function PetCard({ pet }: PetCardProps) {
  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div>
        <p className="font-medium text-foreground">{pet.name}</p>
        <p className="text-sm text-muted-foreground">
          {pet.species?.name ?? ''}{pet.breed ? ` · ${pet.breed.name}` : ''} · {SEX_LABELS[pet.sex] ?? pet.sex}
          {pet.color ? ` · ${pet.color}` : ''}
        </p>
      </div>
      <span className="text-muted-foreground text-sm">Expediente →</span>
    </Link>
  )
}
