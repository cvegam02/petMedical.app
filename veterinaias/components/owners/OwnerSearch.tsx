'use client'
import { useState, useEffect, useCallback } from 'react'
import { SearchInput } from '@/components/ui/search-input'
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
    <SearchInput
      value={query}
      onChange={setQuery}
      placeholder="Buscar por nombre, teléfono o email..."
      containerClassName="mb-8"
    />
  )
}
