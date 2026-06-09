'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { OwnerSearch } from '@/components/owners/OwnerSearch'
import { OwnerCard } from '@/components/owners/OwnerCard'
import { ListFooter, ListSkeleton } from '@/components/ui/list-primitives'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Users, Filter } from 'lucide-react'
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
    <div className="max-w-5xl mx-auto pb-20">
      {/* Page header - Enhanced clinical style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">Registro Central</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Dueños
            <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[12px] font-mono px-2 py-0.5 rounded-md border border-border/50">
              {owners.length}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Gestiona la información de contacto de los clientes y sus mascotas vinculadas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/owners/new"
            className={buttonVariants({ variant: 'default', className: 'shadow-sm shadow-primary/20' })}
          >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo dueño
          </Link>
        </div>
      </div>

      {/* Tools Bar: Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
        <div className="md:col-span-12">
          <div className="relative group">
            <OwnerSearch onResults={setOwners} onLoadingChange={setLoading} />
          </div>
        </div>
      </div>

      {/* Content Area - Professional Directory Table */}
      {fetchError ? (
        <div className="p-6 rounded-2xl bg-destructive/[0.03] border border-destructive/10 text-destructive flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Filter size={18} />
          </div>
          <div>
            <p className="text-sm font-bold">Error de sincronización</p>
            <p className="text-xs opacity-80">{fetchError}</p>
          </div>
        </div>
      ) : loading ? (
        <ListSkeleton rows={6} />
      ) : owners.length === 0 ? (
        <div className="text-center py-24 rounded-[2rem] border-2 border-dashed border-border/60 bg-muted/[0.02]">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl rotate-6 animate-pulse" />
            <div className="absolute inset-0 bg-card border border-border shadow-sm rounded-2xl flex items-center justify-center">
              <Users size={32} className="text-muted-foreground/20" />
            </div>
          </div>
          <p className="font-bold text-foreground text-xl tracking-tight">Directorio vacío</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed">
            Comienza registrando a tu primer cliente para habilitar las consultas médicas.
          </p>
          <Link
            href="/dashboard/owners/new"
            className={buttonVariants({ variant: 'default', size: 'lg', className: 'mt-8 shadow-md shadow-primary/10' })}
          >
            <Plus size={16} strokeWidth={2.5} />
            Registrar primer dueño
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-[1.5rem] border border-border shadow-xl shadow-primary/[0.01] overflow-hidden">
          {/* Table Header Labels */}
          <div className="flex items-center gap-6 px-6 py-[9px] bg-[#f3f5f7] border-b border-[#e7ebef]">
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-1/3">Información del Dueño</p>
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] w-1/4">Contacto</p>
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] flex-1">Pacientes Vinculados</p>
            <div className="w-9" />
          </div>

          <div className="divide-y divide-border/40">
            {owners.map((owner, index) => (
              <div 
                key={owner.id} 
                className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <OwnerCard owner={owner} />
              </div>
            ))}
          </div>

          <ListFooter count={owners.length} label={owners.length === 1 ? 'dueño' : 'dueños'} />
        </div>
      )}
    </div>
  )
}
