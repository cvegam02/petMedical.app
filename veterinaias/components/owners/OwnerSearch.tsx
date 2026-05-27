'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import type { Owner } from '@/lib/types/owner'

interface OwnerSearchProps {
  onResults: (owners: Owner[]) => void
  onLoadingChange: (loading: boolean) => void
}

export function OwnerSearch({ onResults, onLoadingChange }: OwnerSearchProps) {
  const [query, setQuery] = useState('')

  const search = useCallback(async (q: string) => {
    onLoadingChange(true)
    try {
      const url = q.trim() ? `/api/owners?q=${encodeURIComponent(q)}` : '/api/owners'
      const res = await fetch(url)
      const json = await res.json()
      onResults(json.data ?? [])
    } finally {
      onLoadingChange(false)
    }
  }, [onResults, onLoadingChange])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  function clear() {
    setQuery('')
  }

  return (
    <div className="relative max-w-lg group">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors pointer-events-none"
      />
      <input
        type="text"
        placeholder="Buscar por nombre, teléfono o email..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/40 transition-all shadow-sm"
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
  )
}
