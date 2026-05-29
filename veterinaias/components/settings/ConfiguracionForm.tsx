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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Anticipación para confirmar citas</label>
        <p className="text-xs text-muted-foreground">Las citas dentro de este período aparecen en "Por confirmar".</p>
        <select
          value={form.confirmation_reminder_days}
          onChange={e => setForm(f => ({ ...f, confirmation_reminder_days: Number(e.target.value) }))}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value={1}>1 día antes</option>
          <option value={2}>2 días antes</option>
          <option value={3}>3 días antes</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Expiración de links compartidos</label>
        <p className="text-xs text-muted-foreground">Tiempo antes de que un link compartido deje de funcionar.</p>
        <select
          value={form.share_link_expiry_days}
          onChange={e => setForm(f => ({ ...f, share_link_expiry_days: Number(e.target.value) }))}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value={3}>3 días</option>
          <option value={7}>7 días</option>
          <option value={14}>14 días</option>
          <option value={30}>30 días</option>
        </select>
      </div>
      <Button type="submit" disabled={saving} size="sm">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
