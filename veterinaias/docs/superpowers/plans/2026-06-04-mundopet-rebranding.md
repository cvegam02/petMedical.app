# MundoPet Rebranding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate el sistema visual de VeterinaIAs al brand MundoPet v1.0: paleta Verde Bienestar + Azul Institucional, tipografía Manrope, radios 8/12/16/24px, y limpieza de referencias `font-heading` (Lora) en toda la app.

**Architecture:** Doble capa de tokens — `--mp-*` como palette raw en hex, tokens semánticos de shadcn (`--primary`, `--background`, etc.) haciendo var() chaining al palette. Los componentes existentes no necesitan cambios de color porque ya usan tokens semánticos — el rebrand se propaga automáticamente al actualizar `:root`. Las únicas excepciones son: (1) `font-heading` hardcodeado en 5 archivos, (2) `hover:bg-white/60` hardcodeado en SidebarNav.

**Tech Stack:** Next.js 14 App Router · Tailwind CSS v4 · shadcn/ui · `next/font/google` (Manrope, Geist Mono)

---

## Mapa de archivos

| Archivo | Operación | Razón |
|---------|-----------|-------|
| `app/globals.css` | Modificar | `:root` palette + dark mode + radius fix + quitar `--font-heading` |
| `app/layout.tsx` | Modificar | Reemplazar Montserrat+Lora → Manrope |
| `app/dashboard/owners/[ownerId]/page.tsx:121` | Modificar | Quitar clase `font-heading` |
| `app/dashboard/pets/[petId]/page.tsx:253` | Modificar | Quitar clase `font-heading` |
| `components/ui/card.tsx:41` | Modificar | Quitar `font-heading` del CardTitle |
| `components/appointments/AppointmentDetailDialog.tsx:65` | Modificar | Quitar `font-heading` del DialogTitle |
| `components/dashboard/NextAppointmentCard.tsx:31` | Modificar | Quitar `font-heading` del h2 |
| `components/dashboard/SidebarNav.tsx` | Modificar | `hover:bg-white/60` → `hover:bg-muted` |

---

## Task 1: globals.css — Sistema de tokens MundoPet

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Actualizar bloque `@theme inline` — quitar font-heading y fijar radios**

