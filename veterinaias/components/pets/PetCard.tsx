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
      className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
    >
      <div>
        <p className="font-medium text-slate-900">{pet.name}</p>
        <p className="text-sm text-slate-500">
          {pet.species?.name ?? ''}{pet.breed ? ` · ${pet.breed.name}` : ''} · {SEX_LABELS[pet.sex] ?? pet.sex}
          {pet.color ? ` · ${pet.color}` : ''}
        </p>
      </div>
      <span className="text-slate-400 text-sm">Expediente →</span>
    </Link>
  )
}
