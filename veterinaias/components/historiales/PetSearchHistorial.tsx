'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface PetResult {
  id: string
  name: string
  breed: string | null
  species: { name: string } | null
  owner: { id: string; full_name: string } | null
}

export function PetSearchHistorial() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PetResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const res = await fetch(`/api/pets?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        if (!res.ok) return
        const json = await res.json()
        setResults(json.data ?? [])
        setSearched(true)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        if (abortRef.current === controller) setLoading(false)
      }
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  return (
    <div className="max-w-xl space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar mascota por nombre..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {!searched && !loading && (
        <p className="text-sm text-muted-foreground">Busca una mascota por nombre para ver su historial.</p>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">Buscando...</p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No se encontraron mascotas con ese nombre en esta clínica.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(pet => (
            <div key={pet.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm">
              <div>
                <p className="font-semibold text-sm text-foreground">{pet.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[pet.species?.name, pet.breed].filter(Boolean).join(' · ')}
                  {pet.owner && ` — ${pet.owner.full_name}`}
                </p>
              </div>
              <Link
                href={`/dashboard/historiales/${pet.id}`}
                className="text-xs font-medium text-primary hover:underline shrink-0 ml-4"
              >
                Ver historial →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
