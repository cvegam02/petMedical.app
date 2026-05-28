# VeterinaIAs — Plan 3: Agenda y Calendario

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el módulo de citas — listar por tab (Hoy / Próximas / Por confirmar), crear, ver detalle, transicionar estados (scheduled → confirmed → completed / cancelled / no_show), y al completar una cita enlazarla automáticamente con un nuevo registro clínico.

**Architecture:** Páginas como Server Components que consultan Supabase directo; formularios e interacciones de estado como Client Components. Al marcar una cita como "completada" el staff es redirigido al formulario de nueva consulta (Plan 2) con el `appointmentId` en la URL; al guardar el registro, la API cierra la cita automáticamente. Sin Google Calendar en esta fase (YAGNI).

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase JS v2 + @supabase/ssr, Zod v4, React Hook Form + zodResolver, shadcn/ui, Tailwind CSS, Vitest

> Plan 3 de 5. Construye sobre Plan 1 (foundation) y Plan 2 (dueños, mascotas, expediente).

---

## Contexto de Codebase

**Imports clave (igual que Plan 2):**
- Servidor: `import { createClient } from '@/lib/supabase/server'` → `const supabase = await createClient()`
- Browser: `import { createClient } from '@/lib/supabase/client'`
- Next.js 15: `params` y `searchParams` son `Promise<>` — siempre `await params` / `await searchParams`
- Zod v4: `result.error.issues[0].message` (no `.errors`)

**Tabla `appointments` ya existe** con columnas:
```
id, tenant_id, pet_id, owner_id, assigned_to, status (enum), scheduled_at,
duration_minutes, reason, notes, medical_record_id, origin_record_id,
google_event_id, created_by, created_at, updated_at
```

**Status enum ya existe en DB:** `scheduled | confirmed | completed | cancelled | no_show`

**RLS ya configurado:** tenant_id aísla los datos automáticamente.

**Owners API tiene búsqueda:** GET `/api/owners?q=texto` ya funciona.

**Pets API solo tiene POST** — hay que agregarle GET con `?ownerId=` en Task 1.

**Patrón de ruta API existente** (ver `app/api/medical-records/route.ts`):
```typescript
import { createClient as createServerClient } from '@/lib/supabase/server'
const supabase = await createServerClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })
```

**SidebarNav ya tiene el link a `/dashboard/appointments`** — solo falta crear la página.

---

## Mapa de Archivos

### Nuevos archivos
```
veterinaias/
├── lib/validations/appointment.ts                          # Zod schemas
├── app/api/appointments/
│   ├── route.ts                                            # GET (lista) + POST (crear)
│   └── [id]/route.ts                                       # GET (detalle) + PATCH (actualizar/status)
├── app/dashboard/appointments/
│   ├── page.tsx                                            # Lista con tabs
│   ├── new/page.tsx                                        # Página de nueva cita
│   └── [appointmentId]/page.tsx                           # Detalle de cita
├── components/appointments/
│   ├── AppointmentCard.tsx                                 # Tarjeta en la lista
│   ├── AppointmentForm.tsx                                 # Formulario crear (client)
│   └── StatusActions.tsx                                   # Botones de transición (client)
└── __tests__/api/appointments.test.ts
```

### Archivos modificados
```
app/api/pets/route.ts                                       # Agregar GET con ?ownerId=
lib/validations/medical-record.ts                          # Agregar appointment_id opcional
app/api/medical-records/route.ts                           # Si appointment_id presente, cerrar cita
components/medical-records/MedicalRecordForm.tsx           # Aceptar appointmentId prop
app/dashboard/pets/[petId]/records/new/page.tsx            # Leer ?appointmentId de searchParams
```

---

## Task 1: GET para la API de mascotas con filtro por dueño

**Files:**
- Modify: `app/api/pets/route.ts`
- Test: `__tests__/api/pets.test.ts` (ya existe, agregar caso)

- [ ] **Step 1: Agregar GET a `app/api/pets/route.ts`**

