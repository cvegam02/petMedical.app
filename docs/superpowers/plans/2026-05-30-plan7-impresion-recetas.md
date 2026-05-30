# Plan 7 — Impresión de Recetas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Imprimir recetas veterinarias en PDF conforme a NOM-064-ZOO-2000, con datos profesionales del veterinario (Mi Perfil) y configuración mínima de recetas en Settings.

**Architecture:** Se agregan `professional_license` y `professional_address` a `user_profiles`. Nueva página "Mi Perfil" accesible vía un dropdown de usuario en el topbar. Una página de config mínima en Settings guarda dos campos opcionales en `tenant.settings`. El PDF se genera con `@react-pdf/renderer` (mismo patrón que el PDF de historiales) desde un nuevo documento `PrescriptionDocument`, vía una API route, disparado por un botón "Imprimir receta" en el detalle del expediente.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RLS), @react-pdf/renderer, react-hook-form, Zod, base-ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-05-30-plan7-impresion-recetas-design.md`

**Nota:** Este proyecto omite tests por instrucción del usuario. Cada tarea termina con verificación en browser cuando aplica. No agregar Co-Authored-By en los commits.

---

### Task 1: Migración — Campos profesionales en `user_profiles`

**Files:**
- Create: `veterinaias/supabase/migrations/20260530000002_vet_professional_fields.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- Campos profesionales del veterinario para la impresión de recetas (NOM-064-ZOO-2000)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS professional_license TEXT,
  ADD COLUMN IF NOT EXISTS professional_address TEXT;
```

- [ ] **Step 2: Aplicar la migración en la BD remota**

Usa la herramienta MCP `mcp__plugin_supabase_supabase__execute_sql` con `project_id: qgruuhrgwgjduzlctdlx` y el SQL del Step 1. Verifica que `user_profiles` tenga las dos columnas nuevas:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
AND column_name IN ('professional_license','professional_address');
```
Expected: dos filas (`professional_license`, `professional_address`).

- [ ] **Step 3: Commit**

```bash
git add veterinaias/supabase/migrations/20260530000002_vet_professional_fields.sql
git commit -m "feat: add professional_license and professional_address to user_profiles"
```

---

### Task 2: Actualizar tipos TypeScript

**Files:**
- Modify: `veterinaias/lib/types/database.ts`

- [ ] **Step 1: Actualizar la interfaz `UserProfile`**

Reemplaza la interfaz `UserProfile` con:

```typescript
export interface UserProfile {
  id: string
  tenant_id: string | null
  role: UserRole | null
  full_name: string
  phone: string | null
  professional_license: string | null
  professional_address: string | null
  is_super_admin: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Actualizar la tabla `user_profiles` en `Database.public.Tables`**

Reemplaza la entrada `user_profiles` con:

```typescript
user_profiles: {
  Row: { id: string; tenant_id: string | null; role: UserRole | null; full_name: string; phone: string | null; professional_license: string | null; professional_address: string | null; is_super_admin: boolean; created_at: string; updated_at: string }
  Insert: { id: string; tenant_id?: string | null; role?: UserRole | null; full_name: string; phone?: string | null; professional_license?: string | null; professional_address?: string | null; is_super_admin?: boolean }
  Update: { tenant_id?: string | null; role?: UserRole | null; full_name?: string; phone?: string | null; professional_license?: string | null; professional_address?: string | null; is_super_admin?: boolean; updated_at?: string }
  Relationships: []
}
```

- [ ] **Step 3: Extender la interfaz `TenantSettings`**

Reemplaza la interfaz `TenantSettings` con:

```typescript
export interface TenantSettings {
  confirmation_reminder_days: number
  share_link_expiry_days: number
  business_hours: BusinessHoursConfig
  prescription_footer_note?: string
  prescription_validity_days?: number
}
```

- [ ] **Step 4: Commit**

```bash
git add veterinaias/lib/types/database.ts
git commit -m "feat: add vet professional fields and prescription settings to types"
```

---

### Task 3: Validación y API del perfil propio

**Files:**
- Create: `veterinaias/lib/validations/profile.ts`
- Create: `veterinaias/app/api/profile/route.ts`

- [ ] **Step 1: Crear el schema Zod**

Crea `veterinaias/lib/validations/profile.ts`:

```typescript
import { z } from 'zod'

