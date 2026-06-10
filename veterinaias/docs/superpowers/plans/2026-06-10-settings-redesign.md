# Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los 7 tabs horizontales de Configuración con un sidebar permanente que tiene 4 secciones consolidadas, usando el patrón "settings reemplaza el nav principal" de GitHub Settings.

**Architecture:** Se crea `AppSidebar` (Client Component) que conmuta entre el sidebar principal y el `SettingsSidebar` según la ruta actual. El `dashboard/layout.tsx` (Server Component) pasa `role` a `AppSidebar` y éste decide qué sidebar renderizar. El `SettingsSidebar` usa `usePathname()` + `useSearchParams()` para el active state de secciones y sub-tabs.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, shadcn/ui, lucide-react, `next/navigation` hooks.

**Spec:** `docs/superpowers/specs/2026-06-10-settings-redesign-design.md`

---

## File Map

| Acción | Archivo |
|--------|---------|
| Crear | `veterinaias/components/settings/SettingsSidebar.tsx` |
| Crear | `veterinaias/components/dashboard/AppSidebar.tsx` |
| Modificar | `veterinaias/app/dashboard/layout.tsx` |
| Modificar | `veterinaias/app/dashboard/settings/layout.tsx` |
| Modificar | `veterinaias/app/dashboard/settings/clinica/page.tsx` |
| Modificar | `veterinaias/app/dashboard/settings/catalogos/page.tsx` |
| Crear | `veterinaias/app/dashboard/settings/page.tsx` |
| Eliminar | `veterinaias/components/settings/SettingsNav.tsx` |
| Eliminar | `veterinaias/app/dashboard/settings/configuracion/page.tsx` |
| Eliminar | `veterinaias/app/dashboard/settings/recetas/page.tsx` |
| Eliminar | `veterinaias/app/dashboard/settings/servicios/page.tsx` |

---

### Task 1: SettingsSidebar — sidebar de configuración

**Files:**
- Create: `veterinaias/components/settings/SettingsSidebar.tsx`

El sidebar oscuro que reemplaza al nav principal cuando el usuario está en `/dashboard/settings/*`. Usa `usePathname()` + `useSearchParams()` para active state. Las secciones Clínica y Catálogos muestran siempre sus sub-items expandidos.

- [ ] **Step 1: Crear el archivo**

