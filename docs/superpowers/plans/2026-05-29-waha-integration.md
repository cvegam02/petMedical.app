# WAHA WhatsApp Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el enfoque wa.me (el usuario abre WhatsApp manualmente) con WAHA API self-hosted, que envía los mensajes directamente desde el servidor al número del dueño.

**Architecture:** Un servidor WAHA compartido para toda la plataforma, configurado via env vars (`WAHA_URL`, `WAHA_API_KEY`). Cada tenant tiene su propia sesión de WhatsApp nombrada `waha_{tenantId}`. El admin de cada clínica escanea el QR en Settings → Integraciones para vincular su número de WhatsApp Business. Al compartir una consulta, el backend llama a WAHA `sendText` directamente sin abrir ningún navegador.

**Tech Stack:** Next.js 15 App Router, WAHA (WhatsApp HTTP API — docker image `devlikeapro/waha`), Supabase Auth para permisos.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `docker-compose.yml` (raíz del repo) | Crear | Servicio WAHA self-hosted |
| `veterinaias/.env.example` | Modificar | Agregar `WAHA_URL`, `WAHA_API_KEY` |
| `veterinaias/lib/waha.ts` | Crear | Helper: wraps WAHA HTTP API |
| `veterinaias/app/api/settings/whatsapp/session/route.ts` | Crear | GET status+QR, POST crear/reiniciar, DELETE desconectar |
| `veterinaias/app/api/settings/whatsapp/test/route.ts` | Reemplazar | Delega a WAHA session status (elimina llamada a Meta Graph API) |
| `veterinaias/components/settings/WhatsAppConfigForm.tsx` | Reescribir | UI: estado de sesión + QR + polling + conectar/desconectar |
| `veterinaias/app/dashboard/settings/integraciones/page.tsx` | Modificar | Obtiene session status server-side, pasa props al form |
| `veterinaias/app/api/whatsapp/send-consultation/route.ts` | Modificar | Llama WAHA `sendText` en lugar de generar wa.me link |
| `veterinaias/components/medical-records/ShareConsultationModal.tsx` | Modificar | Muestra "Enviado" en lugar de botón "Abrir WhatsApp" |

---

## Task 1: Docker Compose para WAHA

**Files:**
- Create: `docker-compose.yml` (en `/home/cvega/Documentos/Projects/VeterinaIAs/`, raíz del repositorio)

- [ ] **Step 1: Crear `docker-compose.yml`**

```yaml
services:
  waha:
    image: devlikeapro/waha
    container_name: waha
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      WHATSAPP_API_KEY: "cambia-esto-por-una-clave-segura"
      WHATSAPP_HOOK_URL: ""
    volumes:
      - waha_sessions:/app/.sessions

volumes:
  waha_sessions:
```

- [ ] **Step 2: Levantar WAHA y verificar**

```bash
cd /home/cvega/Documentos/Projects/VeterinaIAs
docker compose up -d
# Esperar ~10 segundos, luego:
curl http://localhost:3000/api/sessions
# Debe responder: []
```

- [ ] **Step 3: Agregar variables de entorno a `.env.example` y `.env.local`**

En `veterinaias/.env.example`, agregar al final:
```
# WAHA (WhatsApp HTTP API)
WAHA_URL=http://localhost:3000
WAHA_API_KEY=cambia-esto-por-una-clave-segura
```

En `veterinaias/.env.local`, agregar los mismos valores reales.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml veterinaias/.env.example
git commit -m "chore: add WAHA docker-compose and env vars"
```

---

## Task 2: Lib helper `lib/waha.ts`

**Files:**
- Create: `veterinaias/lib/waha.ts`

Este módulo encapsula todas las llamadas HTTP a WAHA. Ningún otro archivo hace `fetch` a WAHA directamente.

- [ ] **Step 1: Crear `veterinaias/lib/waha.ts`**

```typescript
const WAHA_URL = process.env.WAHA_URL ?? 'http://localhost:3000'
const WAHA_API_KEY = process.env.WAHA_API_KEY ?? ''

