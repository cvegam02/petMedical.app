'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, X, Stethoscope } from 'lucide-react'

interface PetResult {
  id: string
  name: string
  breed: string | null
  species: { name: string } | null
  owner: { id: string; full_name: string } | null
}

export interface HistorialMetric {
  label: string
  value: number
}

export interface RecentConsultation {
  id: string
  reason: string
  created_at: string
  petId: string | null
  petName: string
  speciesName: string | null
  doctor: string | null
}

interface PetSearchHistorialProps {
  metrics: HistorialMetric[]
  recent: RecentConsultation[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function PetSearchHistorial({ metrics, recent }: PetSearchHistorialProps) {
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

  const isSearching = query.trim().length >= 2

  return (
    <div className="max-w-3xl space-y-6">
      <div className="relative max-w-xl">
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

      {/* Search states */}
      {isSearching && loading && (
        <p className="text-sm text-muted-foreground">Buscando...</p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No se encontraron mascotas con ese nombre.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-w-xl">
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

      {/* Idle content: metrics + recent consultations */}
      {!isSearching && (
        <div className="space-y-8">
          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="rounded-xl bg-card border border-border p-4">
                <p className="text-2xl font-bold tabular-nums text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Consultas recientes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
              <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Consultas recientes</p>
            </div>

            {recent.length === 0 ? (
              <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
                <p className="text-sm font-medium text-foreground">Sin consultas registradas</p>
                <p className="text-xs text-muted-foreground mt-1">Las consultas que registre tu clínica aparecerán aquí.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/60">
                {recent.map(c => (
                  <Link
                    key={c.id}
                    href={c.petId ? `/dashboard/historiales/${c.petId}` : '#'}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                        <Stethoscope size={14} className="text-primary/80" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.petName}
                          {c.speciesName && <span className="text-muted-foreground font-normal"> · {c.speciesName}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {c.reason}{c.doctor ? ` — Dr. ${c.doctor}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-4">{formatDate(c.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