export const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Nombre es requerido').optional(),
  phone: z.string().optional(),
  professional_license: z.string().optional(),
  professional_address: z.string().optional(),
})

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>
```

- [ ] **Step 2: Crear la API route**

Crea `veterinaias/app/api/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema } from '@/lib/validations/profile'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updateProfileSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { full_name, phone, professional_license, professional_address } = result.data
  const update: Record<string, unknown> = {}
  if (full_name !== undefined) update.full_name = full_name
  if (phone !== undefined) update.phone = phone || null
  if (professional_license !== undefined) update.professional_license = professional_license || null
  if (professional_address !== undefined) update.professional_address = professional_address || null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const { data, error } = await (supabase.from('user_profiles') as any)
    .update(update)
    .eq('id', user.id)
    .select('id, full_name, phone, professional_license, professional_address')
    .single()

  if (error) return NextResponse.json({ error: 'Error al guardar el perfil' }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 3: Commit**

```bash
git add veterinaias/lib/validations/profile.ts veterinaias/app/api/profile/route.ts
git commit -m "feat: add own-profile validation schema and PATCH endpoint"
```

---

### Task 4: Página "Mi Perfil" + formulario

**Files:**
- Create: `veterinaias/app/dashboard/perfil/page.tsx`
- Create: `veterinaias/components/profile/ProfileForm.tsx`

- [ ] **Step 1: Crear el formulario (client component)**

Crea `veterinaias/components/profile/ProfileForm.tsx`:

```typescript
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
}

export function ProfileForm({ fullName, phone, professionalLicense, professionalAddress }: ProfileFormProps) {
  const [form, setForm] = useState({
    full_name: fullName,
    phone: phone ?? '',
    professional_license: professionalLicense ?? '',
    professional_address: professionalAddress ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
              <Label htmlFor="professional_license">Cédula profesional</Label>
              <Input id="professional_license" value={form.professional_license}
                onChange={e => setForm(f => ({ ...f, professional_license: e.target.value }))} placeholder="Ej. 12345678" />
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
```

- [ ] **Step 2: Crear la página (server component)**

Crea `veterinaias/app/dashboard/perfil/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/profile/ProfileForm'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, phone, professional_license, professional_address')
    .eq('id', user.id)
    .single() as any

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Cuenta</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Perfil</h1>
      </div>
      <ProfileForm
        fullName={profile?.full_name ?? ''}
        phone={profile?.phone ?? null}
        professionalLicense={profile?.professional_license ?? null}
        professionalAddress={profile?.professional_address ?? null}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verificar en browser**

Abre `http://localhost:3000/dashboard/perfil`. Llena cédula profesional y dirección, guarda. Recarga la página y verifica que los valores persisten.

- [ ] **Step 4: Commit**

```bash
git add veterinaias/app/dashboard/perfil/ veterinaias/components/profile/
git commit -m "feat: add Mi Perfil page with professional data form"
```

---

### Task 5: Menú de usuario (dropdown) en el topbar

**Files:**
- Create: `veterinaias/components/dashboard/UserMenu.tsx`
- Modify: `veterinaias/app/dashboard/layout.tsx`

- [ ] **Step 1: Crear el componente `UserMenu`**

Crea `veterinaias/components/dashboard/UserMenu.tsx`. Usa el patrón de click-outside de `FreeTextCombobox` (listener `mousedown` sobre `document`):

```typescript
'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ShieldCheck, LogOut, User, ChevronDown } from 'lucide-react'
import { signOutAction } from '@/app/actions/auth'

interface UserMenuProps {
  fullName: string
  role: string
  initials: string
}

export function UserMenu({ fullName, role, initials }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-muted/60 transition-colors"
      >
        <div className="text-right leading-none">
          <p className="text-xs font-semibold text-foreground">{fullName}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            {role === 'admin' && <ShieldCheck size={9} className="text-primary/70" />}
            <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-primary/80">{initials}</span>
        </div>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-popover border border-border rounded-lg shadow-md overflow-hidden z-50">
          <Link
            href="/dashboard/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <User size={14} className="text-muted-foreground" />
            Mi Perfil
          </Link>
          <div className="border-t border-border" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/8 transition-colors"
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Usar `UserMenu` en el layout**

En `veterinaias/app/dashboard/layout.tsx`:

1. Agrega el import al inicio (junto a los demás imports de componentes):
```typescript
import { UserMenu } from '@/components/dashboard/UserMenu'
```

2. Elimina los imports que ya no se usan directamente en el layout: `LogOut` y `signOutAction`. Cambia la línea de import de lucide-react de:
```typescript
import { LogOut, ShieldCheck } from 'lucide-react'
```
a:
```typescript
import { ShieldCheck } from 'lucide-react'
```
Y elimina la línea:
```typescript
import { signOutAction } from '@/app/actions/auth'
```
(El `ShieldCheck` se sigue usando en el centro del topbar para el badge de admin si aplica; si no quedara ninguna referencia, elimínalo también. Verifica con una búsqueda antes de borrar.)

3. Reemplaza todo el bloque `{/* Right — user info + logout */}` (el `<div className="flex-1 flex items-center justify-end gap-2.5">...</div>` completo, incluyendo el área de texto, el avatar, el divisor y el `<form action={signOutAction}>`) con:

```tsx
{/* Right — user menu */}
<div className="flex-1 flex items-center justify-end">
  <UserMenu
    fullName={profile?.full_name ?? ''}
    role={profile?.role ?? ''}
    initials={initials}
  />
</div>
```

- [ ] **Step 3: Verificar en browser**

Recarga el dashboard. Haz clic en tu nombre/avatar en el topbar (arriba a la derecha). Debe abrirse un dropdown con "Mi Perfil" y "Cerrar sesión". "Mi Perfil" navega a `/dashboard/perfil`. "Cerrar sesión" cierra la sesión. Haz clic fuera del dropdown para cerrarlo.

- [ ] **Step 4: Commit**

```bash
git add veterinaias/components/dashboard/UserMenu.tsx veterinaias/app/dashboard/layout.tsx
git commit -m "feat: add user dropdown menu in topbar with Mi Perfil and sign out"
```

---

### Task 6: Configuración de Recetas en Settings

**Files:**
- Create: `veterinaias/components/settings/PrescriptionConfigForm.tsx`
- Create: `veterinaias/app/dashboard/settings/recetas/page.tsx`
- Modify: `veterinaias/components/settings/SettingsNav.tsx`

- [ ] **Step 1: Crear el formulario de config (client component)**

Crea `veterinaias/components/settings/PrescriptionConfigForm.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PrescriptionConfigFormProps {
  footerNote: string | null
  validityDays: number | null
}

export function PrescriptionConfigForm({ footerNote, validityDays }: PrescriptionConfigFormProps) {
  const [form, setForm] = useState({
    prescription_footer_note: footerNote ?? '',
    prescription_validity_days: validityDays != null ? String(validityDays) : '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const days = form.prescription_validity_days.trim()
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            prescription_footer_note: form.prescription_footer_note.trim() || null,
            prescription_validity_days: days === '' ? null : Number(days),
          },
        }),
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
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="space-y-1">
        <Label htmlFor="footer_note">Nota de pie de página</Label>
        <Input id="footer_note" value={form.prescription_footer_note}
          onChange={e => setForm(f => ({ ...f, prescription_footer_note: e.target.value }))}
          placeholder="Ej. Conserve esta receta para su próxima visita" />
        <p className="text-xs text-muted-foreground">Aparece debajo de la leyenda obligatoria en la receta.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="validity_days">Vigencia de la receta (días)</Label>
        <Input id="validity_days" type="number" min={1} value={form.prescription_validity_days}
          onChange={e => setForm(f => ({ ...f, prescription_validity_days: e.target.value }))}
          placeholder="Ej. 30" />
        <p className="text-xs text-muted-foreground">Opcional. Si se define, la receta muestra "Vigencia: X días".</p>
      </div>
      <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
    </form>
  )
}
```

- [ ] **Step 2: Crear la página de Settings**

Crea `veterinaias/app/dashboard/settings/recetas/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { PrescriptionConfigForm } from '@/components/settings/PrescriptionConfigForm'

