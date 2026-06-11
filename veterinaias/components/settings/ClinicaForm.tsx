'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import Image from 'next/image'

interface ClinicaFormProps {
  name: string
  address: string | null
  phone: string | null
  logoUrl: string | null
}

export function ClinicaForm({ name, address, phone, logoUrl: initialLogoUrl }: ClinicaFormProps) {
  const [form, setForm] = useState({ name, address: address ?? '', phone: phone ?? '' })
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function formatPhone(value: string) {
    // Only digits, limit to 10
    const digits = value.replace(/\D/g, '').slice(0, 10)

    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setForm(f => ({ ...f, phone: formatted }))
  }

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

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/settings/logo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setLogoUrl(json.logo_url)
      toast.success('Logo actualizado')
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al subir el logo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRemoveLogo() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { logo_url: null } }),
      })
      if (!res.ok) throw new Error()
      setLogoUrl(null)
      toast.success('Logo eliminado')
    } catch {
      toast.error('Error al eliminar logo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-border">

      {/* Logo */}
      <div className="flex items-start justify-between gap-8 py-5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Logo</p>
          <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG o WebP · máx. 2 MB · aparece en PDFs</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {logoUrl ? (
            <div className="relative w-12 h-12 rounded-lg border border-border bg-muted/30 overflow-hidden">
              <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" unoptimized />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg border-2 border-dashed border-border bg-muted/20 flex items-center justify-center">
              <Upload size={16} className="text-muted-foreground/40" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-50 text-left"
            >
              {uploading ? 'Subiendo...' : logoUrl ? 'Cambiar' : 'Subir'}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors text-left"
              >
                <X size={11} />
                Eliminar
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleLogoChange}
        />
      </div>

      {/* Nombre */}
      <div className="flex items-center justify-between gap-8 py-5">
        <label htmlFor="nombre" className="text-sm font-medium text-foreground flex-1 min-w-0">
          Nombre de la clínica
        </label>
        <Input
          id="nombre"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
          className="w-56 shrink-0"
        />
      </div>

      {/* Dirección */}
      <div className="flex items-center justify-between gap-8 py-5">
        <label htmlFor="direccion" className="text-sm font-medium text-foreground flex-1 min-w-0">
          Dirección
        </label>
        <Input
          id="direccion"
          value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          placeholder="Calle, número, ciudad"
          className="w-56 shrink-0"
        />
      </div>

      {/* Teléfono */}
      <div className="flex items-center justify-between gap-8 py-5">
        <label htmlFor="telefono" className="text-sm font-medium text-foreground flex-1 min-w-0">
          Teléfono de contacto
        </label>
        <Input
          id="telefono"
          value={form.phone}
          onChange={handlePhoneChange}
          placeholder="555 123 4567"
          className="w-56 shrink-0"
        />
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
