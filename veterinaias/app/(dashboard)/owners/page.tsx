'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { OwnerSearch } from '@/components/owners/OwnerSearch'
import { OwnerCard } from '@/components/owners/OwnerCard'
import { Button } from '@/components/ui/button'
import type { Owner } from '@/lib/types/owner'

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/owners')
      .then(r => r.json())
      .then(json => { setOwners(json.data ?? []); setLoading(false) })
      .catch(() => { setLoading(false); setFetchError('Error al cargar los dueños.') })
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dueños y Mascotas</h1>
        <Button asChild>
          <Link href="/dashboard/owners/new">+ Nuevo dueño</Link>
        </Button>
      </div>
      <div className="mb-4">
        <OwnerSearch onResults={setOwners} onLoadingChange={setLoading} />
      </div>
      {fetchError ? (
        <p className="text-red-500 text-sm">{fetchError}</p>
      ) : loading ? (
        <p className="text-slate-500 text-sm">Cargando...</p>
      ) : owners.length === 0 ? (
        <p className="text-slate-500 text-sm">No se encontraron dueños.</p>
      ) : (
        <div className="space-y-2">
          {owners.map(owner => <OwnerCard key={owner.id} owner={owner} />)}
        </div>
      )}
    </div>
  )
}
