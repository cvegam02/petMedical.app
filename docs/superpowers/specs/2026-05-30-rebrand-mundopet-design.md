# Rebrand a MundoPet — Diseño

**Fecha:** 2026-05-30
**Estado:** Aprobado
**Alcance:** Cambio de identidad de marca de "petMedical.app" a "MundoPet" (dominio mundopet.com.mx), con nueva paleta de color coral cálido enfocada en cuidado integral.

---

## Contexto y motivación

El producto deja de enfocarse solo en lo médico/clínico para posicionarse como cuidado **integral** de mascotas. El branding actual ("petMedical.app", paleta teal clínico) ya no refleja eso. Este rebrand cambia:

1. **Nombre:** petMedical.app → **MundoPet**
2. **Dominio:** petmedical.app → **mundopet.com.mx**
3. **Color:** teal clínico (matiz OKLCH 190) → **coral cálido (matiz ~40)**
4. **Descripción:** "Plataforma de gestion veterinaria" → "Cuidado integral para tus mascotas"

El sistema de color ya está parametrizado en OKLCH por matiz, así que el cambio de paleta es un reemplazo limpio de tokens en un solo archivo.

---

## Sección 1: Paleta de color

Todos los tokens migran del matiz **190 (teal)** al matiz **~40 (coral cálido)**. Los neutros del dark mode migran de matiz 230 (petróleo frío) a matiz cálido ~40.

### 1.1 Light mode (`:root` en `app/globals.css`)

| Token | Antes | Después |
|-------|-------|---------|
| `--background` | `oklch(0.99 0.003 190)` | `oklch(0.99 0.004 50)` |
| `--foreground` | `oklch(0.18 0.022 190)` | `oklch(0.20 0.020 40)` |
| `--card` | `oklch(1 0 0)` | `oklch(1 0 0)` (sin cambio) |
| `--card-foreground` | `oklch(0.18 0.022 190)` | `oklch(0.20 0.020 40)` |
| `--popover` | `oklch(1 0 0)` | `oklch(1 0 0)` (sin cambio) |
| `--popover-foreground` | `oklch(0.18 0.022 190)` | `oklch(0.20 0.020 40)` |
| `--primary` | `oklch(0.50 0.13 190)` | `oklch(0.57 0.17 40)` (coral cálido) |
| `--primary-foreground` | `oklch(0.99 0.003 190)` | `oklch(0.99 0.004 50)` |
| `--secondary` | `oklch(0.96 0.010 190)` | `oklch(0.96 0.012 50)` |
| `--secondary-foreground` | `oklch(0.18 0.022 190)` | `oklch(0.20 0.020 40)` |
| `--muted` | `oklch(0.97 0.007 190)` | `oklch(0.97 0.008 50)` |
| `--muted-foreground` | `oklch(0.45 0.030 190)` | `oklch(0.45 0.030 40)` |
| `--accent` | `oklch(0.30 0.040 190)` | `oklch(0.32 0.050 40)` (terracota) |
| `--accent-foreground` | `oklch(0.99 0.003 190)` | `oklch(0.99 0.004 50)` |
| `--destructive` | `oklch(0.58 0.20 25)` | `oklch(0.55 0.22 25)` (rojo más profundo/saturado) |
| `--border` | `oklch(0.92 0.010 190)` | `oklch(0.92 0.012 50)` |
| `--input` | `oklch(0.89 0.015 190)` | `oklch(0.89 0.016 50)` |
| `--ring` | `oklch(0.50 0.13 190)` | `oklch(0.57 0.17 40)` |
| `--radius` | `0.5rem` | sin cambio |

Actualizar también los comentarios del bloque (`petMedical.app — Clinical Teal`, `Brand Teal`, etc.) a referencias de MundoPet / coral.

### 1.2 Dark mode (`.dark` en `app/globals.css`)

