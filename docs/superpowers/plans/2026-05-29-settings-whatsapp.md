# Settings + WhatsApp + Compartir Consulta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página de Configuraciones del tenant con sub-secciones (Clínica, Configuración, Integraciones, Equipo), integración WhatsApp Business API per-tenant, y botón "Compartir por WhatsApp" en el detalle de cada consulta.

**Architecture:** Settings layout en Next.js 15 App Router con sub-nav horizontal entre secciones. Datos del tenant guardados vía PATCH `/api/settings` que hace merge al JSONB `tenants.settings`. WhatsApp integrado per-tenant con credenciales en `settings.whatsapp_config`. Consultas compartibles via tabla `shared_records` (token UUID público) con página pública sin auth en `/r/[token]`. El botón de compartir genera el link + envía el mensaje vía Meta Graph API.

**Tech Stack:** Next.js 15 App Router, Supabase, Meta WhatsApp Cloud API v21, Tailwind CSS v4 (OKLCH), sonner (toasts)

> **Nota WhatsApp API:** La implementación usa Meta Graph API como punto de partida. Durante la implementación del Task 5 se evaluarán alternativas gratuitas/sin-API antes de finalizar. El API route está diseñado para ser intercambiable.

---

## File Structure

### Crear
| Archivo | Responsabilidad |
|---------|----------------|
| `veterinaias/app/dashboard/settings/layout.tsx` | Layout de Settings: guard admin + encabezado + `SettingsNav` |
| `veterinaias/app/dashboard/settings/page.tsx` | Redirect a `/settings/clinica` |
| `veterinaias/app/dashboard/settings/clinica/page.tsx` | Server page: fetcha tenant, renderiza `ClinicaForm` |
| `veterinaias/app/dashboard/settings/configuracion/page.tsx` | Server page: fetcha settings, renderiza `ConfiguracionForm` |
| `veterinaias/app/dashboard/settings/integraciones/page.tsx` | Server page: fetcha whatsapp_config, renderiza `WhatsAppConfigForm` |
| `veterinaias/components/settings/SettingsNav.tsx` | Sub-nav horizontal client component |
| `veterinaias/components/settings/ClinicaForm.tsx` | Form para nombre, dirección, teléfono del tenant |
| `veterinaias/components/settings/ConfiguracionForm.tsx` | Form para reminder_days, share_link_expiry_days |
| `veterinaias/components/settings/WhatsAppConfigForm.tsx` | Form para phone_number_id + access_token + test |
| `veterinaias/app/api/settings/route.ts` | PATCH: actualiza `tenants.name` y `tenants.settings` (merge) |
| `veterinaias/app/api/settings/whatsapp/test/route.ts` | GET: ping Meta Graph API con credenciales del tenant |
| `veterinaias/supabase/migrations/20260529000001_shared_records.sql` | Tabla `shared_records` con RLS |
| `veterinaias/app/r/[token]/page.tsx` | Página pública (sin auth) de consulta compartida |
| `veterinaias/app/api/shared-records/route.ts` | POST: crea shared_record, retorna URL |
| `veterinaias/app/api/whatsapp/send-consultation/route.ts` | POST: genera link + envía mensaje WhatsApp |
| `veterinaias/components/medical-records/ShareConsultationModal.tsx` | Modal: phone input + llamada al API de envío |

### Modificar
| Archivo | Cambio |
|---------|--------|
| `veterinaias/components/dashboard/SidebarNav.tsx` | `ADMIN_NAV_ITEMS` → link a `/dashboard/settings` |
| `veterinaias/app/dashboard/pets/[petId]/records/[recordId]/page.tsx` | Fetcha owner phone + tenant name, agrega `ShareConsultationModal` |

---

### Task 1: Settings layout + SettingsNav + SidebarNav

**Files:**
- Create: `veterinaias/app/dashboard/settings/layout.tsx`
- Create: `veterinaias/app/dashboard/settings/page.tsx`
- Create: `veterinaias/components/settings/SettingsNav.tsx`
- Modify: `veterinaias/components/dashboard/SidebarNav.tsx`

- [ ] **Crear `SettingsNav.tsx`**

