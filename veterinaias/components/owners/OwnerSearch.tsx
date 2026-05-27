'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search } from 'lucide-react'
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

  return (
    <div className="relative max-w-lg group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors pointer-events-none">
        <Search size={16} strokeWidth={2.5} />
      </div>
      <input
        type="text"
        placeholder="Buscar por nombre, teléfono o email..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-white border border-zinc-200/60 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all duration-200 shadow-sm"
      />
    </div>
  )
}
