'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { OwnerSearch } from '@/components/owners/OwnerSearch'
import { OwnerCard } from '@/components/owners/OwnerCard'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
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
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Directorio</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dueños y Mascotas</h1>
        </div>
        <Link
          href="/dashboard/owners/new"
          className={buttonVariants({ size: 'sm' })}
        >
          <Plus size={14} className="mr-1.5" />
          Nuevo dueño
        </Link>
      </div>

      {/* Search */}
      <div className="mb-5">
        <OwnerSearch onResults={setOwners} onLoadingChange={setLoading} />
      </div>

      {/* Content */}
      {fetchError ? (
        <p className="text-destructive text-sm">{fetchError}</p>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[62px] rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : owners.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-medium text-foreground mb-1">No hay dueños registrados</p>
          <p className="text-sm text-muted-foreground">Agrega el primer dueño para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {owners.map(owner => <OwnerCard key={owner.id} owner={owner} />)}
        </div>
      )}
    </div>
  )
}