En `app/globals.css`, reemplazar el bloque `@theme inline` (líneas 7–49) con:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-2xl: 2rem;
  --radius-3xl: 2.5rem;
  --radius-4xl: 3rem;
}
```

> Qué cambió vs original: eliminado `--font-heading: var(--font-lora)`. Radios cambiados de `calc(var(--radius) * X)` a valores fijos que coinciden con el spec: sm=8px, md=12px, lg=16px, xl=24px.

- [ ] **Step 2: Reemplazar bloque `:root` con el palette MundoPet + tokens semánticos**

Reemplazar el bloque `:root { ... }` completo (desde `/* MundoPet — Warm Coral */` hasta el `}` de cierre, aproximadamente líneas 51–82) con:

```css
:root {
  /* ── MundoPet Palette ────────────────────────────────── */
  /* Greens — Vitality / Bienestar */
  --mp-green-50:  #F1FCF7;
  --mp-green-100: #DCF8EB;
  --mp-green-200: #B7EFD4;
  --mp-green-300: #83E0B5;
  --mp-green-400: #53D29A;
  --mp-green-500: #35C48B;
  --mp-green-600: #27A673;
  --mp-green-700: #1D865C;

  /* Blues — Confianza / Institucional */
  --mp-blue-50:  #F3F8FC;
  --mp-blue-100: #DCEAF6;
  --mp-blue-200: #B7D3EB;
  --mp-blue-300: #86B5DA;
  --mp-blue-400: #5C99CA;
  --mp-blue-500: #337DB9;
  --mp-blue-600: #1F659E;
  --mp-blue-700: #0F4C81;
  --mp-blue-800: #093760;

  /* Grays — Neutral scale */
  --mp-gray-50:  #FAFBFC;
  --mp-gray-100: #F3F5F7;
  --mp-gray-200: #E7EBEF;
  --mp-gray-300: #D2D9E0;
  --mp-gray-400: #A3AFBA;
  --mp-gray-500: #73808C;
  --mp-gray-600: #55616C;
  --mp-gray-700: #3B4650;
  --mp-gray-800: #27313B;
  --mp-gray-900: #161D24;

  /* Sand — Accent cálido (ilustraciones, empty states) */
  --mp-sand: #F3C57B;

  /* ── Semantic tokens — chaining al palette ───────────── */
  --background:            var(--mp-gray-50);
  --foreground:            var(--mp-gray-900);

  --card:                  #FFFFFF;
  --card-foreground:       var(--mp-gray-900);

  --popover:               #FFFFFF;
  --popover-foreground:    var(--mp-gray-900);

  --primary:               var(--mp-green-500);
  --primary-foreground:    #FFFFFF;

  --secondary:             var(--mp-blue-50);
  --secondary-foreground:  var(--mp-blue-700);

  --muted:                 var(--mp-gray-100);
  --muted-foreground:      var(--mp-gray-500);

  --accent:                var(--mp-green-50);
  --accent-foreground:     var(--mp-green-700);

  --destructive:           #EF4444;

  --border:                var(--mp-gray-200);
  --input:                 var(--mp-gray-200);
  --ring:                  var(--mp-green-500);

  --radius: 1rem;

  /* Sidebar — superficie clara, congruente con la app */
  --sidebar:                    var(--mp-gray-50);
  --sidebar-foreground:         var(--mp-gray-700);
  --sidebar-primary:            var(--mp-green-500);
  --sidebar-primary-foreground: var(--mp-green-700);
  --sidebar-accent:             var(--mp-green-50);
  --sidebar-accent-foreground:  var(--mp-green-700);
  --sidebar-border:             var(--mp-gray-200);
  --sidebar-ring:               var(--mp-green-500);
}
```

- [ ] **Step 3: Reemplazar bloque `.dark` con dark mode MundoPet**

Reemplazar el bloque `.dark { ... }` completo (líneas 89–122) con:

```css
.dark {
  --background:            #101418;
  --foreground:            #F7F9FB;
  --card:                  #182028;
  --card-foreground:       #F7F9FB;
  --popover:               #182028;
  --popover-foreground:    #F7F9FB;
  --primary:               var(--mp-green-500);
  --primary-foreground:    #FFFFFF;
  --secondary:             #1E2A38;
  --secondary-foreground:  var(--mp-blue-300);
  --muted:                 #1E2A38;
  --muted-foreground:      var(--mp-gray-400);
  --accent:                #1E2A38;
  --accent-foreground:     #F7F9FB;
  --destructive:           #EF4444;
  --border:                rgba(255, 255, 255, 0.08);
  --input:                 rgba(255, 255, 255, 0.10);
  --ring:                  var(--mp-green-500);
  --chart-1: var(--mp-green-400);
  --chart-2: var(--mp-green-300);
  --chart-3: var(--mp-green-200);
  --chart-4: var(--mp-blue-400);
  --chart-5: var(--mp-blue-300);
  --sidebar:                    #0D1520;
  --sidebar-foreground:         #F7F9FB;
  --sidebar-primary:            var(--mp-green-500);
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent:             #1E2A38;
  --sidebar-accent-foreground:  #F7F9FB;
  --sidebar-border:             rgba(255, 255, 255, 0.06);
  --sidebar-ring:               var(--mp-green-500);
}
```

- [ ] **Step 4: Quitar regla `h1 { @apply font-heading; }` de `@layer base`**

En el bloque `@layer base { ... }` (alrededor de líneas 124–141), eliminar las líneas:

```css
  h1 {
    @apply font-heading;
  }
```

Dejar el resto del bloque intacto (`* { @apply border-border outline-ring/50; }`, `body { @apply bg-background text-foreground; }`, etc.).

- [ ] **Step 5: Commit**

```bash
git add veterinaias/app/globals.css
git commit -m "feat: MundoPet token system — palette --mp-*, semantic chaining, dark mode, fixed radii"
```

---

## Task 2: layout.tsx — Swap Montserrat+Lora → Manrope

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Reemplazar imports y configuración de fuentes**

Reemplazar el contenido completo de `app/layout.tsx` con:

```tsx
import type { Metadata } from 'next'
import { Manrope, Geist_Mono } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MundoPet',
  description: 'Cuidado integral para tus mascotas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
