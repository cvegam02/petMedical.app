'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface ClinicaFormProps {
  name: string
  address: string | null
  phone: string | null
}

export function ClinicaForm({ name, address, phone }: ClinicaFormProps) {
  const [form, setForm] = useState({ name, address: address ?? '', phone: phone ?? '' })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          settings: { address: form.address || null, phone: form.phone || null },
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Datos guardados')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Nombre de la clínica</label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Dirección</label>
        <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Calle, número, ciudad" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Teléfono de contacto</label>
        <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+52 55 1234 5678" />
      </div>
      <Button type="submit" disabled={saving} size="sm">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
