# Settings Redesign Design

**Fecha:** 2026-06-10  
**Estado:** Aprobado para implementar

---

## Problema

El apartado de Configuración usa 7 tabs horizontales al mismo nivel, sin jerarquía. Tres de esos tabs son muy delgados (Configuración = 2 campos, Recetas = 2 campos, Servicios = 1 sub-tab). El patrón no escala y ya se siente "enfadoso".

---

## Decisiones de Diseño

| Pregunta | Decisión |
|----------|----------|
| Patrón de navegación | Sidebar permanente |
| Agrupación | 4 secciones consolidadas con sub-tabs |
| Layout | Settings reemplaza el nav principal (patrón GitHub Settings) |

---

## Arquitectura

### Problema de Server Component

`app/dashboard/layout.tsx` es un Server Component que renderiza el sidebar. No puede usar `usePathname`. La solución es extraer la lógica del sidebar a un Client Component:

```
app/dashboard/layout.tsx (Server Component — pasa tenantName, role)
  └── <AppSidebar tenantName role />  ← nuevo Client Component
        ├── usePathname()
        ├── si pathname.startsWith('/dashboard/settings')
        │   └── <SettingsSidebar tenantName />
        └── si no
            └── <SidebarNav role />  (sin cambios)
```

### Settings layout simplificado

`app/dashboard/settings/layout.tsx` actualmente hace 3 cosas:
1. Verificar que el usuario es `admin` (mantener)
2. Renderizar el header "Configuración" (eliminar — SettingsSidebar lo tiene)
3. Renderizar `<SettingsNav />` horizontal tabs (eliminar)

El layout simplificado solo hace el guard de admin y pasa `{children}`.

---

## Estructura de Rutas

| URL | Contenido |
|-----|-----------|
| `/dashboard/settings` | redirect → `/dashboard/settings/clinica` |
| `/dashboard/settings/clinica` | Clínica — Información (default) |
| `/dashboard/settings/clinica?tab=general` | Clínica — Configuración general |
| `/dashboard/settings/clinica?tab=recetas` | Clínica — Recetas |
| `/dashboard/settings/catalogos` | Catálogos — Vacunas (default) |
| `/dashboard/settings/catalogos?tab=medicamentos` | Catálogos — Medicamentos |
| `/dashboard/settings/catalogos?tab=estetica` | Catálogos — Estética (era Servicios) |
| `/dashboard/settings/integraciones` | Integraciones |
| `/dashboard/settings/team` | Equipo (URL sin cambios) |

**Rutas eliminadas:**
- `/dashboard/settings/configuracion/` → contenido se mueve a `clinica?tab=general`
- `/dashboard/settings/recetas/` → contenido se mueve a `clinica?tab=recetas`
- `/dashboard/settings/servicios/` → contenido se mueve a `catalogos?tab=estetica`

---

## Consolidación de Secciones

```
7 tabs actuales → 4 secciones en sidebar

🏥 Clínica
  ├── Información   (era: settings/clinica)
  ├── General       (era: settings/configuracion — 2 campos: reminder days, share link expiry)
  └── Recetas       (era: settings/recetas — 2 campos: footer note, validity days)

📋 Catálogos
  ├── Vacunas       (era: settings/catalogos?tab=vacunas)
  ├── Medicamentos  (era: settings/catalogos?tab=medicamentos)
  └── Estética      (era: settings/servicios → GroomingServiceCatalogTab)

🔌 Integraciones    (sin cambios — settings/integraciones)

👥 Equipo           (sin cambios — settings/team)
```

---

## SettingsSidebar — Diseño del componente

**Archivo:** `components/settings/SettingsSidebar.tsx` (Client Component)

**Estilo:** Mismo fondo oscuro que el sidebar principal (`bg-secondary border-r border-border`).

**Estructura:**
```
┌─────────────────────────────┐
│  ← Dashboard               │  Link de vuelta a /dashboard
├─────────────────────────────┤
│  Configuración              │  Overline label
├─────────────────────────────┤
│  🏥 Clínica                 │  Section header (expandible)
│     • Información   ←activo │  Sub-item
│     • General               │
│     • Recetas               │
│  📋 Catálogos               │
│     • Vacunas               │
│     • Medicamentos          │
│     • Estética              │
│  🔌 Integraciones           │  Item directo
│  👥 Equipo                  │  Item directo
└─────────────────────────────┘
```

**Active state:** Usa `usePathname()` + `useSearchParams()`.
- Sección activa: si `pathname.startsWith(section.href)`
- Sub-tab activo: si `pathname === tab.href` y `searchParams.get('tab') === tab.param` (o null para default)

