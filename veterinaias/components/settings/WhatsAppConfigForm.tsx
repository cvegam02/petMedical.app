'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface WhatsAppConfigFormProps {
  phoneNumberId: string | null
  hasToken: boolean
}

export function WhatsAppConfigForm({ phoneNumberId, hasToken }: WhatsAppConfigFormProps) {
  const [form, setForm] = useState({ phone_number_id: phoneNumberId ?? '', access_token: '' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success?: boolean; phone?: string; error?: string; detail?: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string> = { phone_number_id: form.phone_number_id }
      if (form.access_token) payload.access_token = form.access_token

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { whatsapp_config: payload } }),
      })
      if (!res.ok) throw new Error()
      toast.success('Configuración de WhatsApp guardada')
      setForm(f => ({ ...f, access_token: '' }))
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings/whatsapp/test')
      const json = await res.json()
      setTestResult(res.ok ? { success: true, phone: json.phone } : { error: json.error, detail: json.detail })
    } catch {
      setTestResult({ error: 'Error de red' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="text-sm font-semibold text-foreground">WhatsApp Business API</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Ingresa las credenciales de tu cuenta Meta Business para enviar mensajes por WhatsApp.
          Obtén el <strong>Phone Number ID</strong> y el <strong>Access Token</strong> desde{' '}
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Meta for Developers
          </a>.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Phone Number ID</label>
          <Input
            value={form.phone_number_id}
            onChange={e => setForm(f => ({ ...f, phone_number_id: e.target.value }))}
            placeholder="123456789012345"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Access Token{' '}
            {hasToken && !form.access_token && (
              <span className="text-xs font-normal text-muted-foreground">(guardado — deja en blanco para conservar)</span>
            )}
          </label>
          <Input
            type="password"
            value={form.access_token}
            onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))}
            placeholder={hasToken ? '••••••••••••' : 'EAABwzLixnjYBO...'}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={saving} size="sm">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          <button
            type="button"
            disabled={testing}
            onClick={handleTest}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            {testing && <Loader2 size={12} className="animate-spin" />}
            Probar conexión
          </button>
        </div>
      </form>

      {testResult && (
        <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${
          testResult.success
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-destructive/5 text-destructive border border-destructive/20'
        }`}>
          {testResult.success
            ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
            : <XCircle size={15} className="shrink-0 mt-0.5" />}
          <div>
            <p>{testResult.success ? `Conexión exitosa · ${testResult.phone}` : testResult.error}</p>
            {testResult.detail && <p className="text-xs opacity-70 mt-0.5">{testResult.detail}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
