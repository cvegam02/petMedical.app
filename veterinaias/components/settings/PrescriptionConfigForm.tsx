'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PrescriptionConfigFormProps {
  footerNote: string | null
  validityDays: number | null
}

export function PrescriptionConfigForm({ footerNote, validityDays }: PrescriptionConfigFormProps) {
  const [form, setForm] = useState({
    prescription_footer_note: footerNote ?? '',
    prescription_validity_days: validityDays != null ? String(validityDays) : '',
  })
  const [saving, setSaving] = useState(false)

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
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="space-y-1">
        <Label htmlFor="footer_note">Nota de pie de página</Label>
        <Input
          id="footer_note"
          value={form.prescription_footer_note}
          onChange={e => setForm(f => ({ ...f, prescription_footer_note: e.target.value }))}
          placeholder="Ej. Conserve esta receta para su próxima visita"
        />
        <p className="text-xs text-muted-foreground">Aparece debajo de la leyenda obligatoria en la receta.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="validity_days">Vigencia de la receta (días)</Label>
        <Input
          id="validity_days"
          type="number"
          min={1}
          value={form.prescription_validity_days}
          onChange={e => setForm(f => ({ ...f, prescription_validity_days: e.target.value }))}
          placeholder="Ej. 30"
        />
        <p className="text-xs text-muted-foreground">Opcional. Si se define, la receta muestra "Vigencia: X días".</p>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  )
}