```tsx
// veterinaias/components/settings/SettingsNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, SlidersHorizontal, Plug, Users } from 'lucide-react'

const SECTIONS = [
  { href: '/dashboard/settings/clinica', icon: Building2, label: 'Clínica' },
  { href: '/dashboard/settings/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
  { href: '/dashboard/settings/integraciones', icon: Plug, label: 'Integraciones' },
  { href: '/dashboard/settings/team', icon: Users, label: 'Equipo' },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 border-b border-border mb-8">
      {SECTIONS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Crear `settings/layout.tsx`**

```tsx
// veterinaias/app/dashboard/settings/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if ((profile as any)?.role !== 'admin') redirect('/dashboard')

  return (
    <div>
      <div className="space-y-1 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Administración</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración</h1>
      </div>
      <SettingsNav />
      {children}
    </div>
  )
}
```

- [ ] **Crear `settings/page.tsx`**

```tsx
// veterinaias/app/dashboard/settings/page.tsx
import { redirect } from 'next/navigation'
export default function SettingsPage() {
  redirect('/dashboard/settings/clinica')
}
```

- [ ] **Actualizar `SidebarNav.tsx`** — cambiar link de Settings a `/dashboard/settings` y label a "Configuración"

```tsx
const ADMIN_NAV_ITEMS = [
  { href: '/dashboard/settings', icon: Settings2, label: 'Configuración' },
]
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -15
```

- [ ] **Commit**

```bash
git add veterinaias/app/dashboard/settings/layout.tsx veterinaias/app/dashboard/settings/page.tsx veterinaias/components/settings/SettingsNav.tsx veterinaias/components/dashboard/SidebarNav.tsx
git commit -m "feat: settings layout with sub-nav, update sidebar link"
```

---

### Task 2: Settings/Clínica + PATCH API

**Files:**
- Create: `veterinaias/app/api/settings/route.ts`
- Create: `veterinaias/components/settings/ClinicaForm.tsx`
- Create: `veterinaias/app/dashboard/settings/clinica/page.tsx`

- [ ] **Crear `app/api/settings/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  if (!(profile as any)?.tenant_id) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const updates: Record<string, any> = {}

  if (body.name !== undefined) updates.name = body.name

  if (body.settings !== undefined) {
    const { data: current } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', (profile as any).tenant_id)
      .single()
    updates.settings = { ...((current as any)?.settings ?? {}), ...body.settings }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', (profile as any).tenant_id)
    .select('id, name, settings')
    .single()

  if (error) return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Crear `ClinicaForm.tsx`**

```tsx
// veterinaias/components/settings/ClinicaForm.tsx
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
```

- [ ] **Crear `settings/clinica/page.tsx`**

```tsx
// veterinaias/app/dashboard/settings/clinica/page.tsx
import { createClient } from '@/lib/supabase/server'
import { ClinicaForm } from '@/components/settings/ClinicaForm'

export default async function SettingsClinicaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user!.id)
    .single() as any

  const tenant = profile?.tenants
  const settings = tenant?.settings ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Datos de la clínica</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Esta información aparece en PDFs y documentos generados.</p>
      </div>
      <ClinicaForm name={tenant?.name ?? ''} address={settings.address ?? null} phone={settings.phone ?? null} />
    </div>
  )
}
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -15
```

- [ ] **Commit**

```bash
git add veterinaias/app/api/settings/route.ts veterinaias/components/settings/ClinicaForm.tsx veterinaias/app/dashboard/settings/clinica/page.tsx
git commit -m "feat: settings clinica page and PATCH settings API"
```

---

### Task 3: Settings/Configuración page

**Files:**
- Create: `veterinaias/components/settings/ConfiguracionForm.tsx`
- Create: `veterinaias/app/dashboard/settings/configuracion/page.tsx`

- [ ] **Crear `ConfiguracionForm.tsx`**

```tsx
// veterinaias/components/settings/ConfiguracionForm.tsx
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
```

- [ ] **Crear `settings/configuracion/page.tsx`**

```tsx
// veterinaias/app/dashboard/settings/configuracion/page.tsx
import { createClient } from '@/lib/supabase/server'
import { ConfiguracionForm } from '@/components/settings/ConfiguracionForm'

export default async function SettingsConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user!.id)
    .single() as any

  const settings = profile?.tenants?.settings ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Configuración general</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Ajusta el comportamiento de la plataforma para tu clínica.</p>
      </div>
      <ConfiguracionForm
        confirmationReminderDays={settings.confirmation_reminder_days ?? 2}
        shareLinkExpiryDays={settings.share_link_expiry_days ?? 7}
      />
    </div>
  )
}
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -15
```

- [ ] **Commit**

```bash
git add veterinaias/components/settings/ConfiguracionForm.tsx veterinaias/app/dashboard/settings/configuracion/page.tsx
git commit -m "feat: settings configuracion page"
```

---

### Task 4: Settings/Integraciones — WhatsApp config + test de conexión

**Files:**
- Create: `veterinaias/app/api/settings/whatsapp/test/route.ts`
- Create: `veterinaias/components/settings/WhatsAppConfigForm.tsx`
- Create: `veterinaias/app/dashboard/settings/integraciones/page.tsx`

- [ ] **Crear `app/api/settings/whatsapp/test/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user.id)
    .single() as any

  const config = profile?.tenants?.settings?.whatsapp_config
  if (!config?.phone_number_id || !config?.access_token) {
    return NextResponse.json({ error: 'WhatsApp no configurado' }, { status: 400 })
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}`,
    { headers: { Authorization: `Bearer ${config.access_token}` } }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({
      error: 'Credenciales inválidas',
      detail: (err as any)?.error?.message,
    }, { status: 400 })
  }

  const data = await res.json()
  return NextResponse.json({
    success: true,
    phone: (data as any).display_phone_number ?? 'Número verificado',
  })
}
```

- [ ] **Crear `WhatsAppConfigForm.tsx`**

```tsx
// veterinaias/components/settings/WhatsAppConfigForm.tsx
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
```

- [ ] **Crear `settings/integraciones/page.tsx`**

```tsx
// veterinaias/app/dashboard/settings/integraciones/page.tsx
import { createClient } from '@/lib/supabase/server'
import { WhatsAppConfigForm } from '@/components/settings/WhatsAppConfigForm'

