'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ConfiguracionFormProps {
  confirmationReminderDays: number
  shareLinkExpiryDays: number
}

export function ConfiguracionForm({ confirmationReminderDays, shareLinkExpiryDays }: ConfiguracionFormProps) {
  const [form, setForm] = useState({
    confirmation_reminder_days: confirmationReminderDays,
    share_link_expiry_days: shareLinkExpiryDays,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: form }),
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
    <form onSubmit={handleSubmit} className="divide-y divide-border">

      {/* Anticipación */}
      <div className="flex items-start justify-between gap-8 py-5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Anticipación para confirmar citas</p>
          <p className="text-xs text-muted-foreground mt-0.5">Las citas dentro de este período aparecen en "Por confirmar".</p>
        </div>
        <select
          value={form.confirmation_reminder_days}
          onChange={e => setForm(f => ({ ...f, confirmation_reminder_days: Number(e.target.value) }))}
          className="w-44 shrink-0 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value={1}>1 día antes</option>
          <option value={2}>2 días antes</option>
          <option value={3}>3 días antes</option>
        </select>
      </div>

      {/* Expiración */}
      <div className="flex items-start justify-between gap-8 py-5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Expiración de links compartidos</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tiempo antes de que un link compartido deje de funcionar.</p>
        </div>
        <select
          value={form.share_link_expiry_days}
          onChange={e => setForm(f => ({ ...f, share_link_expiry_days: Number(e.target.value) }))}
          className="w-44 shrink-0 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value={3}>3 días</option>
          <option value={7}>7 días</option>
          <option value={14}>14 días</option>
          <option value={30}>30 días</option>
        </select>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-4 pb-2">
        <Button type="submit" disabled={saving} size="sm">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