**Expansión:** Las secciones con sub-tabs (Clínica, Catálogos) siempre muestran sus sub-items expandidos — no colapsables. Clínica y Catálogos son siempre visibles.

---

## AppSidebar — Componente de conmutación

**Archivo:** `components/dashboard/AppSidebar.tsx` (Client Component — nuevo)

Props: `tenantName: string`, `tenantLogoUrl: string | null`, `role: string`

Lógica:
```tsx
const pathname = usePathname()
if (pathname.startsWith('/dashboard/settings')) {
  return <SettingsSidebar tenantName={tenantName} />
}
return <SidebarNav role={role} />
```

El `DashboardLayout` pasa `tenantName`, `tenantLogoUrl`, `role` a `AppSidebar` en lugar de pasarlos directamente a `SidebarNav`.

---

## Cambios en settings/clinica/page.tsx

Actualmente solo renderiza el formulario de información de la clínica. Con el rediseño, pasa a ser una página con 3 sub-tabs internos:

```tsx
// Lee el param ?tab=... via useSearchParams()
type ClinicaTab = 'info' | 'general' | 'recetas'
const tab: ClinicaTab = (searchParams.get('tab') as ClinicaTab) ?? 'info'

// Renderiza el sub-tab correspondiente
// 'info'    → formulario de clínica (código existente)
// 'general' → contenido de settings/configuracion/page.tsx
// 'recetas' → contenido de settings/recetas/page.tsx
```

La página incluye un sub-nav horizontal ligero (pill tabs) para los 3 sub-tabs. Patrón igual al que ya usa `settings/catalogos/page.tsx`.

---

## Cambios en settings/catalogos/page.tsx

Ya tiene sub-tabs (Vacunas, Medicamentos). Solo se agrega un tab nuevo:

```tsx
// Agregar tab 'estetica'
type Tab = 'vacunas' | 'medicamentos' | 'estetica'

// 'estetica' → renderiza <GroomingServiceCatalogTab /> 
// (componente importado desde settings/servicios/page.tsx)
```

---

## Archivos a crear

| Archivo | Acción |
|---------|--------|
| `components/dashboard/AppSidebar.tsx` | Crear — Client Component que conmuta sidebars |
| `components/settings/SettingsSidebar.tsx` | Crear — sidebar de settings |

## Archivos a modificar / crear adicionales

| Archivo | Cambio |
|---------|--------|
| `app/dashboard/layout.tsx` | `<SidebarNav>` → `<AppSidebar>` con props |
| `app/dashboard/settings/layout.tsx` | Eliminar header + `<SettingsNav>`, mantener guard admin |
| `app/dashboard/settings/clinica/page.tsx` | Agregar sub-tabs: Información (default), General, Recetas |
| `app/dashboard/settings/catalogos/page.tsx` | Agregar sub-tab: Estética |
| `app/dashboard/settings/page.tsx` | Crear — redirect a `/dashboard/settings/clinica` (actualmente no existe, navegar a `/dashboard/settings` da página vacía) |

## Archivos a eliminar

| Archivo | Motivo |
|---------|--------|
| `components/settings/SettingsNav.tsx` | Reemplazado por `SettingsSidebar` |
| `app/dashboard/settings/configuracion/page.tsx` | Contenido migrado a `clinica?tab=general` |
| `app/dashboard/settings/recetas/page.tsx` | Contenido migrado a `clinica?tab=recetas` |
| `app/dashboard/settings/servicios/page.tsx` | Contenido migrado a `catalogos?tab=estetica` |

---

## Criterios de Éxito

- [ ] Al entrar a `/dashboard/settings/*`, el sidebar principal desaparece y aparece el sidebar de settings
- [ ] El botón "← Dashboard" regresa al dashboard correctamente
- [ ] Los 4 items del sidebar tienen active state correcto (sección + sub-tab)
- [ ] Clínica → Información muestra el mismo formulario que antes
- [ ] Clínica → General muestra los 2 campos (reminder days, share link expiry)
- [ ] Clínica → Recetas muestra los 2 campos (footer note, validity days)
- [ ] Catálogos → Estética muestra el catálogo de servicios de grooming
- [ ] Las rutas antiguas (`/settings/configuracion`, `/settings/recetas`, `/settings/servicios`) están eliminadas y todos los links internos actualizados (son rutas admin-only, no hay links externos)
- [ ] El layout del dashboard no se ve afectado en rutas que no son settings
