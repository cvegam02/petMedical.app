'use client'
import { useState } from 'react'
import { Share2, MessageCircle, Loader2, CheckCircle2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ShareConsultationModalProps {
  recordId: string
  ownerPhone: string | null
  petName: string
}

export function ShareConsultationModal({ recordId, ownerPhone, petName }: ShareConsultationModalProps) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState(ownerPhone ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ shareUrl?: string; error?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value))
  }

  async function handleSend() {
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
        setResult({ shareUrl: json.share_url })
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

  return (
    <>
      <button onClick={() => setOpen(true)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
        <Share2 size={14} />
        Compartir
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) close() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageCircle size={14} className="text-green-700" />
              </div>
              Compartir por WhatsApp
            </DialogTitle>
          </DialogHeader>

          {!result?.shareUrl ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Se enviará el resumen de la consulta de <strong>{petName}</strong> directamente por WhatsApp.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Número de WhatsApp</label>
                <Input value={phone} onChange={handlePhoneChange} placeholder="555 123 4567" />
                <p className="text-[10px] text-muted-foreground">Número a 10 dígitos, México.</p>
              </div>

              {result?.error && (
                <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                  {result.error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSend}
                  disabled={loading || !phone.trim()}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  {loading ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <MessageCircle size={13} className="mr-1.5" />}
                  {loading ? 'Enviando…' : 'Enviar por WhatsApp'}
                </Button>
                <Button variant="outline" size="sm" onClick={close}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 size={16} />
                <p className="text-sm font-medium">Mensaje enviado</p>
              </div>
              <p className="text-xs text-muted-foreground">
                El resumen fue enviado a <strong>{phone}</strong> por WhatsApp. También puedes copiar el link para compartirlo por otro medio.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 gap-1.5')}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copiado' : 'Copiar link'}
                </button>
                <Button variant="ghost" size="sm" onClick={close}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
