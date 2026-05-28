'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { OwnerSearch } from '@/components/owners/OwnerSearch'
import { OwnerCard } from '@/components/owners/OwnerCard'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
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
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Directorio</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dueños</h1>
        </div>
        <Link
          href="/dashboard/owners/new"
          className={buttonVariants({ size: 'sm' })}
        >
          <Plus size={14} />
          Nuevo dueño
        </Link>
      </div>

      {/* Search Bar - Refined Style */}
      <div className="mb-8">
        <OwnerSearch onResults={setOwners} onLoadingChange={setLoading} />
      </div>

      {/* Content Area - Professional Directory Table */}
      {fetchError ? (
        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive text-sm font-medium">
          {fetchError}
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse border border-border/50" />
          ))}
        </div>
      ) : owners.length === 0 ? (
        <div className="text-center py-20 rounded-[2rem] border-2 border-dashed border-border/60 bg-zinc-50/50">
          <div className="w-14 h-14 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center mx-auto mb-5">
            <Users size={22} className="text-muted-foreground/25" />
          </div>
          <p className="font-bold text-foreground text-lg tracking-tight">Directorio sin registros</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
            Parece que aún no tienes clientes registrados en esta clínica.
          </p>
          <Link
            href="/dashboard/owners/new"
            className={buttonVariants({ className: 'mt-7' })}
          >
            <Plus size={14} />
            Registrar primer dueño
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-border shadow-xl shadow-primary/[0.02] overflow-hidden">
          {/* Table Header Labels */}
          <div className="flex items-center gap-6 px-8 py-4 bg-muted/30 border-b border-border/60">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest w-1/3">Cliente / ID</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest w-1/4">Información de Contacto</p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex-1">Pacientes Asociados</p>
            <div className="w-8 shrink-0" /> {/* Spacer for arrow */}
          </div>

          <div className="divide-y divide-border/40">
            {owners.map((owner, index) => (
              <div 
                key={owner.id} 
                className="animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both px-4"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <OwnerCard owner={owner} />
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="px-8 py-4 bg-muted/10 border-t border-border/40">
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-tight">
              {owners.length} {owners.length === 1 ? 'dueño' : 'dueños'} en el directorio
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
