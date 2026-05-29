'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import Image from 'next/image'

type SessionStatus = 'NOT_CREATED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'STOPPED'

interface WhatsAppConfigFormProps {
  initialStatus: SessionStatus
  initialQr: string | null
  initialPhone: string | null
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  NOT_CREATED: 'No conectado',
  STARTING: 'Iniciando…',
  SCAN_QR_CODE: 'Escanea el QR',
  WORKING: 'Conectado',
  FAILED: 'Error',
  STOPPED: 'Detenido',
}

const STATUS_COLORS: Record<SessionStatus, string> = {
  NOT_CREATED: 'text-muted-foreground',
  STARTING: 'text-amber-600',
  SCAN_QR_CODE: 'text-blue-600',
  WORKING: 'text-green-700',
  FAILED: 'text-destructive',
  STOPPED: 'text-muted-foreground',
}

export function WhatsAppConfigForm({ initialStatus, initialQr, initialPhone }: WhatsAppConfigFormProps) {
  const [status, setStatus] = useState<SessionStatus>(initialStatus)
  const [qr, setQr] = useState<string | null>(initialQr)
  const [phone, setPhone] = useState<string | null>(initialPhone)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const shouldPoll = status === 'STARTING' || status === 'SCAN_QR_CODE'

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/whatsapp/session', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setStatus(data.status)
      setQr(data.qr ?? null)
      setPhone(data.phone ?? null)
    } catch {
      // ignore network errors during polling
    }
  }, [])

  useEffect(() => {
    if (!shouldPoll) return
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [shouldPoll, fetchStatus])

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/settings/whatsapp/session', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al crear sesión')
        return
      }
      setStatus(data.status)
      setQr(data.qr ?? null)
      setPhone(null)
    } catch {
      toast.error('Error de red')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/settings/whatsapp/session', { method: 'DELETE' })
      if (!res.ok) { toast.error('Error al desconectar'); return }
      setStatus('NOT_CREATED')
      setQr(null)
      setPhone(null)
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Error de red')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <h3 className="text-sm font-semibold text-foreground">WhatsApp Business</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Conecta el número de WhatsApp de tu clínica para enviar resúmenes de consulta directamente desde el sistema.
        </p>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        {status === 'WORKING'
          ? <Wifi size={14} className="text-green-700" />
          : <WifiOff size={14} className="text-muted-foreground" />}
        <span className={`text-sm font-medium ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
          {(status === 'STARTING') && <Loader2 size={12} className="inline ml-1.5 animate-spin" />}
        </span>
        {phone && status === 'WORKING' && (
          <span className="text-xs text-muted-foreground">· +{phone}</span>
        )}
      </div>

      {/* QR code */}
      {status === 'SCAN_QR_CODE' && qr && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Abre WhatsApp en tu teléfono → <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong> → escanea este código.
          </p>
          <div className="w-48 h-48 border border-border rounded-xl overflow-hidden bg-white p-2">
            <Image src={qr} alt="WhatsApp QR" width={176} height={176} unoptimized className="w-full h-full object-contain" />
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            Actualizando automáticamente…
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {status !== 'WORKING' && (
          <Button size="sm" onClick={handleConnect} disabled={connecting || status === 'STARTING'}>
            {connecting || status === 'STARTING'
              ? <><Loader2 size={13} className="animate-spin mr-1.5" />Iniciando…</>
              : status === 'SCAN_QR_CODE'
                ? <><RefreshCw size={13} className="mr-1.5" />Nuevo QR</>
                : 'Conectar WhatsApp'}
          </Button>
        )}
        {(status === 'WORKING' || status === 'SCAN_QR_CODE' || status === 'STOPPED') && (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-destructive hover:text-destructive')}
          >
            {disconnecting ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
            Desconectar
          </button>
        )}
      </div>

      {status === 'FAILED' && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5">
          <XCircle size={15} className="shrink-0 mt-0.5" />
          <p>La sesión falló. Haz clic en Conectar para reintentar.</p>
        </div>
      )}

      {status === 'WORKING' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
          <CheckCircle2 size={15} className="shrink-0" />
          <p>WhatsApp conectado. Los mensajes se enviarán automáticamente.</p>
        </div>
      )}
    </div>
  )
}
