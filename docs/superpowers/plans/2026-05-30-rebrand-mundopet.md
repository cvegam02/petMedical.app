# Rebrand a MundoPet — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar la identidad de marca de "petMedical.app" (teal clínico) a "MundoPet" (coral cálido, dominio mundopet.com.mx) en toda la app.

**Architecture:** El sistema de color está parametrizado en OKLCH por matiz, así que la paleta se cambia reemplazando los bloques `:root` y `.dark` en un solo archivo CSS. El nombre/logo se reemplaza por un ícono `PawPrint` de lucide tintado en coral + el wordmark "Mundo**Pet**" en los puntos de marca de la app. Los textos y el dominio fallback se actualizan en sus archivos.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 (OKLCH custom properties), lucide-react, @react-pdf/renderer

**Spec:** `docs/superpowers/specs/2026-05-30-rebrand-mundopet-design.md`

**Nota:** Este proyecto omite tests. Cada tarea termina con verificación visual + commit. No agregar Co-Authored-By.

---

### Task 1: Paleta de color (teal → coral)

**Files:**
- Modify: `veterinaias/app/globals.css`

- [ ] **Step 1: Reemplazar el bloque `:root`**

Busca el bloque `:root { ... }` que empieza con el comentario `/* petMedical.app — Clinical Teal */` y termina en `--radius: 0.5rem; }`. Reemplázalo COMPLETO por:

```css
:root {
  /* MundoPet — Warm Coral */
  --background: oklch(0.99 0.004 50);       /* Papel cálido - apenas tintado */
  --foreground: oklch(0.20 0.020 40);       /* Café-carbón cálido - no negro puro */

  --card: oklch(1 0 0);
  --card-foreground: oklch(0.20 0.020 40);

  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.20 0.020 40);

  /* Coral - cálido, amigable, cuidado integral */
  --primary: oklch(0.57 0.17 40);           /* Brand Coral - MundoPet */
  --primary-foreground: oklch(0.99 0.004 50);

  --secondary: oklch(0.96 0.012 50);        /* Tinte coral suave */
  --secondary-foreground: oklch(0.20 0.020 40);

  --muted: oklch(0.97 0.008 50);            /* Neutro cálido */
  --muted-foreground: oklch(0.45 0.030 40);

  --accent: oklch(0.32 0.050 40);           /* Terracota para estados de alta tensión */
  --accent-foreground: oklch(0.99 0.004 50);

  --destructive: oklch(0.55 0.22 25);       /* Rojo señal - más profundo para distinguir del coral */

  --border: oklch(0.92 0.012 50);           /* Hairline cálido */
  --input: oklch(0.89 0.016 50);
  --ring: oklch(0.57 0.17 40);

  --radius: 0.5rem;                         /* Precision 8px radius */
}
```

- [ ] **Step 2: Reemplazar el bloque `.dark`**

Busca el bloque `.dark { ... }` que empieza con el comentario `/* Petroleum canvas + brand teal primary */` y termina justo antes de `@layer base`. Reemplázalo COMPLETO por:

```css
.dark {
  /* MundoPet — Lienzo cálido oscuro + coral brillante */
  --background: oklch(0.17 0.010 40);
  --foreground: oklch(0.975 0.004 50);
  --card: oklch(0.21 0.012 40);
  --card-foreground: oklch(0.975 0.004 50);
  --popover: oklch(0.21 0.012 40);
  --popover-foreground: oklch(0.975 0.004 50);
  --primary: oklch(0.70 0.15 40);           /* Coral brillante */
  --primary-foreground: oklch(0.17 0.010 40);
  --secondary: oklch(0.26 0.012 40);
  --secondary-foreground: oklch(0.975 0.004 50);
  --muted: oklch(0.26 0.012 40);
  --muted-foreground: oklch(0.65 0.012 40);
  --accent: oklch(0.26 0.012 40);
  --accent-foreground: oklch(0.975 0.004 50);
  --destructive: oklch(0.65 0.20 22);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 14%);
  --ring: oklch(0.70 0.15 40);
  --chart-1: oklch(0.72 0.15 40);
  --chart-2: oklch(0.60 0.12 40);
  --chart-3: oklch(0.50 0.10 40);
  --chart-4: oklch(0.40 0.08 40);
  --chart-5: oklch(0.30 0.06 40);
  --sidebar: oklch(0.21 0.012 40);
  --sidebar-foreground: oklch(0.975 0.004 50);
  --sidebar-primary: oklch(0.70 0.15 40);
  --sidebar-primary-foreground: oklch(0.17 0.010 40);
  --sidebar-accent: oklch(0.26 0.012 40);
  --sidebar-accent-foreground: oklch(0.975 0.004 50);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.70 0.15 40);
}
```

