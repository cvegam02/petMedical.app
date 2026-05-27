'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { PawPrint, Search, X } from 'lucide-react'

interface Pet {
  id: string
  name: string
  sex: string
  date_of_birth: string | null
  species: { name: string } | null
  breed: { name: string } | null
  owner: { id: string; full_name: string } | null
}

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  function load(q: string) {
    setLoading(true)
    const url = q.trim() ? `/api/pets?q=${encodeURIComponent(q)}` : '/api/pets'
    fetch(url)
      .then(r => r.json())
      .then(json => { setPets(json.data ?? []); setLoading(false) })
      .catch(() => { setFetchError('Error al cargar mascotas.'); setLoading(false) })
  }

  useEffect(() => { load('') }, [])

  function onSearch(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(value), 300)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Directorio</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mascotas</h1>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/40 transition-all"
        />
        {query && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      {fetchError ? (
        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive text-sm font-medium">
          {fetchError}
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse border border-border/50" />
          ))}
        </div>
      ) : pets.length === 0 ? (
        <div className="text-center py-20 rounded-[2rem] border-2 border-dashed border-border/60 bg-zinc-50/50">
          <div className="w-14 h-14 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center mx-auto mb-5">
            <PawPrint size={20} className="text-muted-foreground/25" />
          </div>
          <p className="font-bold text-foreground text-lg tracking-tight">
            {query ? 'Sin resultados' : 'Sin mascotas registradas'}
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
            {query
              ? `No hay mascotas que coincidan con "${query}".`
              : 'Las mascotas se registran desde el perfil de su dueño.'}
          </p>
          {query && (
            <button
              onClick={() => onSearch('')}
              className="mt-5 text-sm text-primary hover:underline font-medium"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-border shadow-xl shadow-primary/[0.02] overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-6 px-8 py-4 bg-muted/30 border-b border-border/60">
            <p className="label-overline text-muted-foreground/60 w-1/3">Paciente</p>
            <p className="label-overline text-muted-foreground/60 w-1/4">Especie / Raza</p>
            <p className="label-overline text-muted-foreground/60 flex-1">Responsable</p>
            <div className="w-6 shrink-0" />
          </div>

          <div className="divide-y divide-border/40">
            {pets.map((pet, index) => (
              <div
                key={pet.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-both px-4"
                style={{ animationDelay: `${index * 25}ms` }}
              >
                <PetRow pet={pet} />
              </div>
            ))}
          </div>

          <div className="px-8 py-4 bg-muted/10 border-t border-border/40 flex items-center justify-between">
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-tight">
              {pets.length} {pets.length === 1 ? 'mascota' : 'mascotas'}{query ? ` · "${query}"` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function PetRow({ pet }: { pet: Pet }) {
  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="group flex items-center gap-6 py-3.5 px-4 hover:bg-primary/[0.02] transition-colors"
    >
      <div className="flex items-center gap-3 w-1/3 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">{pet.name}</p>
        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-tight shrink-0">
          {pet.sex === 'male' ? 'M' : pet.sex === 'female' ? 'H' : '—'}
        </span>
      </div>
      <div className="w-1/4 min-w-0">
        <p className="text-sm text-muted-foreground truncate">
          {pet.species?.name ?? '—'}
          {pet.breed ? <span className="text-muted-foreground/50"> · {pet.breed.name}</span> : null}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        {pet.owner ? (
          <p className="text-sm text-muted-foreground truncate">{pet.owner.full_name}</p>
        ) : (
          <p className="text-sm text-muted-foreground/40 italic">Sin dueño</p>
        )}
      </div>
      <div className="w-6 shrink-0 flex justify-end">
        <span className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors">›</span>
      </div>
    </Link>
  )
}
