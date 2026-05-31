'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Pencil, Archive } from 'lucide-react'
import { groomingServiceCatalogSchema, type GroomingServiceCatalogFormValues } from '@/lib/validations/grooming'
import type { GroomingServiceCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function GroomingServiceCatalogTab() {
  const [services, setServices] = useState<GroomingServiceCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GroomingServiceCatalog | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<GroomingServiceCatalogFormValues>({
      resolver: zodResolver(groomingServiceCatalogSchema) as any,
    })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/catalog/grooming-services')
    const json = await res.json()
    setServices(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    reset({ name: '', duration_minutes: undefined, notes: '' })
    setModalOpen(true)
  }

  function openEdit(s: GroomingServiceCatalog) {
    setEditing(s)
    reset({
      name: s.name,
      duration_minutes: s.duration_minutes ?? undefined,
      notes: s.notes ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(values: GroomingServiceCatalogFormValues) {
    const url = editing
      ? `/api/catalog/grooming-services/${editing.id}`
      : '/api/catalog/grooming-services'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success(editing ? 'Servicio actualizado' : 'Servicio agregado')
    setModalOpen(false)
    load()
  }

  async function archive(id: string) {
    const res = await fetch(`/api/catalog/grooming-services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    })
    if (!res.ok) { toast.error('Error al archivar'); return }
    toast.success('Servicio archivado')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Servicios de estética</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} className="mr-1" />Agregar servicio
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : services.length === 0 ? (
        <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin servicios en el catálogo</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agrega los servicios que ofrece tu servicio de estética.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Servicio</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Duración</th>
                <th className="text-right px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {services.map(s => (
                <tr key={s.id} className={s.active ? '' : 'opacity-40'}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {s.name}
                    {!s.active && <span className="ml-2 text-xs text-muted-foreground">(archivado)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.duration_minutes ? `${s.duration_minutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.active && (
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger render={
                              <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                                <Pencil size={13} />
                              </Button>
                            } />
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={
                              <Button
                                size="sm" variant="ghost"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => archive(s.id)}
                              >
                                <Archive size={13} />
                              </Button>
                            } />
                            <TooltipContent>Archivar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar servicio' : 'Agregar servicio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input {...register('name')} placeholder="ej. Baño, Corte de pelo..." />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Duración estimada (min) <span className="text-muted-foreground font-normal text-xs">— solo informativo</span></Label>
              <Input
                type="number"
                min={1}
                {...register('duration_minutes')}
                placeholder="ej. 60"
              />
              {errors.duration_minutes && (
                <p className="text-destructive text-xs">{errors.duration_minutes.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input {...register('notes')} placeholder="Observaciones opcionales" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
