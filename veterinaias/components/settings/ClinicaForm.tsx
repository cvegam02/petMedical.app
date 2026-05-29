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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {/* Logo */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Logo de la clínica</label>
        <p className="text-xs text-muted-foreground">Aparece en PDFs y documentos. PNG, JPG o WebP, máx. 2 MB.</p>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="relative w-16 h-16 rounded-xl border border-border bg-muted/30 overflow-hidden shrink-0">
              <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" unoptimized />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/20 flex items-center justify-center shrink-0">
              <Upload size={18} className="text-muted-foreground/40" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-50 text-left"
            >
              {uploading ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
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

      <div className="border-t border-border" />

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
        <Input value={form.phone} onChange={handlePhoneChange} placeholder="555 123 4567" />
      </div>
      <Button type="submit" disabled={saving} size="sm">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