export default async function SettingsRecetasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user.id)
    .single() as any

  const settings = profile?.tenants?.settings ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Recetas</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Configura los textos opcionales que aparecen en las recetas impresas.</p>
      </div>
      <PrescriptionConfigForm
        footerNote={settings.prescription_footer_note ?? null}
        validityDays={settings.prescription_validity_days ?? null}
      />
    </div>
  )
}
```

- [ ] **Step 3: Agregar "Recetas" a `SettingsNav`**

En `veterinaias/components/settings/SettingsNav.tsx`, actualiza el import y el array `SECTIONS`:

```typescript
import { Building2, SlidersHorizontal, Plug, Users, BookOpen, FileText } from 'lucide-react'

const SECTIONS = [
  { href: '/dashboard/settings/clinica', icon: Building2, label: 'Clínica' },
  { href: '/dashboard/settings/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
  { href: '/dashboard/settings/catalogos', icon: BookOpen, label: 'Catálogos' },
  { href: '/dashboard/settings/recetas', icon: FileText, label: 'Recetas' },
  { href: '/dashboard/settings/integraciones', icon: Plug, label: 'Integraciones' },
  { href: '/dashboard/settings/team', icon: Users, label: 'Equipo' },
]
```

- [ ] **Step 4: Verificar en browser**

Abre `http://localhost:3000/dashboard/settings/recetas`. Llena la nota de pie de página y la vigencia, guarda. Recarga y verifica que persisten.

- [ ] **Step 5: Commit**

```bash
git add veterinaias/components/settings/PrescriptionConfigForm.tsx veterinaias/app/dashboard/settings/recetas/ veterinaias/components/settings/SettingsNav.tsx
git commit -m "feat: add prescription config settings page (footer note, validity)"
```

---

### Task 7: Documento PDF de receta (React-PDF)

**Files:**
- Create: `veterinaias/lib/pdf/prescriptionDocument.tsx`

- [ ] **Step 1: Crear el documento**

Crea `veterinaias/lib/pdf/prescriptionDocument.tsx`. Sigue el estilo de `lib/pdf/medicalHistoryDocument.tsx`:

```typescript
import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  clinicName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d6b6e' },
  clinicMeta: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  rxLabel: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0d6b6e' },
  logo: { width: 55, height: 55 },
  vetBlock: { marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  vetName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  vetMeta: { fontSize: 9, color: '#374151', marginTop: 2 },
  emitDate: { fontSize: 9, color: '#6b7280', marginTop: 4 },
  twoCol: { flexDirection: 'row', gap: 24, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  col: { flex: 1 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  fieldLine: { fontSize: 10, marginBottom: 2 },
  fieldLabel: { fontFamily: 'Helvetica-Bold', color: '#6b7280' },
  block: { marginBottom: 12 },
  bodyText: { fontSize: 10, lineHeight: 1.4 },
  rxItem: { marginBottom: 8 },
  rxName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  rxDetail: { fontSize: 9, color: '#374151', marginTop: 1 },
  rxNotes: { fontSize: 9, color: '#6b7280', marginTop: 1, fontStyle: 'italic' },
  footerNote: { fontSize: 9, color: '#374151', marginTop: 14 },
  validity: { fontSize: 9, color: '#6b7280', marginTop: 4 },
  signature: { marginTop: 36, alignItems: 'center' },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#1a1a1a', width: 220, marginBottom: 4 },
  signatureName: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  signatureCaption: { fontSize: 8, color: '#6b7280', marginTop: 1 },
  legend: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' },
})

export interface PrescriptionData {
  clinic: { name: string; address: string | null; phone: string | null; logoUrl: string | null }
  vet: { full_name: string; professional_license: string | null; professional_address: string | null }
  patient: { name: string; species: string | null; breed: string | null; sex: string; age: string | null; weight: number | null }
  owner: { full_name: string; address: string | null }
  record: { diagnosis: string | null; treatment: string | null; emittedAt: string }
  prescriptions: Array<{ medication_name: string; active_ingredient: string | null; dosage: string; route_of_administration: string | null; frequency: string; duration: string; notes: string | null }>
  footerNote: string | null
  validityDays: number | null
}

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }
const BLANK = '________________'

export function PrescriptionDocument({ clinic, vet, patient, owner, record, prescriptions, footerNote, validityDays }: PrescriptionData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: clinic + RECETA */}
        <View style={styles.header}>
          <View>
            <Text style={styles.clinicName}>{clinic.name}</Text>
            {(clinic.address || clinic.phone) && (
              <Text style={styles.clinicMeta}>
                {[clinic.address, clinic.phone].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
          {clinic.logoUrl
            ? <Image src={clinic.logoUrl} style={styles.logo} />
            : <Text style={styles.rxLabel}>RECETA</Text>}
        </View>

        {/* Vet block */}
        <View style={styles.vetBlock}>
          <Text style={styles.vetName}>M.V.Z. {vet.full_name}</Text>
          <Text style={styles.vetMeta}>Cédula Profesional: {vet.professional_license || BLANK}</Text>
          <Text style={styles.vetMeta}>{vet.professional_address || BLANK}</Text>
          <Text style={styles.emitDate}>Fecha de emisión: {record.emittedAt}</Text>
        </View>

        {/* Patient + Owner */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Paciente</Text>
            <Text style={styles.fieldLine}>{patient.name}</Text>
            <Text style={styles.fieldLine}>
              {[patient.species, patient.breed].filter(Boolean).join(' · ') || '—'}
            </Text>
            <Text style={styles.fieldLine}>
              {[SEX_LABELS[patient.sex] ?? patient.sex, patient.age, patient.weight != null ? `${patient.weight} kg` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Propietario</Text>
            <Text style={styles.fieldLine}>{owner.full_name}</Text>
            <Text style={styles.fieldLine}>{owner.address || '—'}</Text>
          </View>
        </View>

        {/* Diagnóstico */}
        {record.diagnosis && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Diagnóstico</Text>
            <Text style={styles.bodyText}>{record.diagnosis}</Text>
          </View>
        )}

        {/* Tratamiento */}
        {record.treatment && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Tratamiento</Text>
            <Text style={styles.bodyText}>{record.treatment}</Text>
          </View>
        )}

        {/* Prescripción */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Prescripción</Text>
          {prescriptions.map((p, i) => (
            <View key={i} style={styles.rxItem}>
              <Text style={styles.rxName}>
                {i + 1}. {p.medication_name}{p.active_ingredient ? ` (${p.active_ingredient})` : ''}
              </Text>
              <Text style={styles.rxDetail}>
                {[`Dosis: ${p.dosage}`, p.route_of_administration ? `Vía: ${p.route_of_administration}` : null, `Frecuencia: ${p.frequency}`, `Duración: ${p.duration}`].filter(Boolean).join(' · ')}
              </Text>
              {p.notes && <Text style={styles.rxNotes}>{p.notes}</Text>}
            </View>
          ))}
        </View>

        {/* Footer note + validity */}
        {footerNote && <Text style={styles.footerNote}>{footerNote}</Text>}
        {validityDays != null && <Text style={styles.validity}>Vigencia: {validityDays} días</Text>}

        {/* Signature space */}
        <View style={styles.signature}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>
            {vet.full_name}{vet.professional_license ? ` · Céd. ${vet.professional_license}` : ''}
          </Text>
          <Text style={styles.signatureCaption}>Firma del médico</Text>
        </View>

        {/* Mandatory legend */}
        <Text style={styles.legend}>Reservado al tratamiento de animales</Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/lib/pdf/prescriptionDocument.tsx
git commit -m "feat: add PrescriptionDocument React-PDF template (NOM-064)"
```

---

### Task 8: API route que genera el PDF de la receta

**Files:**
- Create: `veterinaias/app/api/medical-records/[id]/prescription/pdf/route.ts`

- [ ] **Step 1: Crear la API route**

Crea `veterinaias/app/api/medical-records/[id]/prescription/pdf/route.ts`. Sigue el patrón de `app/api/historiales/[petId]/pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { PrescriptionDocument, type PrescriptionData } from '@/lib/pdf/prescriptionDocument'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function calcAge(dob: string | null): string | null {
  if (!dob) return null
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'Recién nacido'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  return `${years} año${years > 1 ? 's' : ''}`
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user.id)
    .single() as any
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  // Fetch del expediente con todos los datos relacionados
  const { data: record } = await (supabase.from('medical_records') as any)
    .select(`
      id, diagnosis, treatment, weight_kg, created_at, tenant_id,
      pet:pet_id(id, name, sex, date_of_birth, breed, species:species_id(name)),
      vet:created_by(full_name, professional_license, professional_address),
      prescriptions(medication_name, active_ingredient, dosage, route_of_administration, frequency, duration, notes)
    `)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!record) return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })

  const prescriptions = (record.prescriptions ?? []) as any[]
  if (prescriptions.length === 0) {
    return NextResponse.json({ error: 'El expediente no tiene recetas' }, { status: 400 })
  }

  // Dueño de la mascota (vía pet_registrations del tenant)
  const { data: reg } = await (supabase as any)
    .from('pet_registrations')
    .select('owner:owner_id(full_name, address)')
    .eq('pet_id', record.pet?.id)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()
  const owner = reg?.owner ?? { full_name: '—', address: null }

  const tenant = profile.tenants as any
  const settings = tenant?.settings ?? {}
  const pet = record.pet as any
  const vet = record.vet as any

  const emittedAt = new Date(record.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const data: PrescriptionData = {
    clinic: { name: tenant?.name ?? 'Clínica Veterinaria', address: settings.address ?? null, phone: settings.phone ?? null, logoUrl: settings.logo_url ?? null },
    vet: { full_name: vet?.full_name ?? '—', professional_license: vet?.professional_license ?? null, professional_address: vet?.professional_address ?? null },
    patient: { name: pet?.name ?? '—', species: pet?.species?.name ?? null, breed: pet?.breed ?? null, sex: pet?.sex ?? 'unknown', age: calcAge(pet?.date_of_birth ?? null), weight: record.weight_kg ?? null },
    owner: { full_name: owner.full_name ?? '—', address: owner.address ?? null },
    record: { diagnosis: record.diagnosis ?? null, treatment: record.treatment ?? null, emittedAt },
    prescriptions: prescriptions.map(p => ({
      medication_name: p.medication_name,
      active_ingredient: p.active_ingredient ?? null,
      dosage: p.dosage,
      route_of_administration: p.route_of_administration ?? null,
      frequency: p.frequency,
      duration: p.duration,
      notes: p.notes ?? null,
    })),
    footerNote: settings.prescription_footer_note ?? null,
    validityDays: settings.prescription_validity_days ?? null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let buffer: any
  try {
    buffer = await (renderToBuffer as any)(createElement(PrescriptionDocument, data))
  } catch {
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 })
  }

  const safeName = (pet?.name ?? 'receta')
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-{2,}/g, '-')
  const dateStr = new Date().toISOString().split('T')[0]

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receta-${safeName}-${dateStr}.pdf"`,
    },
  })
}
```

**Nota:** El `record.pet` no incluye `id` en el select de arriba. Para obtener el `pet_id` del dueño, agrega `id` al sub-select de `pet`: cambia `pet:pet_id(name, sex, ...)` por `pet:pet_id(id, name, sex, date_of_birth, breed, species:species_id(name))`. La query de `reg` usa `record.pet?.id`.

- [ ] **Step 2: Commit**

```bash
git add veterinaias/app/api/medical-records/\[id\]/prescription/
git commit -m "feat: add prescription PDF generation API route"
```

---

### Task 9: Botón "Imprimir receta" en el detalle del expediente

**Files:**
- Modify: `veterinaias/app/dashboard/pets/[petId]/records/[recordId]/page.tsx`

- [ ] **Step 1: Agregar el botón en el header del expediente**

En `veterinaias/app/dashboard/pets/[petId]/records/[recordId]/page.tsx`, importa `Link` (ya está importado) y agrega el botón dentro del contenedor de acciones del header (el `<div className="flex items-center gap-2 shrink-0">` que contiene el `ShareConsultationModal`). El botón se muestra solo cuando hay recetas.

Primero, calcula si hay recetas (después de obtener `record`, junto a las otras constantes derivadas):

```typescript
const hasPrescriptions = ((record.prescriptions as any[]) ?? []).length > 0
```

Luego, dentro del `<div className="flex items-center gap-2 shrink-0">`, antes del `<ShareConsultationModal ... />`, agrega:

```tsx
{hasPrescriptions && (
  <a
    href={`/api/medical-records/${recordId}/prescription/pdf`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
  >
    <Printer size={14} />
    Imprimir receta
  </a>
)}
```

Agrega el import del ícono al inicio del archivo:
```typescript
import { Printer } from 'lucide-react'
```

- [ ] **Step 2: Verificar en browser**

1. Abre un expediente que **tenga al menos una receta** (`/dashboard/pets/[petId]/records/[recordId]`).
2. Verifica que aparece el botón "Imprimir receta" en el header.
3. Haz clic — debe abrirse el PDF en una pestaña nueva con: datos de la clínica, del veterinario (cédula o línea en blanco), paciente, propietario, diagnóstico/tratamiento (si existen), la lista de medicamentos, el espacio de firma y la leyenda "Reservado al tratamiento de animales".
4. Abre un expediente **sin recetas** y verifica que el botón NO aparece.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/dashboard/pets/\[petId\]/records/\[recordId\]/page.tsx
git commit -m "feat: add Imprimir receta button to medical record detail"
```