```tsx
'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Building2, BookOpen, Plug, Users, ChevronLeft } from 'lucide-react'

interface SubItem {
  label: string
  href: string
  tab?: string
}

interface Section {
  label: string
  icon: React.ElementType
  href: string
  items?: SubItem[]
}

const SECTIONS: Section[] = [
  {
    label: 'Clínica',
    icon: Building2,
    href: '/dashboard/settings/clinica',
    items: [
      { label: 'Información', href: '/dashboard/settings/clinica' },
      { label: 'General',     href: '/dashboard/settings/clinica', tab: 'general' },
      { label: 'Recetas',     href: '/dashboard/settings/clinica', tab: 'recetas' },
    ],
  },
  {
    label: 'Catálogos',
    icon: BookOpen,
    href: '/dashboard/settings/catalogos',
    items: [
      { label: 'Vacunas',       href: '/dashboard/settings/catalogos' },
      { label: 'Medicamentos',  href: '/dashboard/settings/catalogos', tab: 'medicamentos' },
      { label: 'Estética',      href: '/dashboard/settings/catalogos', tab: 'estetica' },
    ],
  },
  { label: 'Integraciones', icon: Plug,  href: '/dashboard/settings/integraciones' },
  { label: 'Equipo',        icon: Users, href: '/dashboard/settings/team' },
]

export function SettingsSidebar() {
  const pathname   = usePathname()
  const searchParams = useSearchParams()
  const currentTab   = searchParams.get('tab')

  function subItemUrl(item: SubItem): string {
    return item.tab ? `${item.href}?tab=${item.tab}` : item.href
  }

  function isSubItemActive(item: SubItem): boolean {
    if (pathname !== item.href) return false
    return item.tab ? currentTab === item.tab : !currentTab
  }

  function isSectionActive(section: Section): boolean {
    return pathname.startsWith(section.href)
  }

  return (
    <aside className="w-56 h-full flex flex-col bg-secondary border-r border-border shrink-0">

      {/* Back link (replaces brand) */}
      <div className="px-4 h-14 flex items-center shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-foreground/55 hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2} />
          Dashboard
        </Link>
      </div>

      <div className="mx-4 border-t border-border" />

      {/* Overline */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-[10px] font-bold text-secondary-foreground/60 uppercase tracking-[0.14em]">
          Configuración
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
        {SECTIONS.map((section) => {
          const Icon    = section.icon
          const active  = isSectionActive(section)
          return (
            <div key={section.href}>
              {/* Section row */}
              {section.items ? (
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    active ? 'text-foreground font-semibold' : 'text-foreground/55'
                  }`}
                >
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.5 : 1.75}
                    className={active ? 'text-foreground' : 'text-foreground/40'}
                  />
                  <span className="tracking-tight">{section.label}</span>
                </div>
              ) : (
                <Link
                  href={section.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    active
                      ? 'bg-card text-primary font-semibold shadow-sm border border-primary/10'
                      : 'text-foreground/55 hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.5 : 1.75}
                    className={active ? 'text-primary' : 'text-foreground/40'}
                  />
                  <span className="tracking-tight">{section.label}</span>
                </Link>
              )}

              {/* Sub-items */}
              {section.items && (
                <div className="ml-8 mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const subActive = isSubItemActive(item)
                    return (
                      <Link
                        key={subItemUrl(item)}
                        href={subItemUrl(item)}
                        className={`block px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                          subActive
                            ? 'bg-card text-primary font-semibold shadow-sm border border-primary/10'
                            : 'text-foreground/55 hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/settings/SettingsSidebar.tsx
git commit -m "feat: SettingsSidebar — sidebar oscuro con 4 secciones y sub-tabs activos"
```

---

### Task 2: AppSidebar — componente que conmuta sidebars

**Files:**
- Create: `veterinaias/components/dashboard/AppSidebar.tsx`

Client Component que detecta si la ruta actual empieza con `/dashboard/settings`. Si sí, renderiza `SettingsSidebar`. Si no, renderiza el sidebar principal (brand + SidebarNav).

- [ ] **Step 1: Crear el archivo**

```tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'

interface AppSidebarProps {
  role: string
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname()

  if (pathname.startsWith('/dashboard/settings')) {
    return <SettingsSidebar />
  }

  return (
    <aside className="w-56 h-full flex flex-col bg-secondary border-r border-border shrink-0">
      <div className="px-4 h-14 flex items-center shrink-0">
        <Link href="/dashboard">
          <Image
            src="/mundeopet.png"
            alt="MundoPet"
            width={180}
            height={75}
            className="object-contain"
            priority
          />
        </Link>
      </div>
      <div className="mx-4 border-t border-border" />
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <SidebarNav role={role} />
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/dashboard/AppSidebar.tsx
git commit -m "feat: AppSidebar — conmuta entre sidebar principal y SettingsSidebar"
```

---

### Task 3: Actualizar dashboard/layout.tsx

**Files:**
- Modify: `veterinaias/app/dashboard/layout.tsx`

Reemplazar el `<aside>` inline + `<SidebarNav>` con el nuevo `<AppSidebar role={...} />`. El layout sigue siendo un Server Component — AppSidebar es el único Client Component que se introduce.

- [ ] **Step 1: Editar el archivo**

Reemplazar el bloque `<aside>` entero (líneas 40-63) y el import de `SidebarNav`:

```tsx
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserMenu } from '@/components/dashboard/UserMenu'
import { Toaster } from 'sonner'
import { AppSidebar } from '@/components/dashboard/AppSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  interface DashboardProfile {
    full_name: string
    role: string
    tenant_id: string | null
    tenants: { name: string; settings: { logo_url?: string | null } | null } | null
  }

  const { data: profile } = (await supabase
    .from('user_profiles')
    .select('full_name, role, tenant_id, tenants(name, settings)')
    .eq('id', user!.id)
    .single()) as { data: DashboardProfile | null; error: unknown }

  const tenantName    = profile?.tenants?.name ?? ''
  const tenantLogoUrl = (profile?.tenants?.settings as any)?.logo_url ?? null
  const initials      = profile?.full_name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <div className="h-dvh flex flex-col border-t-[3px] border-secondary-foreground bg-background overflow-hidden">
      <div className="flex flex-1 min-h-0">

        {/* Sidebar — conmuta entre principal y settings */}
        <AppSidebar role={profile?.role ?? ''} />

        {/* Content column */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Topbar */}
          <header className="h-14 shrink-0 sticky top-0 z-20 bg-card border-b border-border shadow-sm flex items-center px-6 relative">
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              {tenantLogoUrl ? (
                <div className="w-[55px] h-[55px] rounded-md border border-border bg-card overflow-hidden shrink-0 flex items-center justify-center">
                  <Image src={tenantLogoUrl} alt={tenantName} width={55} height={55} className="object-contain" unoptimized />
                </div>
              ) : null}
              <p className="text-sm font-semibold text-secondary-foreground tracking-tight">{tenantName}</p>
            </div>
            <div className="flex-1 flex items-center justify-end">
              <UserMenu
                fullName={profile?.full_name ?? ''}
                role={profile?.role ?? ''}
                initials={initials}
              />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-10 py-10">
              {children}
            </div>
          </main>
        </div>
      </div>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}
```

- [ ] **Step 2: Verificar en browser**

Navegar a `http://localhost:3000/dashboard` — debe verse idéntico al estado anterior (mismo sidebar principal). Navegar a `http://localhost:3000/dashboard/settings/clinica` — debe aparecer el SettingsSidebar oscuro con "← Dashboard" y las 4 secciones.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/dashboard/layout.tsx
git commit -m "feat: dashboard layout usa AppSidebar — conmuta a SettingsSidebar en /settings"
```

---

### Task 4: Simplificar settings/layout.tsx

**Files:**
- Modify: `veterinaias/app/dashboard/settings/layout.tsx`

Eliminar el header "Configuración" y `<SettingsNav />`. Solo mantener el guard de admin. El `SettingsSidebar` ya provee navegación y context visual — no hace falta duplicarlo en el layout.

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') redirect('/dashboard')

  return <>{children}</>
}
```

- [ ] **Step 2: Verificar en browser**

`http://localhost:3000/dashboard/settings/clinica` — el header "Configuración" y los tabs horizontales ya no deben aparecer. Solo el SettingsSidebar a la izquierda y el contenido de la página a la derecha.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/dashboard/settings/layout.tsx
git commit -m "refactor: settings layout — eliminar header y SettingsNav, solo guard admin"
```

---

### Task 5: Actualizar clinica/page.tsx — sub-tabs General y Recetas

**Files:**
- Modify: `veterinaias/app/dashboard/settings/clinica/page.tsx`

Convertir la página de Clínica para manejar 3 sub-tabs via `searchParams.tab`. Una sola query de datos cubre los 3 sub-tabs. Pill-tabs ligeros para la navegación interna.

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClinicaForm } from '@/components/settings/ClinicaForm'
import { ConfiguracionForm } from '@/components/settings/ConfiguracionForm'
import { PrescriptionConfigForm } from '@/components/settings/PrescriptionConfigForm'

type ClinicaTab = 'info' | 'general' | 'recetas'

const TABS: { value: ClinicaTab; label: string; href: string }[] = [
  { value: 'info',    label: 'Información', href: '/dashboard/settings/clinica' },
  { value: 'general', label: 'General',     href: '/dashboard/settings/clinica?tab=general' },
  { value: 'recetas', label: 'Recetas',     href: '/dashboard/settings/clinica?tab=recetas' },
]

export default async function SettingsClinicaPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const tab: ClinicaTab =
    searchParams.tab === 'general' ? 'general'
    : searchParams.tab === 'recetas' ? 'recetas'
    : 'info'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name, settings)')
    .eq('id', user.id)
    .single() as any

  const tenant   = profile?.tenants
  const settings = tenant?.settings ?? {}

  return (
    <div className="space-y-6">

      {/* Sub-tab nav */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ value, label, href }) => (
          <Link
            key={value}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Content */}
      {tab === 'info' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Datos de la clínica</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Esta información aparece en PDFs y documentos generados.
            </p>
          </div>
          <ClinicaForm
            name={tenant?.name ?? ''}
            address={settings.address ?? null}
            phone={settings.phone ?? null}
            logoUrl={settings.logo_url ?? null}
          />
        </div>
      )}

      {tab === 'general' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Configuración general</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ajusta el comportamiento de la plataforma para tu clínica.
            </p>
          </div>
          <ConfiguracionForm
            confirmationReminderDays={settings.confirmation_reminder_days ?? 2}
            shareLinkExpiryDays={settings.share_link_expiry_days ?? 7}
          />
        </div>
      )}

      {tab === 'recetas' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recetas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configura los textos opcionales que aparecen en las recetas impresas.
            </p>
          </div>
          <PrescriptionConfigForm
            footerNote={settings.prescription_footer_note ?? null}
            validityDays={settings.prescription_validity_days ?? null}
          />
        </div>
      )}

    </div>
  )
}
```

- [ ] **Step 2: Verificar en browser**

- `http://localhost:3000/dashboard/settings/clinica` → muestra tab "Información" activo, formulario de clínica
- `http://localhost:3000/dashboard/settings/clinica?tab=general` → muestra tab "General" activo, 2 campos de config
- `http://localhost:3000/dashboard/settings/clinica?tab=recetas` → muestra tab "Recetas" activo, 2 campos de recetas
- En el SettingsSidebar, el sub-item correspondiente debe estar activo (resaltado en verde)

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/dashboard/settings/clinica/page.tsx
git commit -m "feat: clinica settings — sub-tabs Información, General, Recetas unificados en una página"
```

---

### Task 6: Actualizar catalogos/page.tsx — agregar tab Estética

**Files:**
- Modify: `veterinaias/app/dashboard/settings/catalogos/page.tsx`

Agregar el tab "Estética" con `GroomingServiceCatalogTab`. Convertir el estado de tab de `useState` a URL-based (`useSearchParams` + `useRouter`) para que el SettingsSidebar pueda reflejar el sub-tab activo.

- [ ] **Step 1: Reemplazar el archivo completo**

```tsx
'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { VaccineCatalogTab } from '@/components/settings/VaccineCatalogTab'
import { MedicationCatalogTab } from '@/components/settings/MedicationCatalogTab'
import { GroomingServiceCatalogTab } from '@/components/settings/GroomingServiceCatalogTab'

type Tab = 'vaccines' | 'medications' | 'estetica'

const TABS: { value: Tab; label: string; param?: string }[] = [
  { value: 'vaccines',     label: 'Vacunas' },
  { value: 'medications',  label: 'Medicamentos', param: 'medicamentos' },
  { value: 'estetica',     label: 'Estética',     param: 'estetica' },
]

export default function CatalogosPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const rawTab = searchParams.get('tab')
  const tab: Tab =
    rawTab === 'medicamentos' ? 'medications'
    : rawTab === 'estetica'   ? 'estetica'
    : 'vaccines'

  function navigate(t: Tab) {
    const tabConfig = TABS.find(x => x.value === t)
    if (tabConfig?.param) {
      router.push(`${pathname}?tab=${tabConfig.param}`)
    } else {
      router.push(pathname)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Catálogos</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestiona las vacunas, medicamentos y servicios disponibles en tu clínica.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => navigate(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? 'border-secondary-foreground text-secondary-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'vaccines'    && <VaccineCatalogTab />}
        {tab === 'medications' && <MedicationCatalogTab />}
        {tab === 'estetica'    && <GroomingServiceCatalogTab />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar en browser**

- `http://localhost:3000/dashboard/settings/catalogos` → tab Vacunas activo
- `http://localhost:3000/dashboard/settings/catalogos?tab=medicamentos` → tab Medicamentos activo
- `http://localhost:3000/dashboard/settings/catalogos?tab=estetica` → tab Estética activo, muestra el catálogo de servicios de grooming
- El SettingsSidebar debe marcar el sub-item correcto en cada caso

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/dashboard/settings/catalogos/page.tsx
git commit -m "feat: catalogos settings — agregar tab Estética, URL-based tab state"
```

---

### Task 7: Crear settings/page.tsx — redirect a clinica

**Files:**
- Create: `veterinaias/app/dashboard/settings/page.tsx`

Actualmente navegar a `/dashboard/settings` muestra una página vacía (el layout renderiza pero no hay `page.tsx`). Este archivo redirige al primer ítem del sidebar.

- [ ] **Step 1: Crear el archivo**

```tsx
import { redirect } from 'next/navigation'

export default function SettingsPage() {
  redirect('/dashboard/settings/clinica')
}
```

- [ ] **Step 2: Verificar en browser**

`http://localhost:3000/dashboard/settings` → debe redirigir automáticamente a `/dashboard/settings/clinica`.

- [ ] **Step 3: Commit**

```bash
git add veterinaias/app/dashboard/settings/page.tsx
git commit -m "feat: settings root redirect a clinica"
```

---

### Task 8: Cleanup — eliminar rutas y componente obsoletos

**Files:**
- Delete: `veterinaias/components/settings/SettingsNav.tsx`
- Delete: `veterinaias/app/dashboard/settings/configuracion/page.tsx`
- Delete: `veterinaias/app/dashboard/settings/recetas/page.tsx`
- Delete: `veterinaias/app/dashboard/settings/servicios/page.tsx`

Verificar que ningún archivo en la codebase importa estos componentes/rutas antes de eliminar.

- [ ] **Step 1: Verificar que SettingsNav no tiene más importadores**

```bash
grep -r "SettingsNav" veterinaias/app veterinaias/components --include="*.tsx" --include="*.ts"
```

Resultado esperado: ninguna línea (ya lo eliminamos de `settings/layout.tsx` en Task 4).

- [ ] **Step 2: Verificar que las rutas antiguas no tienen links internos**

```bash
grep -r "settings/configuracion\|settings/recetas\|settings/servicios" veterinaias/app veterinaias/components --include="*.tsx" --include="*.ts"
```

Resultado esperado: ninguna línea. Si hay resultados, actualizar esos links antes de continuar.

- [ ] **Step 3: Eliminar archivos**

```bash
rm veterinaias/components/settings/SettingsNav.tsx
rm veterinaias/app/dashboard/settings/configuracion/page.tsx
rm veterinaias/app/dashboard/settings/recetas/page.tsx
rm veterinaias/app/dashboard/settings/servicios/page.tsx
```

Nota: los directorios `configuracion/`, `recetas/`, `servicios/` quedan vacíos después — también eliminarlos:

```bash
rmdir veterinaias/app/dashboard/settings/configuracion
rmdir veterinaias/app/dashboard/settings/recetas
rmdir veterinaias/app/dashboard/settings/servicios
```

- [ ] **Step 4: Verificar build limpio**

```bash
cd veterinaias && npx tsc --noEmit 2>&1 | head -30
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 5: Verificar en browser — flujo completo**

1. `http://localhost:3000/dashboard` — sidebar principal sin cambios
2. `http://localhost:3000/dashboard/settings` — redirige a `/clinica`
3. Sidebar muestra "← Dashboard", 4 secciones con sub-items
4. Click "General" en sidebar → va a `clinica?tab=general`, sub-item activo
5. Click "Catálogos → Estética" → va a `catalogos?tab=estetica`, muestra catálogo grooming
6. Click "← Dashboard" → regresa a `/dashboard`, sidebar principal vuelve

- [ ] **Step 6: Commit final**

```bash
git add -u
git commit -m "refactor: eliminar SettingsNav y rutas obsoletas (configuracion, recetas, servicios)"
```
