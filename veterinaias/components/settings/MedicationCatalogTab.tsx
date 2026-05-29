'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Pencil, Archive } from 'lucide-react'
import { medicationCatalogSchema, type MedicationCatalogFormValues } from '@/lib/validations/catalog'
import type { MedicationCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ROUTE_OPTIONS = ['Oral', 'IV', 'IM', 'SC', 'Tópica', 'Oftálmica', 'Ótica']

export function MedicationCatalogTab() {
  const [medications, setMedications] = useState<MedicationCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MedicationCatalog | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MedicationCatalogFormValues>({
    resolver: zodResolver(medicationCatalogSchema) as any,
  })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/catalog/medications')
    const json = await res.json()
    setMedications(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    reset({})
    setModalOpen(true)
  }

  function openEdit(m: MedicationCatalog) {
    setEditing(m)
    reset({
      name: m.name,
      active_ingredient: m.active_ingredient ?? undefined,
      description: m.description ?? undefined,
      dose_per_kg: m.dose_per_kg ?? undefined,
      dose_unit: m.dose_unit ?? undefined,
      concentration: m.concentration ?? undefined,
      default_route: m.default_route ?? undefined,
      notes: m.notes ?? undefined,
    })
    setModalOpen(true)
  }

  async function onSubmit(values: MedicationCatalogFormValues) {
    const url = editing ? `/api/catalog/medications/${editing.id}` : '/api/catalog/medications'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success(editing ? 'Medicamento actualizado' : 'Medicamento agregado')
    setModalOpen(false)
    load()
  }

  async function archive(id: string) {
    const res = await fetch(`/api/catalog/medications/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Error al archivar'); return }
    toast.success('Medicamento archivado')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Medicamentos registrados</h3>
        <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" />Agregar medicamento</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : medications.length === 0 ? (
        <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="text-sm font-medium text-foreground">Sin medicamentos en el catálogo</p>
          <p className="text-xs text-muted-foreground mt-1">Agrega los medicamentos que recetas habitualmente.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Medicamento</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Principio activo</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Dosis</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Vía</th>
                <th className="text-right px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {medications.map(m => (
                <tr key={m.id} className={m.active ? '' : 'opacity-40'}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {m.name}
                    {!m.active && <span className="ml-2 text-xs text-muted-foreground">(archivado)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{m.active_ingredient ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {m.dose_per_kg ? `${m.dose_per_kg} ${m.dose_unit ?? ''}/kg` : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{m.default_route ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {m.active && (
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil size={13} /></Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => archive(m.id)}><Archive size={13} /></Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar medicamento' : 'Agregar medicamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre comercial <span className="text-destructive">*</span></Label>
                <Input {...register('name')} placeholder="ej. Amoxil" />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Principio activo</Label>
                <Input {...register('active_ingredient')} placeholder="ej. Amoxicilina trihidratada" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción / presentación</Label>
              <Input {...register('description')} placeholder="ej. Suspensión oral 250mg/5ml" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Dosis por kg</Label>
                <Input type="number" step="0.01" {...register('dose_per_kg')} placeholder="ej. 10" />
                {errors.dose_per_kg && <p className="text-destructive text-xs">{errors.dose_per_kg.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Unidad</Label>
                <Input {...register('dose_unit')} placeholder="mg, ml, UI..." />
              </div>
              <div className="space-y-1">
                <Label>Concentración</Label>
                <Input {...register('concentration')} placeholder="ej. 500mg/ml" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Vía de administración</Label>
              <Input {...register('default_route')} list="route-options" placeholder="ej. Oral" />
              <datalist id="route-options">
                {ROUTE_OPTIONS.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input {...register('notes')} placeholder="Contraindicaciones, precauciones..." />
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
