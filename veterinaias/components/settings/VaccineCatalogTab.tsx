'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Pencil, Archive, AlertTriangle } from 'lucide-react'
import { vaccineCatalogSchema, type VaccineCatalogFormValues } from '@/lib/validations/catalog'
import type { VaccineCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function VaccineCatalogTab() {
  const [vaccines, setVaccines] = useState<VaccineCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VaccineCatalog | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VaccineCatalogFormValues>({
    resolver: zodResolver(vaccineCatalogSchema) as any,
    defaultValues: { stock_quantity: 0, low_stock_threshold: 5 },
  })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/catalog/vaccines')
    const json = await res.json()
    setVaccines(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    reset({ stock_quantity: 0, low_stock_threshold: 5 })
    setModalOpen(true)
  }

  function openEdit(v: VaccineCatalog) {
    setEditing(v)
    reset({
      name: v.name,
      manufacturer: v.manufacturer ?? undefined,
      lot_number: v.lot_number ?? undefined,
      stock_quantity: v.stock_quantity,
      low_stock_threshold: v.low_stock_threshold,
      notes: v.notes ?? undefined,
    })
    setModalOpen(true)
  }

  async function onSubmit(values: VaccineCatalogFormValues) {
    const url = editing ? `/api/catalog/vaccines/${editing.id}` : '/api/catalog/vaccines'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success(editing ? 'Vacuna actualizada' : 'Vacuna agregada')
    setModalOpen(false)
    load()
  }

  async function archive(id: string) {
    const res = await fetch(`/api/catalog/vaccines/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Error al archivar'); return }
    toast.success('Vacuna archivada')
    load()
  }

  const lowStockCount = vaccines.filter(v => v.active && v.stock_quantity <= v.low_stock_threshold).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Vacunas registradas</h3>
          {lowStockCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <AlertTriangle size={11} />
              {lowStockCount} con stock bajo
            </span>
          )}
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" />Agregar vacuna</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : vaccines.length === 0 ? (
        <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin vacunas en el catálogo</p>
          <p className="text-xs text-muted-foreground mt-1">Agrega las vacunas que usas en tu clínica.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Vacuna</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Laboratorio</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Lote</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Stock</th>
                <th className="text-right px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {vaccines.map(v => {
                const isLow = v.active && v.stock_quantity <= v.low_stock_threshold
                const isOut = v.active && v.stock_quantity === 0
                return (
                  <tr key={v.id} className={v.active ? '' : 'opacity-40'}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {v.name}
                      {!v.active && <span className="ml-2 text-xs text-muted-foreground">(archivada)</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.manufacturer ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{v.lot_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isOut ? 'bg-red-50 text-red-600 border border-red-200' :
                        isLow ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {(isOut || isLow) && <AlertTriangle size={10} />}
                        {v.stock_quantity} unidades
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {v.active && (
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Button size="sm" variant="ghost" onClick={() => openEdit(v)}><Pencil size={13} /></Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger>
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => archive(v.id)}><Archive size={13} /></Button>
                              </TooltipTrigger>
                              <TooltipContent>Archivar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar vacuna' : 'Agregar vacuna'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input {...register('name')} placeholder="ej. Rabia, Parvovirus..." />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Laboratorio</Label>
                <Input {...register('manufacturer')} placeholder="ej. Zoetis" />
              </div>
              <div className="space-y-1">
                <Label>Lote</Label>
                <Input {...register('lot_number')} placeholder="ej. B2024-01" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Stock actual</Label>
                <Input type="number" min={0} {...register('stock_quantity')} />
                {errors.stock_quantity && <p className="text-destructive text-xs">{errors.stock_quantity.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Alerta stock bajo</Label>
                <Input type="number" min={1} {...register('low_stock_threshold')} />
                {errors.low_stock_threshold && <p className="text-destructive text-xs">{errors.low_stock_threshold.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input {...register('notes')} placeholder="Observaciones opcionales" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
