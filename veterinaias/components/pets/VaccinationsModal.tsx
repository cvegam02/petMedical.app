'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, Syringe, AlertTriangle } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { PetVaccination, VaccineCatalog } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FreeTextCombobox } from '@/components/ui/free-text-combobox'

const TODAY = new Date().toISOString().split('T')[0]

const vaccinationFormSchema = z.object({
  vaccine_name: z.string().min(1, 'Nombre requerido'),
  vaccine_catalog_id: z.string().uuid().optional(),
  lot_number: z.string().optional(),
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_due_date: z.preprocess(v => v === '' ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  notes: z.string().optional(),
})
type VaccinationFormValues = z.infer<typeof vaccinationFormSchema>

interface VaccinationWithProfile extends PetVaccination {
  applied_by_profile?: { full_name: string } | null
  tenant?: { name: string } | null
}

interface VaccinationsModalProps {
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

export function VaccinationsModal({ petId, open, onOpenChange }: VaccinationsModalProps) {
  const [vaccinations, setVaccinations] = useState<VaccinationWithProfile[]>([])
  const [catalogVaccines, setCatalogVaccines] = useState<VaccineCatalog[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isHistorical, setIsHistorical] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<VaccinationFormValues>({
    resolver: zodResolver(vaccinationFormSchema) as any,
    defaultValues: { application_date: TODAY },
  })

  async function loadVaccinations() {
    setLoading(true)
    const res = await fetch(`/api/pets/${petId}/vaccinations`)
    const json = await res.json()
    setVaccinations(json.data ?? [])
    setLoading(false)
  }

  async function loadCatalog() {
    const res = await fetch('/api/catalog/vaccines')
    const json = await res.json()
    setCatalogVaccines((json.data ?? []).filter((v: VaccineCatalog) => v.active))
  }

  useEffect(() => {
    if (open) { loadVaccinations(); loadCatalog() }
  }, [open, petId])

  const catalogNames = catalogVaccines.map(v => v.name)

  function onVaccineNameChange(name: string | undefined) {
    setValue('vaccine_name', name ?? '')
    const matched = catalogVaccines.find(v => v.name === name)
    if (matched) {
      setValue('vaccine_catalog_id', matched.id)
      setValue('lot_number', matched.lot_number ?? '')
    } else {
      setValue('vaccine_catalog_id', undefined)
    }
  }

  async function onSubmit(values: VaccinationFormValues) {
    const res = await fetch(`/api/pets/${petId}/vaccinations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
    toast.success('Vacunación registrada')
    setAddOpen(false)
    setIsHistorical(false)
    reset({ application_date: TODAY })
    loadVaccinations()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2"><Syringe size={16} />Historial de Vacunas</DialogTitle>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mr-6"><Plus size={14} className="mr-1" />Agregar</Button>
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>
        ) : vaccinations.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
            <p className="text-sm font-medium text-foreground">Sin vacunas registradas</p>
            <p className="text-xs text-muted-foreground mt-1">Agrega las vacunas previas o aplícalas durante una consulta.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Vacuna</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Aplicada</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Próxima</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Lote</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {vaccinations.map(v => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{v.vaccine_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.application_date}</td>
                    <td className="px-4 py-3">{v.next_due_date ? dueBadge(v.next_due_date) : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{v.lot_number ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {v.applied_by_profile?.full_name ?? '—'}
                      {v.tenant?.name ? <span className="block text-muted-foreground/60">{v.tenant.name}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={addOpen} onOpenChange={open => { if (!open) setIsHistorical(false); setAddOpen(open) }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar vacuna</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

              {/* Tipo de registro */}
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setIsHistorical(false)}
                  className={`flex-1 px-3 py-2 font-medium transition-colors ${
                    !isHistorical ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  Vacuna nueva
                </button>
                <button
                  type="button"
                  onClick={() => { setIsHistorical(true); setValue('next_due_date', undefined) }}
                  className={`flex-1 px-3 py-2 font-medium transition-colors border-l border-border ${
                    isHistorical ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  Registro de carnet
                </button>
              </div>
              {isHistorical && (
                <p className="text-xs text-muted-foreground -mt-2">
                  Solo registra la fecha en que se aplicó. No se asigna próxima fecha.
                </p>
              )}

              <div className="space-y-1">
                <Label>Vacuna <span className="text-destructive">*</span></Label>
                <FreeTextCombobox
                  value={watch('vaccine_name')}
                  onChange={v => onVaccineNameChange(v)}
                  options={catalogNames}
                  placeholder="Selecciona del catálogo o escribe..."
                />
              </div>
              <div className="space-y-1">
                <Label>Lote</Label>
                <Input {...register('lot_number')} placeholder="Se pre-llena si seleccionas del catálogo" />
              </div>
              <div className={isHistorical ? '' : 'grid grid-cols-2 gap-3'}>
                <div className="space-y-1">
                  <Label>Fecha de aplicación <span className="text-destructive">*</span></Label>
                  <Input type="date" {...register('application_date')} />
                </div>
                {!isHistorical && (
                  <div className="space-y-1">
                    <Label>Próxima fecha</Label>
                    <Input type="date" {...register('next_due_date')} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Input {...register('notes')} placeholder="Reacción, observaciones..." />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsHistorical(false); setAddOpen(false) }}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