```

> Qué cambió: `Montserrat` → `Manrope` con variable `--font-sans` (misma variable que antes, el resto de la app lo recoge automáticamente). `Lora` eliminado. `--font-lora` variable ya no existe. `geistMono` se mantiene para datos técnicos.

- [ ] **Step 2: Commit**

```bash
git add veterinaias/app/layout.tsx
git commit -m "feat: swap Montserrat+Lora to Manrope — single-family typography system"
```

---

## Task 3: Eliminar `font-heading` de componentes

Con Lora eliminado, la clase `font-heading` ya no existe en `@theme inline`. En estos 5 archivos simplemente se quita la clase — Manrope (font-sans) toma el relevo automáticamente.

**Files:**
- Modify: `app/dashboard/owners/[ownerId]/page.tsx:121`
- Modify: `app/dashboard/pets/[petId]/page.tsx:253`
- Modify: `components/ui/card.tsx:41`
- Modify: `components/appointments/AppointmentDetailDialog.tsx:65`
- Modify: `components/dashboard/NextAppointmentCard.tsx:31`

- [ ] **Step 1: `owners/[ownerId]/page.tsx` — quitar font-heading**

Localizar línea ~121:
```tsx
<h2 className="text-lg font-bold font-heading text-foreground">Mascotas registradas</h2>
```
Cambiar a:
```tsx
<h2 className="text-lg font-bold text-foreground">Mascotas registradas</h2>
```

- [ ] **Step 2: `pets/[petId]/page.tsx` — quitar font-heading**

Localizar línea ~253:
```tsx
<h2 className="text-lg font-bold font-heading text-foreground">Historial médico</h2>
```
Cambiar a:
```tsx
<h2 className="text-lg font-bold text-foreground">Historial médico</h2>
```

- [ ] **Step 3: `components/ui/card.tsx` — quitar font-heading del CardTitle**

Localizar línea ~41 en el `cva()` del CardTitle:
```tsx
"font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
```
Cambiar a:
```tsx
"text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
```

- [ ] **Step 4: `AppointmentDetailDialog.tsx` — quitar font-heading**

Localizar línea ~65:
```tsx
<DialogTitle className="text-xl font-bold font-heading text-foreground leading-tight truncate">
```
Cambiar a:
```tsx
<DialogTitle className="text-xl font-bold text-foreground leading-tight truncate">
```

- [ ] **Step 5: `NextAppointmentCard.tsx` — quitar font-heading**

Localizar línea ~31:
```tsx
<h2 className="text-xl font-bold font-heading text-foreground">
```
Cambiar a:
```tsx
<h2 className="text-xl font-bold text-foreground">
```

- [ ] **Step 6: Verificar que no queden referencias a font-heading**

```bash
grep -r "font-heading\|font-lora\|Lora\b" veterinaias/app veterinaias/components --include="*.tsx" --include="*.ts" --include="*.css"
```

Resultado esperado: sin output (ningún match).

- [ ] **Step 7: Commit**

```bash
git add veterinaias/app/dashboard/owners/[ownerId]/page.tsx \
        veterinaias/app/dashboard/pets/[petId]/page.tsx \
        veterinaias/components/ui/card.tsx \
        veterinaias/components/appointments/AppointmentDetailDialog.tsx \
        veterinaias/components/dashboard/NextAppointmentCard.tsx
git commit -m "refactor: remove font-heading — Manrope handles all heading styles"
```

---

## Task 4: SidebarNav — Fix hover state hardcodeado

**Files:**
- Modify: `components/dashboard/SidebarNav.tsx`

- [ ] **Step 1: Reemplazar `hover:bg-white/60` con token semántico**

En `components/dashboard/SidebarNav.tsx`, localizar la clase en el `className` de los items no-activos (línea ~47):

```tsx
'text-foreground/55 hover:text-foreground hover:bg-white/60'
```

Cambiar a:

```tsx
'text-foreground/55 hover:text-foreground hover:bg-muted'
```

> Por qué: `hover:bg-white/60` hardcodea blanco. `hover:bg-muted` usa el token `--muted` = `var(--mp-gray-100)` = `#F3F5F7`, que es el fondo hover correcto según el DESIGN.md y funciona en dark mode.

- [ ] **Step 2: Commit**

```bash
git add veterinaias/components/dashboard/SidebarNav.tsx
git commit -m "fix: sidebar hover uses bg-muted token instead of hardcoded white"
```

---

## Task 5: Verificación visual final

- [ ] **Step 1: Levantar servidor de desarrollo**

```bash
cd veterinaias && npm run dev
```

- [ ] **Step 2: Verificar puntos clave en browser**

Abrir `http://localhost:3000/dashboard` y confirmar:

1. **Accent rail** (borde top-[3px] del layout) es verde #35C48B — no coral
2. **Logo "MundoPet"** — icono de pata verde, texto correcto
3. **Sidebar** — fondo gris claro (#FAFBFC), hover item cambia a #F3F5F7, item activo fondo verde-50 + texto verde
4. **Botón primario** (ej. "Nueva cita") — fondo verde #35C48B
5. **Botón secundario** — fondo azul-50 (#F3F8FC) + texto azul (#0F4C81)
6. **Tipografía** — Manrope en headings y body (no Lora, no Montserrat)
7. **Radios de cards** — 16px uniformes

- [ ] **Step 3: Verificar dark mode**

Añadir clase `dark` al `<html>` temporalmente (o usar DevTools) y confirmar:
- Background #101418
- Cards #182028
- Verde sigue siendo #35C48B en botones y nav activo

- [ ] **Step 4: Build check**

```bash
cd veterinaias && npm run build
```

Resultado esperado: build exitoso sin errores de TypeScript ni CSS.