| Token | Antes | Después |
|-------|-------|---------|
| `--background` | `oklch(0.155 0.018 230)` | `oklch(0.17 0.010 40)` (cálido casi-negro) |
| `--foreground` | `oklch(0.975 0.005 230)` | `oklch(0.975 0.004 50)` |
| `--card` | `oklch(0.195 0.018 230)` | `oklch(0.21 0.012 40)` |
| `--card-foreground` | `oklch(0.975 0.005 230)` | `oklch(0.975 0.004 50)` |
| `--popover` | `oklch(0.195 0.018 230)` | `oklch(0.21 0.012 40)` |
| `--popover-foreground` | `oklch(0.975 0.005 230)` | `oklch(0.975 0.004 50)` |
| `--primary` | `oklch(0.70 0.13 190)` | `oklch(0.70 0.15 40)` (coral brillante) |
| `--primary-foreground` | `oklch(0.155 0.018 230)` | `oklch(0.17 0.010 40)` |
| `--secondary` | `oklch(0.255 0.018 230)` | `oklch(0.26 0.012 40)` |
| `--secondary-foreground` | `oklch(0.975 0.005 230)` | `oklch(0.975 0.004 50)` |
| `--muted` | `oklch(0.255 0.018 230)` | `oklch(0.26 0.012 40)` |
| `--muted-foreground` | `oklch(0.65 0.01 230)` | `oklch(0.65 0.012 40)` |
| `--accent` | `oklch(0.255 0.018 230)` | `oklch(0.26 0.012 40)` |
| `--accent-foreground` | `oklch(0.975 0.005 230)` | `oklch(0.975 0.004 50)` |
| `--destructive` | `oklch(0.65 0.19 22)` | `oklch(0.65 0.20 22)` (sin cambio relevante) |
| `--border` | `oklch(1 0 0 / 10%)` | sin cambio |
| `--input` | `oklch(1 0 0 / 14%)` | sin cambio |
| `--ring` | `oklch(0.70 0.13 190)` | `oklch(0.70 0.15 40)` |
| `--chart-1..5` | hue 190 | mismas L/C, hue 40 |
| `--sidebar` | `oklch(0.195 0.018 230)` | `oklch(0.21 0.012 40)` |
| `--sidebar-foreground` | `oklch(0.975 0.005 230)` | `oklch(0.975 0.004 50)` |
| `--sidebar-primary` | `oklch(0.70 0.13 190)` | `oklch(0.70 0.15 40)` |
| `--sidebar-primary-foreground` | `oklch(0.155 0.018 230)` | `oklch(0.17 0.010 40)` |
| `--sidebar-accent` | `oklch(0.255 0.018 230)` | `oklch(0.26 0.012 40)` |
| `--sidebar-accent-foreground` | `oklch(0.975 0.005 230)` | `oklch(0.975 0.004 50)` |
| `--sidebar-border` | `oklch(1 0 0 / 10%)` | sin cambio |
| `--sidebar-ring` | `oklch(0.70 0.13 190)` | `oklch(0.70 0.15 40)` |

### 1.3 Consideraciones de diseño

- **Contraste de botones primarios:** `--primary` light se fija en `oklch(0.57 0.17 40)` (no en el coral display más claro `#F2683C`) para que el texto blanco sobre botones mantenga un contraste comparable o mejor que el teal anterior. El coral display más claro queda como matiz de marca.
- **Distinción de destructive:** con el primario en coral (hue 40), el rojo `--destructive` se hace más profundo y saturado (hue 25, chroma 0.22) para diferenciarse visualmente del coral. Los botones destructivos y primarios aparecen en contextos distintos.
- **Colores semánticos de badges** (verde "vigente", ámbar "stock bajo", rojo "vencido") usan clases de la paleta Tailwind (`bg-green-50`, `bg-amber-50`, `bg-red-50`, etc.), **independientes** de los tokens de marca. No cambian y permanecen distinguibles del coral.

---

## Sección 2: Nombre y logo

### 2.1 Tratamiento del nombre

En todos los puntos donde aparece la marca de la app, el texto pasa a **"Mundo" (peso normal) + "Pet" (bold)**: `Mundo<strong>Pet</strong>`.

### 2.2 Ícono de marca

