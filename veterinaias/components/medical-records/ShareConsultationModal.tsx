'use client'
import { useState } from 'react'
import { Share2, MessageCircle, X, Loader2, CheckCircle2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ShareConsultationModalProps {
  recordId: string
  ownerPhone: string | null
  petName: string
}

export function ShareConsultationModal({ recordId, ownerPhone, petName }: ShareConsultationModalProps) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState(ownerPhone ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ waUrl?: string; shareUrl?: string; error?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/whatsapp/send-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: recordId, phone, pet_name: petName }),
      })
      const json = await res.json()
      if (res.ok) {
        setResult({ waUrl: json.wa_url, shareUrl: json.share_url })
      } else {
        setResult({ error: json.error })
      }
    } catch {
      setResult({ error: 'Error de red' })
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!result?.shareUrl) return
    await navigator.clipboard.writeText(result.shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function close() { setOpen(false); setResult(null); setCopied(false) }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
        <Share2 size={14} />
        Compartir
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
              <MessageCircle size={14} className="text-green-700" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Compartir por WhatsApp</h3>
          </div>
          <button onClick={close} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {!result?.waUrl ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Se generará un link del resumen de la consulta de <strong>{petName}</strong> para enviar por WhatsApp.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Número de WhatsApp</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 55 1234 5678" />
              <p className="text-[10px] text-muted-foreground">Incluir código de país. Ej: +52 para México.</p>
            </div>

            {result?.error && (
              <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                {result.error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleGenerate}
                disabled={loading || !phone.trim()}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
              >
                {loading ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <MessageCircle size={13} className="mr-1.5" />}
                {loading ? 'Generando...' : 'Generar link'}
              </Button>
              <Button variant="outline" size="sm" onClick={close}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={16} />
              <p className="text-sm font-medium">Link generado</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Haz clic en &quot;Abrir WhatsApp&quot; — se abrirá con el mensaje listo para enviar a {phone}.
            </p>
            <div className="flex gap-2">
              <a
                href={result.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: 'sm' }), 'flex-1 bg-green-600 hover:bg-green-700 text-white border-0 gap-1.5')}
              >
                <MessageCircle size={13} />
                Abrir WhatsApp
              </a>
              <button
                onClick={copyLink}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={close}>Cerrar</Button>
          </div>
        )}
      </div>
    </div>
  )
}