Abrir el archivo. Actualmente solo tiene `POST`. Agregar antes de la función POST:

```typescript
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ownerId = req.nextUrl.searchParams.get('ownerId')

  let query = (supabase.from('pets') as any)
    .select('id, name, sex, date_of_birth, species:species_id(id, name), breed:breed_id(id, name)')
    .order('name')

  if (ownerId) {
    query = query.eq('owner_id', ownerId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 2: Verificar que el build pasa**

```bash
cd veterinaias && npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/api/pets/route.ts
git commit -m "feat: add GET /api/pets with ?ownerId filter for appointment form"
```

---

## Task 2: Validation schema de citas

**Files:**
- Create: `lib/validations/appointment.ts`

- [ ] **Step 1: Crear `lib/validations/appointment.ts`**

```typescript
import { z } from 'zod'

export const appointmentSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  owner_id: z.string().uuid('Dueño es requerido'),
  assigned_to: z.string().uuid().optional().nullable(),
  scheduled_at: z.string().datetime('Fecha y hora inválidas'),
  duration_minutes: z.preprocess(
    v => Number(v),
    z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 3 horas')
  ),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

export const updateAppointmentSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.preprocess(
    v => Number(v),
    z.number().int().min(15).max(180)
  ).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

// Para el formulario del cliente (scheduled_at es el string del datetime-local input)
export const appointmentFormSchema = z.object({
  pet_id: z.string().uuid('Mascota es requerida'),
  owner_id: z.string().uuid('Dueño es requerido'),
  scheduled_at: z.string().min(1, 'Fecha y hora son requeridas'),
  duration_minutes: z.preprocess(v => Number(v), z.number().int().min(15).max(180)),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>
export type UpdateAppointmentValues = z.infer<typeof updateAppointmentSchema>
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add lib/validations/appointment.ts
git commit -m "feat: add appointment Zod validation schemas"
```

---

## Task 3: API GET + POST /api/appointments

**Files:**
- Create: `app/api/appointments/route.ts`
- Test: `__tests__/api/appointments.test.ts`

- [ ] **Step 1: Escribir el test primero** — crear `__tests__/api/appointments.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/appointments/route'

const mockUser = { id: 'user-1' }
const mockProfile = { tenant_id: 'tenant-1' }

function makeSupabase(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    insert: vi.fn().mockReturnThis(),
    ...overrides,
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
    from: vi.fn().mockReturnValue(chain),
  }
}

describe('GET /api/appointments', () => {
  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('no auth') }) },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as any)
    const req = new NextRequest('http://localhost/api/appointments')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with appointment list for authenticated user', async () => {
    const appointments = [{ id: 'apt-1', status: 'scheduled', scheduled_at: new Date().toISOString() }]
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: appointments, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    }
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as any)
    const req = new NextRequest('http://localhost/api/appointments')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
  })
})