En lugar del `icon.png`/`logo.png` actuales (teal, chocarían con el coral), la UI usa el ícono **`PawPrint` de lucide-react** tintado con `text-primary` (coral).

- **Sidebar** (`app/dashboard/layout.tsx`): reemplazar `<Image src="/icon.png">` + texto por `<PawPrint className="text-primary">` + "Mundo**Pet**".
- **Login** (`app/(auth)/layout.tsx`) y **Onboarding** (`app/onboarding/page.tsx`): reemplazar `<Image src="/logo.png">` por un bloque PawPrint coral + "MundoPet" (texto, tamaño de wordmark).
- **Super Admin** (`app/super-admin/layout.tsx`): actualizar la marca a MundoPet.

### 2.3 Assets pendientes (fuera de alcance)

`favicon`, `icon.png`, `logo.png` como archivos gráficos nuevos de MundoPet son un follow-up de diseño. La UI no depende de ellos (usa PawPrint). El logo subido por cada clínica (topbar) **no cambia**.

---

## Sección 3: Textos y dominio

| Ubicación | Antes | Después |
|-----------|-------|---------|
| `app/layout.tsx` metadata `title` | `'petMedical.app'` | `'MundoPet'` |
| `app/layout.tsx` metadata `description` | `'Plataforma de gestion veterinaria'` | `'Cuidado integral para tus mascotas'` |
| `app/r/[token]/page.tsx` footer | `{tenantName} · petMedical.app` | `{tenantName} · MundoPet` |
| `lib/pdf/medicalHistoryDocument.tsx` pie | `... | petMedical.app ...` | `... | MundoPet ...` |
| `app/api/whatsapp/send-consultation/route.ts` | `process.env.APP_URL ?? 'https://petmedical.app'` | `process.env.APP_URL ?? 'https://mundopet.com.mx'` |

**Dominio en producción:** el dominio real se resuelve por la env var `APP_URL`. Cambiar `APP_URL` a `https://mundopet.com.mx` en el entorno de producción es una tarea de configuración fuera del código (se documenta, no se implementa aquí).

---

## Sección 4: Colores hardcodeados en PDFs

Los dos documentos React-PDF usan el hex teal `#0d6b6e` para acentos. Se reemplaza por el coral de marca en hex: **`#c1502e`** (equivalente aproximado de `oklch(0.57 0.17 40)` — coral profundo legible sobre blanco en PDF).

| Archivo | Cambio |
|---------|--------|
| `lib/pdf/medicalHistoryDocument.tsx` | `#0d6b6e` → `#c1502e` (clinicName, rxLabel si aplica) + pie "MundoPet" |
| `lib/pdf/prescriptionDocument.tsx` | `#0d6b6e` → `#c1502e` (clinicName, rxLabel) |

---

## Resumen de archivos

| Archivo | Cambio |
|---------|--------|
| `app/globals.css` | Paleta OKLCH teal→coral (light + dark + sidebar + charts) |
| `app/layout.tsx` | metadata title + description |
| `app/dashboard/layout.tsx` | sidebar: PawPrint coral + "MundoPet" |
| `app/(auth)/layout.tsx` | login: PawPrint + "MundoPet" (reemplaza logo.png) |
| `app/onboarding/page.tsx` | onboarding: PawPrint + "MundoPet" (reemplaza logo.png) |
| `app/super-admin/layout.tsx` | marca MundoPet |
| `app/r/[token]/page.tsx` | footer "MundoPet" |
| `app/api/whatsapp/send-consultation/route.ts` | dominio fallback mundopet.com.mx |
| `lib/pdf/medicalHistoryDocument.tsx` | hex coral + pie "MundoPet" |
| `lib/pdf/prescriptionDocument.tsx` | hex coral |

---

## Fuera de alcance

- Generación de logo/favicon/icon.png gráficos nuevos (follow-up de diseño).
- Cambio de `APP_URL` en producción (configuración de entorno).
- Logos de clínicas (los suben los tenants; no cambian).
- Cambio del nombre del repositorio / proyecto Vercel (`petmedical`) — opcional, fuera de este alcance de código.
