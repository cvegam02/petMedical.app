'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PrescriptionConfigFormProps {
  footerNote: string | null
  validityDays: number | null
}

function buildPreviewUrl(footer: string, validity: string, bust: boolean) {
  const params = new URLSearchParams()
  params.set('footer', footer)
  params.set('validity', validity)
  if (bust) params.set('_t', Date.now().toString())
  return `/api/settings/prescription-preview/pdf?${params.toString()}`
}

export function PrescriptionConfigForm({ footerNote, validityDays }: PrescriptionConfigFormProps) {
  const [form, setForm] = useState({
    prescription_footer_note: footerNote ?? '',
    prescription_validity_days: validityDays != null ? String(validityDays) : '',
  })
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(() =>
    buildPreviewUrl(footerNote ?? '', validityDays != null ? String(validityDays) : '', false),
  )

  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewUrl(buildPreviewUrl(form.prescription_footer_note, form.prescription_validity_days, true))
    }, 600)
    return () => clearTimeout(t)
  }, [form.prescription_footer_note, form.prescription_validity_days])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const days = form.prescription_validity_days.trim()
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            prescription_footer_note: form.prescription_footer_note.trim() || null,
            prescription_validity_days: days === '' ? null : Number(days),
          },
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Configuración guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="divide-y divide-border">

        {/* Nota de pie */}
        <div className="flex items-start justify-between gap-8 py-5">
          <div className="flex-1 min-w-0">
            <label htmlFor="footer_note" className="text-sm font-medium text-foreground">Nota de pie de página</label>
            <p className="text-xs text-muted-foreground mt-0.5">Aparece debajo de la leyenda obligatoria en la receta.</p>
          </div>
          <Input
            id="footer_note"
            value={form.prescription_footer_note}
            onChange={e => setForm(f => ({ ...f, prescription_footer_note: e.target.value }))}
            placeholder="Ej. Conserve esta receta..."
            className="w-64 shrink-0"
          />
        </div>

        {/* Vigencia */}
        <div className="flex items-start justify-between gap-8 py-5">
          <div className="flex-1 min-w-0">
            <label htmlFor="validity_days" className="text-sm font-medium text-foreground">Vigencia (días)</label>
            <p className="text-xs text-muted-foreground mt-0.5">Opcional. Si se define, la receta muestra "Vigencia: X días".</p>
          </div>
          <Input
            id="validity_days"
            type="number"
            min={1}
            value={form.prescription_validity_days}
            onChange={e => setForm(f => ({ ...f, prescription_validity_days: e.target.value }))}
            placeholder="30"
            className="w-64 shrink-0"
          />
        </div>

        {/* Save */}
        <div className="flex justify-end pt-4 pb-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>

      {/* Vista previa */}
      <div>
        <Label>Vista previa</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
          Documento de muestra con los datos de tu clínica, en tamaño carta.
        </p>
        <div className="w-full max-w-[640px] aspect-[8.5/11] border border-border rounded-lg overflow-hidden bg-white shadow-sm">
          <iframe src={previewUrl} className="w-full h-full" title="Vista previa de receta" />
        </div>
      </div>
    </div>
  )
}