export type WahaSessionStatus =
  | 'STARTING'
  | 'SCAN_QR_CODE'
  | 'WORKING'
  | 'FAILED'
  | 'STOPPED'

export interface WahaSession {
  name: string
  status: WahaSessionStatus
  me?: { id: { user: string; server: string }; pushName: string } | null
}

export interface WahaQR {
  value: string   // base64 PNG sin prefijo data:
  mimeType: string
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': WAHA_API_KEY,
  }
}

export async function wahaGetSession(sessionName: string): Promise<WahaSession | null> {
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions/${sessionName}`, {
      headers: headers(),
      cache: 'no-store',
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function wahaCreateSession(sessionName: string): Promise<WahaSession | null> {
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: sessionName }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function wahaRestartSession(sessionName: string): Promise<boolean> {
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions/${sessionName}/restart`, {
      method: 'POST',
      headers: headers(),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function wahaDeleteSession(sessionName: string): Promise<boolean> {
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions/${sessionName}`, {
      method: 'DELETE',
      headers: headers(),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function wahaGetQR(sessionName: string): Promise<WahaQR | null> {
  try {
    const res = await fetch(`${WAHA_URL}/api/${sessionName}/auth/qr`, {
      headers: headers(),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function wahaSendText(sessionName: string, phone: string, text: string): Promise<boolean> {
  // phone debe ser 10 dígitos México → formatear como 52{phone}@c.us
  const digits = phone.replace(/\D/g, '')
  const chatId = `52${digits}@c.us`
  try {
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ chatId, text, session: sessionName }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function wahaSessionName(tenantId: string): string {
  // WAHA no acepta guiones en session names en algunas versiones
  return `waha_${tenantId.replace(/-/g, '_')}`
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/lib/waha.ts
git commit -m "feat: WAHA helper lib"
```

---

## Task 3: API route `/api/settings/whatsapp/session`

**Files:**
- Create: `veterinaias/app/api/settings/whatsapp/session/route.ts`

Esta ruta es el proxy entre el frontend y WAHA para gestionar la sesión del tenant. Solo accesible para admins del tenant.

- [ ] **Step 1: Crear `veterinaias/app/api/settings/whatsapp/session/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  wahaSessionName,
  wahaGetSession,
  wahaCreateSession,
  wahaRestartSession,
  wahaDeleteSession,
  wahaGetQR,
} from '@/lib/waha'

async function getAdminTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') return null
  return (profile as any)?.tenant_id ?? null
}

// GET — devuelve status + QR (si aplica)
export async function GET() {
  const tenantId = await getAdminTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sessionName = wahaSessionName(tenantId)
  const session = await wahaGetSession(sessionName)

  if (!session) {
    return NextResponse.json({ status: 'NOT_CREATED', qr: null, phone: null })
  }

  let qr: string | null = null
  if (session.status === 'SCAN_QR_CODE') {
    const qrData = await wahaGetQR(sessionName)
    if (qrData) {
      qr = `data:${qrData.mimeType};base64,${qrData.value}`
    }
  }

  const phone = session.me?.id?.user ?? null

  return NextResponse.json({ status: session.status, qr, phone })
}

// POST — crea o reinicia la sesión
export async function POST(_req: NextRequest) {
  const tenantId = await getAdminTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sessionName = wahaSessionName(tenantId)
  const existing = await wahaGetSession(sessionName)

  if (existing) {
    const ok = await wahaRestartSession(sessionName)
    if (!ok) return NextResponse.json({ error: 'No se pudo reiniciar la sesión' }, { status: 500 })
  } else {
    const created = await wahaCreateSession(sessionName)
    if (!created) return NextResponse.json({ error: 'No se pudo crear la sesión' }, { status: 500 })
  }

  // Esperar brevemente y devolver el estado actual
  await new Promise(r => setTimeout(r, 1500))
  const session = await wahaGetSession(sessionName)

  let qr: string | null = null
  if (session?.status === 'SCAN_QR_CODE') {
    const qrData = await wahaGetQR(sessionName)
    if (qrData) qr = `data:${qrData.mimeType};base64,${qrData.value}`
  }

  return NextResponse.json({ status: session?.status ?? 'STARTING', qr, phone: null })
}

// DELETE — desconecta y elimina la sesión
export async function DELETE() {
  const tenantId = await getAdminTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sessionName = wahaSessionName(tenantId)
  await wahaDeleteSession(sessionName)
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/app/api/settings/whatsapp/session/route.ts
git commit -m "feat: WAHA session API route (GET/POST/DELETE)"
```

---

## Task 4: Reemplazar ruta de test `/api/settings/whatsapp/test`

**Files:**
- Modify: `veterinaias/app/api/settings/whatsapp/test/route.ts`

Actualmente llama a Meta Graph API. Reemplazar para que llame a WAHA y verifique que el servidor está vivo y la sesión del tenant existe.

- [ ] **Step 1: Reemplazar contenido de `veterinaias/app/api/settings/whatsapp/test/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { wahaSessionName, wahaGetSession } from '@/lib/waha'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = (profile as any)?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  const sessionName = wahaSessionName(tenantId)
  const session = await wahaGetSession(sessionName)

  if (!session) {
    return NextResponse.json({ error: 'Sesión no encontrada. Ve a Integraciones → Conectar.' }, { status: 400 })
  }

  if (session.status !== 'WORKING') {
    return NextResponse.json({
      error: `Sesión en estado ${session.status}. Escanea el QR para conectar.`,
    }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    phone: session.me?.id?.user ?? 'Número conectado',
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/app/api/settings/whatsapp/test/route.ts
git commit -m "feat: update WhatsApp test route to use WAHA"
```

---

## Task 5: Reescribir `WhatsAppConfigForm.tsx`

**Files:**
- Modify: `veterinaias/components/settings/WhatsAppConfigForm.tsx`

Eliminar completamente la UI de Phone Number ID / Access Token de Meta. Reemplazar con:
- Badge de estado de sesión (NOT_CREATED / STARTING / SCAN_QR_CODE / WORKING / FAILED)
- QR code cuando está en SCAN_QR_CODE
- Teléfono conectado cuando está en WORKING
- Botón Conectar (crea/reinicia sesión)
- Botón Desconectar (elimina sesión)
- Polling automático cada 3s cuando status es STARTING o SCAN_QR_CODE

- [ ] **Step 1: Reemplazar `veterinaias/components/settings/WhatsAppConfigForm.tsx`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/settings/WhatsAppConfigForm.tsx
git commit -m "feat: rewrite WhatsAppConfigForm for WAHA session management"
```

---

## Task 6: Actualizar página de Integraciones

**Files:**
- Modify: `veterinaias/app/dashboard/settings/integraciones/page.tsx`

La página ahora obtiene el estado inicial de la sesión WAHA server-side para evitar flash de "NOT_CREATED" al cargar.

- [ ] **Step 1: Reemplazar `veterinaias/app/dashboard/settings/integraciones/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { WhatsAppConfigForm } from '@/components/settings/WhatsAppConfigForm'
import { wahaSessionName, wahaGetSession, wahaGetQR } from '@/lib/waha'

export default async function SettingsIntegracionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single() as any

  const tenantId = profile?.tenant_id ?? null

  let initialStatus: 'NOT_CREATED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'STOPPED' = 'NOT_CREATED'
  let initialQr: string | null = null
  let initialPhone: string | null = null

  if (tenantId) {
    const sessionName = wahaSessionName(tenantId)
    const session = await wahaGetSession(sessionName)

    if (session) {
      initialStatus = session.status as typeof initialStatus
      initialPhone = session.me?.id?.user ?? null

      if (session.status === 'SCAN_QR_CODE') {
        const qrData = await wahaGetQR(sessionName)
        if (qrData) {
          initialQr = `data:${qrData.mimeType};base64,${qrData.value}`
        }
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-foreground">Integraciones</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Conecta servicios externos a tu clínica.</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <WhatsAppConfigForm
          initialStatus={initialStatus}
          initialQr={initialQr}
          initialPhone={initialPhone}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/app/dashboard/settings/integraciones/page.tsx
git commit -m "feat: update integraciones page for WAHA session"
```

---

## Task 7: Actualizar `send-consultation` para enviar via WAHA

**Files:**
- Modify: `veterinaias/app/api/whatsapp/send-consultation/route.ts`

Reemplazar la generación del wa.me URL por una llamada real a WAHA `sendText`. Si la sesión no está en estado WORKING, devolver error claro. Todavía se crea el `shared_record` para el link del resumen, y ese link se envía en el mensaje.

- [ ] **Step 1: Reemplazar `veterinaias/app/api/whatsapp/send-consultation/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { wahaSessionName, wahaGetSession, wahaSendText } from '@/lib/waha'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user.id)
    .single() as any

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  // Verificar que la sesión WAHA esté activa
  const sessionName = wahaSessionName(profile.tenant_id)
  const session = await wahaGetSession(sessionName)

  if (!session || session.status !== 'WORKING') {
    return NextResponse.json({
      error: 'WhatsApp no conectado. Ve a Configuración → Integraciones para conectar.',
    }, { status: 400 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { record_id, phone, pet_name } = body
  if (!record_id || !phone) return NextResponse.json({ error: 'record_id y phone son requeridos' }, { status: 400 })

  const expiryDays: number = profile.tenants?.settings?.share_link_expiry_days ?? 7
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: shared, error: sharedError } = await (supabase.from('shared_records') as any)
    .insert({ record_id, tenant_id: profile.tenant_id, created_by: user.id, expires_at: expiresAt })
    .select('token')
    .single()

  if (sharedError) return NextResponse.json({ error: 'Error al generar link compartible' }, { status: 500 })

  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('host') ?? 'petmedical.app'
  const shareUrl = `${proto}://${host}/r/${shared.token}`

  const clinicName: string = profile.tenants?.name ?? 'tu clínica'
  const message = `Hola 👋 Te compartimos el resumen de la consulta de *${pet_name ?? 'tu mascota'}* en *${clinicName}*:\n\n${shareUrl}\n\n_Este enlace expira en ${expiryDays} días._`

  const sent = await wahaSendText(sessionName, phone, message)

  if (!sent) {
    return NextResponse.json({ error: 'No se pudo enviar el mensaje por WhatsApp' }, { status: 500 })
  }

  return NextResponse.json({ success: true, share_url: shareUrl })
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/app/api/whatsapp/send-consultation/route.ts
git commit -m "feat: send consultation via WAHA sendText"
```

---

## Task 8: Actualizar `ShareConsultationModal`

**Files:**
- Modify: `veterinaias/components/medical-records/ShareConsultationModal.tsx`

El flujo cambia: antes devolvía un `wa_url` para abrir manualmente, ahora el mensaje ya fue enviado. El modal muestra confirmación de envío. También eliminar el `waUrl` del estado ya que ya no existe.

- [ ] **Step 1: Reemplazar `veterinaias/components/medical-records/ShareConsultationModal.tsx`**

```typescript
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar que el build pasa**

```bash
cd veterinaias && npx tsc --noEmit
# Debe salir sin errores
```

- [ ] **Step 3: Commit final**

```bash
git add veterinaias/components/medical-records/ShareConsultationModal.tsx
git commit -m "feat: update ShareConsultationModal for direct WAHA send"
```