export default async function SettingsIntegracionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user!.id)
    .single() as any

  const waConfig = profile?.tenants?.settings?.whatsapp_config ?? {}

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-foreground">Integraciones</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Conecta servicios externos a tu clínica.</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <WhatsAppConfigForm
          phoneNumberId={waConfig.phone_number_id ?? null}
          hasToken={!!waConfig.access_token}
        />
      </div>
    </div>
  )
}
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -15
```

- [ ] **Commit**

```bash
git add veterinaias/app/api/settings/whatsapp/test/route.ts veterinaias/components/settings/WhatsAppConfigForm.tsx veterinaias/app/dashboard/settings/integraciones/page.tsx
git commit -m "feat: whatsapp integration settings with connection test"
```

---

### Task 5: shared_records migration + POST API + página pública `/r/[token]`

**Files:**
- Create: `veterinaias/supabase/migrations/20260529000001_shared_records.sql`
- Create: `veterinaias/app/api/shared-records/route.ts`
- Create: `veterinaias/app/r/[token]/page.tsx`

> ⚠️ **Nota:** Aplicar la migración en Supabase antes de verificar el build. Usar `supabase db push` o el MCP tool `apply_migration`.

- [ ] **Crear migración `20260529000001_shared_records.sql`**

```sql
CREATE TABLE shared_records (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token      UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  record_id  UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE shared_records ENABLE ROW LEVEL SECURITY;

-- Tenant members can create
CREATE POLICY "members_insert_shared_records" ON shared_records
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

-- Tenant members can read their own
CREATE POLICY "members_select_shared_records" ON shared_records
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );
```

- [ ] **Aplicar migración**

```bash
cd veterinaias && npx supabase db push
```

Expected: `Applying migration 20260529000001_shared_records.sql`

- [ ] **Crear `app/api/shared-records/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user.id)
    .single() as any

  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { record_id } = body
  if (!record_id) return NextResponse.json({ error: 'record_id requerido' }, { status: 400 })

  const expiryDays = profile.tenants?.settings?.share_link_expiry_days ?? 7
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: shared, error } = await (supabase.from('shared_records') as any)
    .insert({ record_id, tenant_id: profile.tenant_id, created_by: user.id, expires_at: expiresAt })
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear link' }, { status: 500 })

  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('host') ?? 'petmedical.app'
  const url = `${proto}://${host}/r/${shared.token}`

  return NextResponse.json({ token: shared.token, url, expires_at: expiresAt }, { status: 201 })
}
```

- [ ] **Crear `app/r/[token]/page.tsx`** — página pública sin auth

```tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