- [ ] **Step 3: Verificar en browser**

Levanta el dev server (`npm run dev`) y abre el dashboard. Todo lo que era teal (botones primarios, badges de marca, anillos de focus, sidebar) ahora debe verse coral cálido. Verifica que el texto blanco sobre botones primarios sea legible. Los badges semánticos (verde/ámbar/rojo de estados) deben seguir intactos.

- [ ] **Step 4: Commit**

```bash
git add veterinaias/app/globals.css
git commit -m "feat: rebrand color palette from clinical teal to warm coral"
```

---

### Task 2: Wordmark "MundoPet" en la UI

**Files:**
- Modify: `veterinaias/app/dashboard/layout.tsx`
- Modify: `veterinaias/app/(auth)/layout.tsx`
- Modify: `veterinaias/app/onboarding/page.tsx`
- Modify: `veterinaias/app/super-admin/layout.tsx`

- [ ] **Step 1: Sidebar del dashboard**

En `veterinaias/app/dashboard/layout.tsx`:

1. Agrega el import de lucide (el archivo ya importa `Image` de next/image — déjalo, lo usa el logo del tenant en el topbar). Añade:
```typescript
import { PawPrint } from 'lucide-react'
```

2. Reemplaza el bloque de marca del sidebar:
```tsx
<Link href="/dashboard" className="flex items-center gap-2.5">
  <Image src="/icon.png" alt="petMedical.app" width={55} height={55} className="rounded-md shrink-0" />
  <p className="text-base font-medium text-foreground tracking-tight leading-none">
    pet<span className="font-bold">Medical</span>.app
  </p>
</Link>
```
por:
```tsx
<Link href="/dashboard" className="flex items-center gap-2.5">
  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
    <PawPrint size={20} className="text-primary" strokeWidth={2} />
  </div>
  <p className="text-base font-medium text-foreground tracking-tight leading-none">
    Mundo<span className="font-bold">Pet</span>
  </p>
</Link>
```

- [ ] **Step 2: Login (auth layout)**

En `veterinaias/app/(auth)/layout.tsx`, reemplaza TODO el contenido del archivo por:

```typescript
import { PawPrint } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
            <PawPrint size={26} className="text-primary" strokeWidth={2} />
          </div>
          <p className="text-2xl font-medium text-foreground tracking-tight">
            Mundo<span className="font-bold">Pet</span>
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Onboarding**

En `veterinaias/app/onboarding/page.tsx`:

1. Añade el import si no está:
```typescript
import { PawPrint } from 'lucide-react'
```

2. Reemplaza el bloque de marca:
```tsx
<div className="flex justify-center mb-8">
  <Image src="/logo.png" alt="petMedical.app" width={220} height={88} priority />
  <p className="text-slate-500 mt-2">Configura tu clinica para empezar</p>
</div>
```
por:
```tsx
<div className="flex flex-col items-center mb-8">
  <div className="flex items-center gap-2.5">
    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
      <PawPrint size={26} className="text-primary" strokeWidth={2} />
    </div>
    <p className="text-2xl font-medium text-foreground tracking-tight">
      Mundo<span className="font-bold">Pet</span>
    </p>
  </div>
  <p className="text-muted-foreground mt-2">Configura tu clinica para empezar</p>
