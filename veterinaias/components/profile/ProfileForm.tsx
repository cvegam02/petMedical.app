'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/ui/form-section'

interface ProfileFormProps {
  fullName: string
  phone: string | null
  professionalLicense: string | null
  professionalAddress: string | null
  licenseRequired?: boolean
}

export function ProfileForm({ fullName, phone, professionalLicense, professionalAddress, licenseRequired = false }: ProfileFormProps) {
  const [form, setForm] = useState({
    full_name: fullName,
    phone: phone ?? '',
    professional_license: professionalLicense ?? '',
    professional_address: professionalAddress ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (licenseRequired && !form.professional_license.trim()) {
      toast.error('La cédula profesional es obligatoria')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Error al guardar'); return }
      toast.success('Perfil actualizado')
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <FormSection title="Datos personales">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="full_name">Nombre completo <span className="text-destructive">*</span></Label>
              <Input id="full_name" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Ej. 33 1234 5678" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Datos profesionales">
          <p className="text-xs text-muted-foreground mb-3">Aparecen en las recetas que imprimas.</p>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="professional_license">
                Cédula profesional {licenseRequired && <span className="text-destructive">*</span>}
              </Label>
              <Input id="professional_license" value={form.professional_license}
                onChange={e => setForm(f => ({ ...f, professional_license: e.target.value }))} placeholder="Ej. 12345678" />
              {licenseRequired && (
                <p className="text-[11px] text-muted-foreground">
                  Obligatoria para los veterinarios: es la que se imprime en las recetas.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="professional_address">Dirección del consultorio</Label>
              <Input id="professional_address" value={form.professional_address}
                onChange={e => setForm(f => ({ ...f, professional_address: e.target.value }))} placeholder="Calle, número, colonia, ciudad" />
            </div>
          </div>
        </FormSection>

        <div className="px-5 py-4 bg-muted/30 flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
        </div>
      </div>
    </form>
  )
}
