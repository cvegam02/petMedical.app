'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, AlertTriangle, Bug } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { PetDeworming } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DateInput } from '@/components/ui/date-input'

const TODAY = new Date().toISOString().split('T')[0]

const dewormingFormSchema = z.object({
  product_name: z.string().min(1, 'Nombre del producto requerido'),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
})
type DewormingFormValues = z.infer<typeof dewormingFormSchema>

interface DewormingWithProfile extends PetDeworming {
  applied_by_profile?: { full_name: string } | null
  tenant?: { name: string } | null
}

interface DewormingsModalProps {
  petId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function dueBadge(nextDate: string | null) {
  if (!nextDate) return null
  const diffDays = Math.ceil((new Date(nextDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} />Vencida</span>
  if (diffDays <= 30) return <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Próxima en {diffDays}d</span>
  return <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Vigente</span>
}

export function DewormingsModal({ petId, open, onOpenChange }: DewormingsModalProps) {
  const [dewormings, setDewormings] = useState<DewormingWithProfile[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<DewormingFormValues>({
    resolver: zodResolver(dewormingFormSchema) as any,
    defaultValues: { application_date: TODAY },
  })

  async function loadDewormings() {
    setLoading(true)
    const res = await fetch(`/api/pets/${petId}/dewormings`)
    const json = await res.json()
    setDewormings(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (open) loadDewormings()
  }, [open, petId])

  async function onSubmit(values: DewormingFormValues) {
    const res = await fetch(`/api/pets/${petId}/dewormings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success('Desparasitación registrada')
    setAddOpen(false)
    reset({ application_date: TODAY })
    loadDewormings()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2"><Bug size={16} />Historial de Desparasitaciones</DialogTitle>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mr-6"><Plus size={14} className="mr-1" />Agregar</Button>
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>
        ) : dewormings.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
            <p className="text-sm font-medium text-foreground">Sin desparasitaciones registradas</p>
            <p className="text-xs text-muted-foreground mt-1">Agrega el historial o regístralas durante una consulta.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Producto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Aplicada</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Próxima</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {dewormings.map(d => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{d.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.application_date}</td>
                    <td className="px-4 py-3">{d.next_due_date ? dueBadge(d.next_due_date) : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {d.applied_by_profile?.full_name ?? '—'}
                      {d.tenant?.name ? <span className="block text-muted-foreground/60">{d.tenant.name}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar desparasitación</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Producto <span className="text-destructive">*</span></Label>
                <Input {...register('product_name')} placeholder="ej. Bravecto, NexGard, Revolution..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha de aplicación <span className="text-destructive">*</span></Label>
                  <DateInput value={watch('application_date')} onChange={v => setValue('application_date', v ?? '')} />
                </div>
                <div className="space-y-1">
                  <Label>Próxima fecha</Label>
                  <DateInput value={watch('next_due_date')} onChange={v => setValue('next_due_date', v ?? undefined)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Input {...register('notes')} placeholder="Observaciones..." />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
