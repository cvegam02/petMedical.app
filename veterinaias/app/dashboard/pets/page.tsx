'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { PawPrint, Search, X, Cat, Dog, ChevronRight, User, Hash, Info, Filter, Tag, Mars, Venus, HelpCircle } from 'lucide-react'

interface Pet {
  id: string
  name: string
  sex: string
  date_of_birth: string | null
  species: { name: string } | null
  breed: string | null
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
    <div className="max-w-5xl mx-auto pb-20">
      {/* Enhanced Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Censo de Pacientes</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Mascotas
            <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[12px] font-mono px-2 py-0.5 rounded-md border border-border/50">
              {pets.length}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Consulta el listado completo de pacientes registrados y su información de contacto.
          </p>
        </div>
      </div>

      {/* Tools Bar: Search */}
      <div className="relative mb-8 group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary/50 transition-colors pointer-events-none">
          <Search size={18} strokeWidth={2.5} />
        </div>
        <input
          type="text"
          value={query}
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar mascota por nombre..."
          className="w-full pl-12 pr-12 py-3.5 text-[15px] font-medium bg-white border border-border rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/[0.04] focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
        />
        {query && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60 transition-all"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Content Area */}
      {fetchError ? (
        <div className="p-6 rounded-2xl bg-destructive/[0.03] border border-destructive/10 text-destructive flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Filter size={18} />
          </div>
          <div>
            <p className="text-sm font-bold">Error de sincronización</p>
            <p className="text-xs opacity-80">{fetchError}</p>
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-border/50 flex items-center px-6 gap-6">
              <div className="w-14 h-14 rounded-xl bg-muted/40 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-muted/40 animate-pulse rounded" />
                <div className="h-3 w-1/6 bg-muted/20 animate-pulse rounded" />
              </div>
              <div className="w-1/4 space-y-2">
                <div className="h-3 w-full bg-muted/30 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : pets.length === 0 ? (
        <div className="text-center py-24 rounded-[2rem] border-2 border-dashed border-border/60 bg-muted/[0.02]">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl rotate-6 animate-pulse" />
            <div className="absolute inset-0 bg-white border border-border shadow-sm rounded-2xl flex items-center justify-center">
              <PawPrint size={32} className="text-muted-foreground/20" />
            </div>
          </div>
          <p className="font-bold text-foreground text-xl tracking-tight">
            {query ? 'Sin resultados' : 'Sin pacientes registrados'}
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed">
            {query
              ? `No encontramos mascotas que coincidan con "${query}".`
              : 'Las mascotas se registran desde el perfil de su dueño.'}
          </p>
          {query && (
            <button
              onClick={() => onSearch('')}
              className="mt-8 text-sm text-primary hover:underline font-bold"
            >
              Ver todas las mascotas
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          {/* Enhanced Table Header */}
          <div className="flex items-center gap-6 px-10 py-5 bg-muted/20 border-b border-border/60">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-1/3">Información del Paciente</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-1/4">Especie y Raza</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1">Responsable</p>
            <div className="w-9" />
          </div>

          <div className="divide-y divide-border/40">
            {pets.map((pet, index) => (
              <div
                key={pet.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <PetRow pet={pet} />
              </div>
            ))}
          </div>

          {/* Table Footer */}
          <div className="px-10 py-5 bg-muted/5 border-t border-border/40 flex items-center justify-between">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
              {pets.length} {pets.length === 1 ? 'paciente activo' : 'pacientes activos'}
            </p>
            <div className="flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
               <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Registros actualizados</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PetRow({ pet }: { pet: Pet }) {
  const speciesName = pet.species?.name?.toLowerCase() ?? ''
  const isCat = speciesName.includes('fel') || speciesName.includes('gat')
  const isDog = speciesName.includes('can') || speciesName.includes('perr')
  const Icon = isCat ? Cat : isDog ? Dog : PawPrint

  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="group relative flex items-center gap-6 py-5 px-6 hover:bg-primary/[0.01] active:scale-[0.998] transition-all duration-300 border-b border-border/40 last:border-0"
    >
      {/* Indicador de acento lateral */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full group-hover:h-8 transition-all duration-300 ease-out-expo" />

      {/* Column 1: Identity */}
      <div className="flex items-center gap-4 w-1/3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted/50 to-muted border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500 shadow-sm">
            <Icon 
              size={24} 
              strokeWidth={1.5} 
              className="text-muted-foreground/50 group-hover:text-primary transition-colors group-hover:scale-110 duration-500" 
            />
          </div>
          {/* Badge de sexo */}
          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
            pet.sex === 'male' ? 'bg-blue-500' : pet.sex === 'female' ? 'bg-pink-500' : 'bg-gray-400'
          }`}>
             <span className="text-[10px] font-bold text-white">
                {pet.sex === 'male' ? '♂' : pet.sex === 'female' ? '♀' : '?'}
             </span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground text-[16px] leading-tight tracking-tight truncate group-hover:text-primary transition-colors">
            {pet.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70 font-mono uppercase tracking-wider">
              {pet.id.split('-')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Column 2: Species / Breed - High Visibility */}
      <div className="flex flex-col gap-2 w-1/4 min-w-0">
        <div className="flex items-center gap-2.5 text-foreground/90 transition-colors">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
            <PawPrint size={12} className="text-primary" />
          </div>
          <p className="text-[13px] font-bold tracking-tight truncate">{pet.species?.name ?? '—'}</p>
        </div>
        {pet.breed && (
          <div className="flex items-center gap-2.5 text-foreground/60">
            <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/40">
              <Tag size={12} className="text-muted-foreground" />
            </div>
            <p className="text-[12px] font-medium truncate tracking-tight">{pet.breed}</p>
          </div>
        )}
      </div>

      {/* Column 3: Owner */}
      <div className="flex-1 min-w-0">
        {pet.owner ? (
          <div className="flex items-center gap-3 text-foreground/70 group-hover:text-foreground transition-colors">
            <div className="w-8 h-8 rounded-full bg-muted/50 border border-border/60 flex items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
              <User size={14} className="text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 leading-none mb-1">Responsable</p>
              <p className="text-[13px] font-semibold truncate tracking-tight">{pet.owner.full_name}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 opacity-30 italic grayscale">
            <div className="w-8 h-8 rounded-full bg-muted/50 border border-border flex items-center justify-center shrink-0">
              <User size={14} />
            </div>
            <p className="text-[12px] font-medium">Sin dueño asignado</p>
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