export default async function SharedRecordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: shared } = await (admin.from('shared_records') as any)
    .select('record_id, expires_at, tenants(name)')
    .eq('token', token)
    .single()

  if (!shared) notFound()

  if (new Date(shared.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <p className="text-lg font-semibold text-foreground">Link expirado</p>
          <p className="text-sm text-muted-foreground mt-1">Este enlace ya no está disponible.</p>
        </div>
      </div>
    )
  }

  const { data: record } = await (admin.from('medical_records') as any)
    .select(`
      id, reason, diagnosis, treatment, notes, created_at,
      weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
      pet:pet_id(name, species:species_id(name), breed),
      created_by_profile:created_by(full_name),
      prescriptions(id, medication_name, dosage, frequency, duration, notes)
    `)
    .eq('id', shared.record_id)
    .single()

  if (!record) notFound()

  const pet = record.pet as any
  const vet = record.created_by_profile as any
  const tenantName = (shared.tenants as any)?.name ?? 'Clínica Veterinaria'
  const date = new Date(record.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-border">
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">{tenantName}</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Resumen de consulta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pet?.name}
            {[pet?.species?.name, pet?.breed].filter(Boolean).length > 0 && ` · ${[pet?.species?.name, pet?.breed].filter(Boolean).join(' · ')}`}
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Fecha</p>
            <p className="text-sm text-foreground">{date}</p>
            {vet?.full_name && <p className="text-xs text-muted-foreground mt-0.5">Dr. {vet.full_name}</p>}
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Motivo</p>
            <p className="text-sm text-foreground">{record.reason}</p>
          </div>

          {record.diagnosis && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Diagnóstico</p>
              <p className="text-sm text-foreground">{record.diagnosis}</p>
            </div>
          )}

          {record.treatment && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Tratamiento</p>
              <p className="text-sm text-foreground">{record.treatment}</p>
            </div>
          )}

          {record.notes && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Notas</p>
              <p className="text-sm text-muted-foreground italic">{record.notes}</p>
            </div>
          )}

          {[record.weight_kg, record.temperature_celsius, record.heart_rate_bpm, record.respiratory_rate_bpm].some(v => v != null) && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Signos vitales</p>
              <div className="flex flex-wrap gap-2">
                {record.weight_kg != null && <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">Peso: {record.weight_kg} kg</span>}
                {record.temperature_celsius != null && <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">Temp: {record.temperature_celsius}°C</span>}
                {record.heart_rate_bpm != null && <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">FC: {record.heart_rate_bpm} bpm</span>}
                {record.respiratory_rate_bpm != null && <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border">FR: {record.respiratory_rate_bpm} rpm</span>}
              </div>
            </div>
          )}

          {(record.prescriptions as any[]).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Medicamentos</p>
              <div className="space-y-2">
                {(record.prescriptions as any[]).map((p: any) => (
                  <div key={p.id} className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <p className="font-medium text-foreground">{p.medication_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}
                    </p>
                    {p.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{p.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 pt-5 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            {tenantName} · petMedical.app<br />
            Enlace válido hasta el {new Date(shared.expires_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -15
```

- [ ] **Commit**

```bash
git add veterinaias/supabase/migrations/20260529000001_shared_records.sql veterinaias/app/api/shared-records/route.ts veterinaias/app/r/[token]/page.tsx
git commit -m "feat: shared_records table, POST API, public /r/[token] page"
```

---

### Task 6: WhatsApp send API + ShareConsultationModal + botón en detalle de consulta

**Files:**
- Create: `veterinaias/app/api/whatsapp/send-consultation/route.ts`
- Create: `veterinaias/components/medical-records/ShareConsultationModal.tsx`
- Modify: `veterinaias/app/dashboard/pets/[petId]/records/[recordId]/page.tsx`

> ⚠️ **Investigar antes de implementar:** Antes de codificar el send API, revisar si hay alternativas al Meta Graph API (wa.me links, WhatsApp API gratuita, etc.). El modal y la estructura de la ruta son independientes del proveedor de envío — diseñar el API route para que sea intercambiable.

- [ ] **Crear `app/api/whatsapp/send-consultation/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const config = profile?.tenants?.settings?.whatsapp_config
  if (!config?.phone_number_id || !config?.access_token) {
    return NextResponse.json({
      error: 'WhatsApp no configurado',
      detail: 'Ve a Configuración → Integraciones para conectar tu cuenta.',
    }, { status: 400 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { record_id, phone, pet_name } = body
  if (!record_id || !phone) return NextResponse.json({ error: 'record_id y phone son requeridos' }, { status: 400 })

  // Create shared link
  const expiryDays = profile.tenants?.settings?.share_link_expiry_days ?? 7
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: shared, error: sharedError } = await (supabase.from('shared_records') as any)
    .insert({ record_id, tenant_id: profile.tenant_id, created_by: user.id, expires_at: expiresAt })
    .select('token')
    .single()

  if (sharedError) return NextResponse.json({ error: 'Error al generar link compartible' }, { status: 500 })

  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('host') ?? 'petmedical.app'
  const shareUrl = `${proto}://${host}/r/${shared.token}`

  const cleanPhone = phone.replace(/\D/g, '')
  const clinicName = profile.tenants?.name ?? 'tu clínica'

  // Send via Meta WhatsApp Cloud API
  const msgRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: {
          body: `Hola 👋 Te compartimos el resumen de la consulta de *${pet_name}* en *${clinicName}*:\n\n${shareUrl}\n\n_Este enlace expira en ${expiryDays} días._`,
        },
      }),
    }
  )

  if (!msgRes.ok) {
    const err = await msgRes.json().catch(() => ({}))
    return NextResponse.json({
      error: 'Error al enviar el mensaje de WhatsApp',
      detail: (err as any)?.error?.message ?? 'Verifica las credenciales en Configuración → Integraciones.',
    }, { status: 400 })
  }

  return NextResponse.json({ success: true, share_url: shareUrl })
}
```

- [ ] **Crear `ShareConsultationModal.tsx`**

```tsx
// veterinaias/components/medical-records/ShareConsultationModal.tsx
'use client'
import { useState } from 'react'
import { Share2, MessageCircle, X, Loader2, CheckCircle2 } from 'lucide-react'
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
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string; detail?: string } | null>(null)

  async function handleSend() {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/whatsapp/send-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: recordId, phone, pet_name: petName }),
      })
      const json = await res.json()
      setResult(res.ok ? { success: true } : { error: json.error, detail: json.detail })
    } catch {
      setResult({ error: 'Error de red' })
    } finally {
      setSending(false)
    }
  }

  function close() { setOpen(false); setResult(null) }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
        <Share2 size={14} />
        Compartir
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) close() }}>
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

        {!result?.success ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Se enviará el resumen de la consulta de <strong>{petName}</strong> al número de WhatsApp indicado.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Número de WhatsApp</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 55 1234 5678" />
              <p className="text-[10px] text-muted-foreground">Incluir código de país. Ej: +52 para México.</p>
            </div>

            {result?.error && (
              <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                <p className="font-medium">{result.error}</p>
                {result.detail && <p className="mt-0.5 opacity-80">{result.detail}</p>}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSend}
                disabled={sending || !phone.trim()}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
              >
                {sending ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <MessageCircle size={13} className="mr-1.5" />}
                {sending ? 'Enviando...' : 'Enviar'}
              </Button>
              <Button variant="outline" size="sm" onClick={close}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-3 space-y-3">
            <CheckCircle2 size={32} className="text-green-600 mx-auto" />
            <div>
              <p className="font-semibold text-sm text-foreground">¡Mensaje enviado!</p>
              <p className="text-xs text-muted-foreground mt-1">El link de la consulta fue enviado por WhatsApp.</p>
            </div>
            <Button variant="outline" size="sm" onClick={close}>Cerrar</Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Modificar `app/dashboard/pets/[petId]/records/[recordId]/page.tsx`**

Agregar al `select` del `medical_records`:
```tsx
// Ya existe: pet:pet_id(id, name)
// Agregar: owner info via pet_registrations
```

Antes del `return`, agregar una consulta extra para el owner:
```tsx
const { data: regData } = await (supabase as any)
  .from('pet_registrations')
  .select('owner:owner_id(phone)')
  .eq('pet_id', petId)
  .maybeSingle()
const ownerPhone = (regData?.owner as any)?.phone ?? null
```

En el encabezado de la página, agregar el botón junto al "Editar" existente o en la sección de acciones:
```tsx
import { ShareConsultationModal } from '@/components/medical-records/ShareConsultationModal'

// En el div de acciones del header:
<div className="flex items-center gap-2">
  <ShareConsultationModal
    recordId={recordId}
    ownerPhone={ownerPhone}
    petName={pet?.name ?? ''}
  />
  {/* botones existentes... */}
</div>
```

- [ ] **Verificar build**

```bash
cd veterinaias && npm run build 2>&1 | tail -15
```

- [ ] **Commit**

```bash
git add veterinaias/app/api/whatsapp/send-consultation/route.ts veterinaias/components/medical-records/ShareConsultationModal.tsx veterinaias/app/dashboard/pets/[petId]/records/[recordId]/page.tsx
git commit -m "feat: whatsapp send consultation API, ShareConsultationModal, share button on record detail"
```