</div>
```

3. Busca si `Image` de next/image sigue usándose en el resto del archivo (`grep "Image" app/onboarding/page.tsx`). Si ya NO se usa en ninguna otra parte, elimina la línea `import Image from 'next/image'` para evitar el error de import sin usar. Si aún se usa, déjala.

- [ ] **Step 4: Super Admin**

En `veterinaias/app/super-admin/layout.tsx`, reemplaza:
```tsx
<p className="text-sm">pet<span className="font-bold">Medical</span>.app</p>
```
por:
```tsx
<p className="text-sm">Mundo<span className="font-bold">Pet</span></p>
```

- [ ] **Step 5: Verificar en browser**

Revisa el sidebar del dashboard (ícono coral + "MundoPet"), la pantalla de login, el onboarding y el panel super-admin. En ninguno debe quedar "petMedical.app".

- [ ] **Step 6: Commit**

```bash
git add veterinaias/app/dashboard/layout.tsx veterinaias/app/\(auth\)/layout.tsx veterinaias/app/onboarding/page.tsx veterinaias/app/super-admin/layout.tsx
git commit -m "feat: replace petMedical brand with MundoPet wordmark and PawPrint icon"
```

---

### Task 3: Textos y dominio

**Files:**
- Modify: `veterinaias/app/layout.tsx`
- Modify: `veterinaias/app/r/[token]/page.tsx`
- Modify: `veterinaias/app/api/whatsapp/send-consultation/route.ts`

- [ ] **Step 1: Metadata de la app**

En `veterinaias/app/layout.tsx`, reemplaza:
```typescript
export const metadata: Metadata = {
  title: 'petMedical.app',
  description: 'Plataforma de gestion veterinaria',
}
```
por:
```typescript
export const metadata: Metadata = {
  title: 'MundoPet',
  description: 'Cuidado integral para tus mascotas',
}
```

- [ ] **Step 2: Footer del expediente compartido**

En `veterinaias/app/r/[token]/page.tsx`, reemplaza:
```tsx
{tenantName} · petMedical.app<br />
```
por:
```tsx
{tenantName} · MundoPet<br />
```

- [ ] **Step 3: Dominio fallback de WhatsApp**

En `veterinaias/app/api/whatsapp/send-consultation/route.ts`, reemplaza:
```typescript
const appUrl = (process.env.APP_URL ?? 'https://petmedical.app').replace(/\/$/, '')
```
por:
```typescript
const appUrl = (process.env.APP_URL ?? 'https://mundopet.com.mx').replace(/\/$/, '')
```

- [ ] **Step 4: Commit**

```bash
git add veterinaias/app/layout.tsx veterinaias/app/r/\[token\]/page.tsx veterinaias/app/api/whatsapp/send-consultation/route.ts
git commit -m "feat: update metadata, shared footer and domain fallback to MundoPet"
```

---

### Task 4: Branding en los PDFs

**Files:**
- Modify: `veterinaias/lib/pdf/medicalHistoryDocument.tsx`
- Modify: `veterinaias/lib/pdf/prescriptionDocument.tsx`

- [ ] **Step 1: Reemplazar el hex teal por coral en ambos PDFs**

En AMBOS archivos (`lib/pdf/medicalHistoryDocument.tsx` y `lib/pdf/prescriptionDocument.tsx`), busca cada ocurrencia del hex teal `#0d6b6e` y reemplázala por el coral de marca `#c1502e`. Usa búsqueda global del string `#0d6b6e` en cada archivo (aparece en los estilos `clinicName` y, en el de recetas, también `rxLabel`).

- [ ] **Step 2: Actualizar el pie del PDF de historiales**

En `veterinaias/lib/pdf/medicalHistoryDocument.tsx`, reemplaza:
```tsx
`Historial generado el ${generatedAt} | petMedical.app          Página ${pageNumber} de ${totalPages}`
```
por:
```tsx
`Historial generado el ${generatedAt} | MundoPet          Página ${pageNumber} de ${totalPages}`
```

- [ ] **Step 3: Verificar**

1. Abre un historial y descarga el PDF (`/api/historiales/[petId]/pdf`) — el nombre de la clínica y acentos deben verse coral, y el pie debe decir "MundoPet".
2. Abre un expediente con receta e imprime la receta (`/api/medical-records/[id]/prescription/pdf`) — los acentos coral deben aplicarse.

- [ ] **Step 4: Commit**

```bash
git add veterinaias/lib/pdf/medicalHistoryDocument.tsx veterinaias/lib/pdf/prescriptionDocument.tsx
git commit -m "feat: apply MundoPet coral accent and footer to generated PDFs"
```

---

### Verificación final

- [ ] **Type check**

```bash
cd veterinaias && npx tsc --noEmit
```
Expected: EXIT 0, sin errores.

- [ ] **Búsqueda de referencias residuales**

```bash
cd veterinaias && grep -rn "petMedical\|petmedical\|0d6b6e\|pet<span" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.css"
```
Expected: sin resultados (todas las referencias migradas). Nota: `icon.png`/`logo.png`/`favicon` como archivos siguen existiendo en `public/` — son follow-up de diseño, no se tocan aquí.
