'use client'
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

export interface PetSearchResult {
  pet_id:       string
  pet_name:     string
  species_name: string
  breed_name:   string | null
  owner_name:   string
  owner_phone:  string | null
}

interface PetSearchComboboxProps {
  value: string
  onChange: (name: string) => void
  onSelect: (pet: PetSearchResult) => void
  error?: string
  autoFocus?: boolean
}

export function PetSearchCombobox({
  value,
  onChange,
  onSelect,
  error,
  autoFocus,
}: PetSearchComboboxProps) {
  const [results, setResults] = useState<PetSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  useEffect(() => {
    if (value.trim() === '') {
      setResults([])
      setOpen(false)
      setHasSearched(false)
    }
  }, [value])

  function handleChange(name: string) {
    onChange(name)
    setHasSearched(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (name.trim().length < 2) {
      abortRef.current?.abort()
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      try {
        const res = await fetch(
          `/api/pets/search-cross-tenant?name=${encodeURIComponent(name.trim())}`,
          { signal: controller.signal }
        )
        if (!res.ok) return
        const json = await res.json()
        setResults(json.data ?? [])
        setOpen(true)
        setHasSearched(true)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleSelect(pet: PetSearchResult) {
    setOpen(false)
    setResults([])
    onSelect(pet)
  }

  const showNoResults = hasSearched && !loading && open && results.length === 0 && value.trim().length >= 2

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Ej. Luna, Rocky..."
        autoFocus={autoFocus}
        autoComplete="off"
      />

      {loading && (
        <p className="text-[11px] text-muted-foreground mt-1 animate-pulse">Buscando...</p>
      )}
      {error && !loading && (
        <p className="text-destructive text-xs mt-1">{error}</p>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-md max-h-60 overflow-y-auto">
          {results.slice(0, 6).map(pet => (
            <button
              key={pet.pet_id}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b border-border/40 last:border-b-0"
              onMouseDown={e => { e.preventDefault(); handleSelect(pet) }}
            >
              <p className="text-sm font-medium leading-tight">{pet.pet_name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {[pet.species_name, pet.breed_name].filter(Boolean).join(' · ')}
                {pet.owner_name ? ` — ${pet.owner_name}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}

      {showNoResults && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-md px-3 py-2.5">
          <p className="text-sm text-muted-foreground">
            No se encontraron resultados. Se registrará como nuevo paciente.
          </p>
        </div>
      )}
    </div>
  )
}