describe('POST /api/appointments', () => {
  it('returns 422 for invalid body', async () => {
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    }
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as any)
    const req = new NextRequest('http://localhost/api/appointments', {
      method: 'POST',
      body: JSON.stringify({ reason: 'solo esto' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })
})
```

- [ ] **Step 2: Ejecutar el test — debe fallar**

```bash
npm run test -- __tests__/api/appointments.test.ts 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '@/app/api/appointments/route'`

- [ ] **Step 3: Crear `app/api/appointments/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { appointmentSchema } from '@/lib/validations/appointment'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tab = req.nextUrl.searchParams.get('tab') ?? 'hoy'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
  const in8Days = new Date(todayStart.getTime() + 8 * 86_400_000)
  const in2Days = new Date(todayStart.getTime() + 2 * 86_400_000)

  let query = (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .order('scheduled_at', { ascending: true })

  if (tab === 'hoy') {
    query = query
      .gte('scheduled_at', todayStart.toISOString())
      .lt('scheduled_at', tomorrowStart.toISOString())
  } else if (tab === 'proximas') {
    query = query
      .gte('scheduled_at', tomorrowStart.toISOString())
      .lt('scheduled_at', in8Days.toISOString())
  } else if (tab === 'confirmar') {
    query = query
      .gte('scheduled_at', now.toISOString())
      .lt('scheduled_at', in2Days.toISOString())
      .eq('status', 'scheduled')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin clínica asociada' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = appointmentSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  const { data, error } = await (supabase.from('appointments') as any)
    .insert({
      ...result.data,
      tenant_id: profile.tenant_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 4: Ejecutar el test — debe pasar**

```bash
npm run test -- __tests__/api/appointments.test.ts 2>&1 | tail -15
```

Expected: PASS — todos los tests en verde

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add app/api/appointments/route.ts __tests__/api/appointments.test.ts
git commit -m "feat: add GET+POST /api/appointments with tab-based date filters"
```

---

## Task 4: API GET + PATCH /api/appointments/[id]

**Files:**
- Create: `app/api/appointments/[id]/route.ts`

**Reglas de transición de estado:**
- `scheduled` → puede pasar a `confirmed` o `cancelled`
- `confirmed` → puede pasar a `cancelled` o `no_show`
- `completed` / `cancelled` / `no_show` → estados terminales, sin transición posible
- `completed` solo se puede asignar desde `app/api/medical-records/route.ts` (al guardar el registro clínico)

- [ ] **Step 1: Crear `app/api/appointments/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { updateAppointmentSchema } from '@/lib/validations/appointment'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['cancelled', 'no_show'],
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes, created_at,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone, email),
      assigned_to_profile:assigned_to(id, full_name),
      created_by_profile:created_by(id, full_name),
      medical_record:medical_record_id(id)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const result = updateAppointmentSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 })

  // Validar transición de estado si se está cambiando
  if (result.data.status) {
    const { data: current, error: fetchError } = await (supabase.from('appointments') as any)
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !current) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

    const allowed = ALLOWED_TRANSITIONS[current.status as string] ?? []
    if (!allowed.includes(result.data.status)) {
      return NextResponse.json(
        { error: `No se puede pasar de '${current.status}' a '${result.data.status}'` },
        { status: 422 }
      )
    }
  }

  const { data, error } = await (supabase.from('appointments') as any)
    .update(result.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/api/appointments/[id]/route.ts
git commit -m "feat: add GET+PATCH /api/appointments/[id] with status transition validation"
```

---

## Task 5: Lista de citas + AppointmentCard

**Files:**
- Create: `app/dashboard/appointments/page.tsx`
- Create: `components/appointments/AppointmentCard.tsx`

- [ ] **Step 1: Crear `components/appointments/AppointmentCard.tsx`**

```typescript
import Link from 'next/link'
import { ChevronRight, Clock, Phone } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled:  { label: 'Programada',      className: 'bg-muted text-muted-foreground border-border' },
  confirmed:  { label: 'Confirmada',      className: 'bg-primary/10 text-primary border-primary/20' },
  completed:  { label: 'Completada',      className: 'bg-primary/20 text-primary border-primary/30' },
  cancelled:  { label: 'Cancelada',       className: 'bg-destructive/10 text-destructive border-destructive/20' },
  no_show:    { label: 'No se presentó',  className: 'bg-orange-50 text-orange-600 border-orange-200' },
}

interface AppointmentCardProps {
  appointment: {
    id: string
    status: string
    scheduled_at: string
    duration_minutes: number
    reason: string | null
    pet: { id: string; name: string; species: { name: string } | null } | null
    owner: { id: string; full_name: string; phone: string | null } | null
    assigned_to_profile: { full_name: string } | null
  }
  showPhone?: boolean
}

export function AppointmentCard({ appointment, showPhone }: AppointmentCardProps) {
  const time = new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })
  const status = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.scheduled

  return (
    <Link
      href={`/dashboard/appointments/${appointment.id}`}
      className="group flex items-center gap-4 bg-card rounded-xl border border-border px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      {/* Time block */}
      <div className="flex flex-col items-center w-14 shrink-0">
        <span className="text-base font-semibold text-foreground leading-none">{time}</span>
        <span className="text-[11px] text-muted-foreground/60 mt-0.5 flex items-center gap-0.5">
          <Clock size={9} />
          {appointment.duration_minutes} min
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-border shrink-0" />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground leading-none">
            {appointment.pet?.name ?? '—'}
          </p>
          {appointment.pet?.species && (
            <span className="text-[11px] text-muted-foreground/60">
              {appointment.pet.species.name}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {appointment.owner?.full_name ?? '—'}
          {appointment.reason ? ` · ${appointment.reason}` : ''}
        </p>
        {showPhone && appointment.owner?.phone && (
          <p className="text-xs text-primary mt-1 flex items-center gap-1">
            <Phone size={10} />
            {appointment.owner.phone}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${status.className}`}>
        {status.label}
      </span>

      <ChevronRight
        size={15}
        className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0"
      />
    </Link>
  )
}
```

- [ ] **Step 2: Crear `app/dashboard/appointments/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'

const TABS = [
  { key: 'hoy',      label: 'Hoy' },
  { key: 'proximas', label: 'Próximas' },
  { key: 'confirmar',label: 'Por confirmar' },
]

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'hoy' } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
  const in8Days = new Date(todayStart.getTime() + 8 * 86_400_000)
  const in2Days = new Date(todayStart.getTime() + 2 * 86_400_000)

  let query = (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone),
      assigned_to_profile:assigned_to(id, full_name)
    `)
    .order('scheduled_at', { ascending: true })

  if (tab === 'hoy') {
    query = query
      .gte('scheduled_at', todayStart.toISOString())
      .lt('scheduled_at', tomorrowStart.toISOString())
  } else if (tab === 'proximas') {
    query = query
      .gte('scheduled_at', tomorrowStart.toISOString())
      .lt('scheduled_at', in8Days.toISOString())
  } else if (tab === 'confirmar') {
    query = query
      .gte('scheduled_at', now.toISOString())
      .lt('scheduled_at', in2Days.toISOString())
      .eq('status', 'scheduled')
  }

  const { data: appointments } = await query
  const list = (appointments as any[]) ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-0.5">
            Agenda
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Citas</h1>
        </div>
        <Link href="/dashboard/appointments/new" className={buttonVariants({ size: 'sm' })}>
          <Plus size={14} className="mr-1.5" />
          Nueva cita
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`/dashboard/appointments?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Callout for confirmar tab */}
      {tab === 'confirmar' && list.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 text-sm text-foreground">
          Estas citas necesitan confirmación. Llama al dueño y marca la cita como confirmada.
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <p className="font-medium text-foreground mb-1">
            {tab === 'hoy' ? 'Sin citas para hoy' : tab === 'proximas' ? 'Sin citas próximas' : 'No hay citas pendientes de confirmar'}
          </p>
          <p className="text-sm text-muted-foreground">
            {tab === 'confirmar' ? 'Todas las citas próximas están confirmadas.' : 'Agrega una nueva cita para comenzar.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((apt: any) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              showPhone={tab === 'confirmar'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/appointments/page.tsx components/appointments/AppointmentCard.tsx
git commit -m "feat: add appointments list page with Hoy/Próximas/Por confirmar tabs"
```

---

## Task 6: Formulario de nueva cita

**Files:**
- Create: `components/appointments/AppointmentForm.tsx`
- Create: `app/dashboard/appointments/new/page.tsx`

- [ ] **Step 1: Crear `components/appointments/AppointmentForm.tsx`**

```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { appointmentFormSchema, type AppointmentFormValues } from '@/lib/validations/appointment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TeamMember { id: string; full_name: string }

interface AppointmentFormProps {
  team: TeamMember[]
}

export function AppointmentForm({ team }: AppointmentFormProps) {
  const router = useRouter()
  const [ownerQuery, setOwnerQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; full_name: string } | null>(null)
  const [pets, setPets] = useState<{ id: string; name: string; species: { name: string } | null }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema) as any,
    defaultValues: { duration_minutes: 30 },
  })

  // Buscar dueños con debounce
  useEffect(() => {
    if (ownerQuery.length < 2) { setOwnerResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/owners?q=${encodeURIComponent(ownerQuery)}`)
      const json = await res.json()
      setOwnerResults(json.data ?? [])
      setShowSuggestions(true)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [ownerQuery])

  // Cargar mascotas cuando se selecciona dueño
  useEffect(() => {
    if (!selectedOwner) { setPets([]); return }
    fetch(`/api/pets?ownerId=${selectedOwner.id}`)
      .then(r => r.json())
      .then(json => setPets(json.data ?? []))
  }, [selectedOwner])

  function selectOwner(owner: { id: string; full_name: string; phone: string | null }) {
    setSelectedOwner(owner)
    setOwnerQuery(owner.full_name)
    setShowSuggestions(false)
    setValue('owner_id', owner.id)
    setValue('pet_id', '')
  }

  const onSubmit = async (values: AppointmentFormValues) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          scheduled_at: new Date(values.scheduled_at).toISOString(),
          duration_minutes: Number(values.duration_minutes),
        }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? 'Error al guardar'); return }
      router.push(`/dashboard/appointments/${json.data.id}`)
      router.refresh()
    } catch {
      alert('Error de red. Intenta de nuevo.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register('owner_id')} />
      <input type="hidden" {...register('pet_id')} />

      {/* Dueño */}
      <div className="relative">
        <Label htmlFor="owner_search">Dueño *</Label>
        <Input
          id="owner_search"
          value={ownerQuery}
          onChange={e => { setOwnerQuery(e.target.value); setSelectedOwner(null) }}
          onFocus={() => ownerResults.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Buscar por nombre, teléfono o email..."
          autoComplete="off"
        />
        {errors.owner_id && <p className="text-destructive text-xs mt-1">{errors.owner_id.message}</p>}
        {showSuggestions && ownerResults.length > 0 && (
          <ul className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
            {ownerResults.map(o => (
              <li key={o.id}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onMouseDown={() => selectOwner(o)}
                >
                  <span className="font-medium">{o.full_name}</span>
                  {o.phone && <span className="text-muted-foreground ml-2">{o.phone}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mascota */}
      <div>
        <Label htmlFor="pet_id">Mascota *</Label>
        <select
          id="pet_id"
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          disabled={!selectedOwner || pets.length === 0}
          onChange={e => setValue('pet_id', e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            {!selectedOwner ? 'Selecciona un dueño primero' : pets.length === 0 ? 'Este dueño no tiene mascotas' : 'Selecciona una mascota'}
          </option>
          {pets.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.species ? ` (${p.species.name})` : ''}
            </option>
          ))}
        </select>
        {errors.pet_id && <p className="text-destructive text-xs mt-1">{errors.pet_id.message}</p>}
      </div>

      {/* Fecha y hora */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="scheduled_at">Fecha y hora *</Label>
          <Input
            id="scheduled_at"
            type="datetime-local"
            {...register('scheduled_at')}
          />
          {errors.scheduled_at && <p className="text-destructive text-xs mt-1">{errors.scheduled_at.message}</p>}
        </div>
        <div>
          <Label htmlFor="duration_minutes">Duración</Label>
          <select
            id="duration_minutes"
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
            {...register('duration_minutes')}
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 hora</option>
            <option value={90}>1.5 horas</option>
          </select>
        </div>
      </div>

      {/* Motivo */}
      <div>
        <Label htmlFor="reason">Motivo de la cita</Label>
        <Input id="reason" {...register('reason')} placeholder="Ej. Consulta general, vacunación, cirugía..." />
      </div>

      {/* Asignar a */}
      {team.length > 0 && (
        <div>
          <Label htmlFor="assigned_to">Asignar a</Label>
          <select
            id="assigned_to"
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
            {...register('assigned_to')}
            defaultValue=""
          >
            <option value="">Sin asignar</option>
            {team.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Notas */}
      <div>
        <Label htmlFor="notes">Notas internas</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={2}
          className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none bg-background"
          placeholder="Observaciones para el equipo..."
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Crear cita'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Crear `app/dashboard/appointments/new/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'

export default async function NewAppointmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name')

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Citas
      </Link>

      <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Agenda</p>
      <h1 className="text-xl font-semibold tracking-tight text-foreground mb-6">Nueva cita</h1>

      <AppointmentForm team={(team as any[]) ?? []} />
    </div>
  )
}
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add components/appointments/AppointmentForm.tsx app/dashboard/appointments/new/page.tsx
git commit -m "feat: add new appointment page with owner search and pet selection"
```

---

## Task 7: Detalle de cita + acciones de estado

**Files:**
- Create: `components/appointments/StatusActions.tsx`
- Create: `app/dashboard/appointments/[appointmentId]/page.tsx`

- [ ] **Step 1: Crear `components/appointments/StatusActions.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'

interface StatusActionsProps {
  appointmentId: string
  petId: string
  status: string
}

export function StatusActions({ appointmentId, petId, status }: StatusActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function transition(newStatus: string) {
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? 'Error al actualizar'); return }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  if (status === 'scheduled') {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => transition('confirmed')}
          disabled={loading === 'confirmed'}
        >
          {loading === 'confirmed' ? 'Confirmando...' : 'Confirmar cita'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => transition('cancelled')}
          disabled={loading === 'cancelled'}
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
        >
          {loading === 'cancelled' ? 'Cancelando...' : 'Cancelar cita'}
        </Button>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/dashboard/pets/${petId}/records/new?appointmentId=${appointmentId}`}
          className={buttonVariants({ size: 'sm' })}
        >
          Registrar consulta
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => transition('no_show')}
          disabled={loading === 'no_show'}
        >
          {loading === 'no_show' ? '...' : 'No se presentó'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => transition('cancelled')}
          disabled={loading === 'cancelled'}
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
        >
          {loading === 'cancelled' ? 'Cancelando...' : 'Cancelar cita'}
        </Button>
      </div>
    )
  }

  // Terminal states
  const messages: Record<string, string> = {
    completed: 'Esta cita fue completada y tiene un registro clínico asociado.',
    cancelled:  'Esta cita fue cancelada.',
    no_show:    'El dueño no se presentó a esta cita.',
  }
  return (
    <p className="text-sm text-muted-foreground">{messages[status] ?? ''}</p>
  )
}
```

- [ ] **Step 2: Crear `app/dashboard/appointments/[appointmentId]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock, Calendar } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { StatusActions } from '@/components/appointments/StatusActions'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show:   'No se presentó',
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-muted text-muted-foreground border-border',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show:   'bg-orange-50 text-orange-600 border-orange-200',
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>
}) {
  const { appointmentId } = await params
  const supabase = await createClient()

  const { data: appointment, error } = await (supabase.from('appointments') as any)
    .select(`
      id, status, scheduled_at, duration_minutes, reason, notes, created_at,
      pet:pet_id(id, name, species:species_id(name)),
      owner:owner_id(id, full_name, phone, email),
      assigned_to_profile:assigned_to(id, full_name),
      created_by_profile:created_by(id, full_name),
      medical_record:medical_record_id(id)
    `)
    .eq('id', appointmentId)
    .single()

  if (error || !appointment) notFound()

  const pet = appointment.pet as any
  const owner = appointment.owner as any
  const assignedTo = appointment.assigned_to_profile as any
  const createdBy = appointment.created_by_profile as any
  const medicalRecord = appointment.medical_record as any

  const date = new Date(appointment.scheduled_at).toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const time = new Date(appointment.scheduled_at).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div>
      <Link
        href="/dashboard/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Citas
      </Link>

      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Cita</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {pet?.name ?? '—'}
              {pet?.species ? <span className="text-muted-foreground font-normal text-base ml-2">{pet.species.name}</span> : null}
            </h1>
          </div>
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border shrink-0 ${STATUS_STYLES[appointment.status] ?? STATUS_STYLES.scheduled}`}>
            {STATUS_LABELS[appointment.status] ?? appointment.status}
          </span>
        </div>

        {/* Date/time */}
        <div className="flex flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar size={14} className="text-muted-foreground/50" />
            <span className="capitalize">{date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} className="text-muted-foreground/50" />
            {time} · {appointment.duration_minutes} min
          </div>
        </div>

        {/* People */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Dueño</p>
            <Link
              href={`/dashboard/owners/${owner?.id}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {owner?.full_name ?? '—'}
            </Link>
            {owner?.phone && <p className="text-xs text-muted-foreground mt-0.5">{owner.phone}</p>}
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Mascota</p>
            <Link
              href={`/dashboard/pets/${pet?.id}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {pet?.name ?? '—'}
            </Link>
          </div>
          {assignedTo && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Atendido por</p>
              <p className="text-sm text-foreground">{assignedTo.full_name}</p>
            </div>
          )}
          {createdBy && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Creado por</p>
              <p className="text-sm text-muted-foreground">{createdBy.full_name}</p>
            </div>
          )}
        </div>

        {appointment.reason && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Motivo</p>
            <p className="text-sm text-foreground">{appointment.reason}</p>
          </div>
        )}

        {appointment.notes && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1">Notas</p>
            <p className="text-sm text-muted-foreground italic">{appointment.notes}</p>
          </div>
        )}

        {/* Linked medical record */}
        {medicalRecord && (
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-2">Consulta registrada</p>
            <Link
              href={`/dashboard/pets/${pet?.id}/records/${medicalRecord.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Ver registro clínico
            </Link>
          </div>
        )}
      </div>

      {/* Status actions */}
      <StatusActions
        appointmentId={appointmentId}
        petId={pet?.id ?? ''}
        status={appointment.status}
      />
    </div>
  )
}
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add components/appointments/StatusActions.tsx app/dashboard/appointments/[appointmentId]/page.tsx
git commit -m "feat: add appointment detail page with status actions"
```

---

## Task 8: Enlazar cita con registro clínico al completar

Cuando el staff presiona "Registrar consulta" en una cita `confirmed`, es redirigido a `/dashboard/pets/${petId}/records/new?appointmentId=${appointmentId}`. Al guardar el registro, la API marca la cita como `completed` y guarda el `medical_record_id`.

**Files:**
- Modify: `lib/validations/medical-record.ts`
- Modify: `app/api/medical-records/route.ts`
- Modify: `components/medical-records/MedicalRecordForm.tsx`
- Modify: `app/dashboard/pets/[petId]/records/new/page.tsx`

- [ ] **Step 1: Agregar `appointment_id` al schema — `lib/validations/medical-record.ts`**

Abrir el archivo. Al final del objeto `medicalRecordSchema` agregar el campo:

```typescript
// Dentro del objeto z.object({...}) al final, antes del cierre:
appointment_id: z.string().uuid().optional(),
```

También agregar al export de tipos:
```typescript
export type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>
// (ya existe, solo verificar que incluye appointment_id)
```

- [ ] **Step 2: Modificar `app/api/medical-records/route.ts`**

Abrir el archivo. Después del bloque que crea el `record` y las prescripciones, agregar antes del `return`:

```typescript
  // Si viene con appointment_id, cerrar la cita automáticamente
  if (result.data.appointment_id) {
    await (supabase.from('appointments') as any)
      .update({
        status: 'completed',
        medical_record_id: record.id,
      })
      .eq('id', result.data.appointment_id)
      .eq('tenant_id', profile.tenant_id)
  }
```

- [ ] **Step 3: Modificar `components/medical-records/MedicalRecordForm.tsx`**

Cambiar la interfaz de props:
```typescript
interface MedicalRecordFormProps {
  petId: string
  appointmentId?: string
}

export function MedicalRecordForm({ petId, appointmentId }: MedicalRecordFormProps) {
```

En el `onSubmit`, incluir `appointment_id` si existe:
```typescript
body: JSON.stringify({
  ...values,
  ...(appointmentId ? { appointment_id: appointmentId } : {}),
}),
```

- [ ] **Step 4: Modificar `app/dashboard/pets/[petId]/records/new/page.tsx`**

Cambiar la firma del componente para leer `searchParams`:
```typescript
export default async function NewRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ petId: string }>
  searchParams: Promise<{ appointmentId?: string }>
}) {
  const { petId } = await params
  const { appointmentId } = await searchParams
  // ...
```

Y pasar `appointmentId` al formulario:
```typescript
<MedicalRecordForm petId={petId} appointmentId={appointmentId} />
```

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add lib/validations/medical-record.ts app/api/medical-records/route.ts \
        components/medical-records/MedicalRecordForm.tsx \
        app/dashboard/pets/[petId]/records/new/page.tsx
git commit -m "feat: auto-complete appointment when medical record is saved"
```

---

## Task 9: Tests para citas

**Files:**
- Modify: `__tests__/api/appointments.test.ts` (ampliar el que se creó en Task 3)

- [ ] **Step 1: Ampliar `__tests__/api/appointments.test.ts` con tests de PATCH**

Agregar al archivo existente:

```typescript
import { PATCH } from '@/app/api/appointments/[id]/route'

describe('PATCH /api/appointments/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('no auth') }) },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as any)
    const req = new NextRequest('http://localhost/api/appointments/apt-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'confirmed' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'apt-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 422 for invalid status transition', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn()
        .mockResolvedValueOnce({ data: mockProfile, error: null }) // profile
        .mockResolvedValueOnce({ data: { status: 'completed' }, error: null }), // current appointment
    }
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as any)
    const req = new NextRequest('http://localhost/api/appointments/apt-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'confirmed' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'apt-1' }) })
    expect(res.status).toBe(422)
  })
})
```

- [ ] **Step 2: Ejecutar todos los tests**

```bash
npm run test 2>&1 | tail -20
```

Expected: todos los tests en verde (o con los mismos fallos previos al plan — no introducir regresiones)

- [ ] **Step 3: Build final**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add __tests__/api/appointments.test.ts
git commit -m "test: add appointments API tests for GET, POST and PATCH transitions"
```

---

## Self-Review

### Spec coverage

| Requisito del spec | Cubierto por |
|--------------------|-------------|
| Estados: scheduled→confirmed→completed/cancelled/no_show | Task 4 (API PATCH) |
| Calendario compartido Plan Individual | Task 5 (lista por tabs) |
| Confirmación manual: vista de citas pendientes | Task 5 (tab "Por confirmar" con teléfono visible) |
| Completed genera MedicalRecord automáticamente | Task 8 |
| origin_record_id (seguimiento) | No en este plan — YAGNI, scope para futuro |
| Google Calendar | No en este plan — YAGNI |
| Google Calendar por doctor (Plan Empresa) | No en este plan — YAGNI |

### No placeholders ✓
Todos los pasos tienen código completo. No hay "TBD" ni "implementar después".

### Consistencia de tipos ✓
- `appointmentFormSchema` → `AppointmentFormValues` — usado en Task 6
- `updateAppointmentSchema` → `UpdateAppointmentValues` — usado en Task 4
- `ALLOWED_TRANSITIONS` definido en Task 4, no referenciado en otros tasks
- `STATUS_CONFIG` definido en Task 5 (AppointmentCard) y replicado en Task 7 (detail page) — correcto, son componentes independientes
