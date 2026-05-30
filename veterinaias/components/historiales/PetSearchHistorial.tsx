'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'

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
  const [error, setError] = useState<string | null>(null)
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
      setError(null)
      try {
        const res = await fetch(`/api/pets?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        if (!res.ok) return
        const json = await res.json()
        setResults(json.data ?? [])
        setSearched(true)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setResults([])
        setSearched(true)
        setError('Error al buscar. Intenta de nuevo.')
      } finally {
        if (abortRef.current === controller) setLoading(false)
      }
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  function clear() {
    setQuery('')
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar mascota por nombre..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/40 transition-all"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {!searched && !loading && (
        <p className="text-sm text-muted-foreground">Busca una mascota por nombre para ver su historial.</p>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">Buscando...</p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
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
