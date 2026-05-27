# Design System: VeterinaIAs — "Architectural Order"

## 1. Visual Theme & Atmosphere
"Architectural Order" — Una interfaz diseñada para la eficiencia y la claridad mental. Se siente como un consultorio moderno y bien organizado: mucha luz, estructuras limpias y enfoque en la tarea.
- **Density:** 5 (Balanced whitespace)
- **Variance:** 3 (Symmetric, predictable, easy to navigate)
- **Motion:** 5 (Fluid, helpful transitions)

## 2. Color Palette (Calibrated OKLCH — "Professional Warmth")

El color primario es sage/verde bosque — cálido, profesional, y diferente del estereotipo SaaS azul-índigo. El modo oscuro usa lienzo petroleum con acento ámbar.

### Light Mode (`:root`)
| Token | Valor | Uso |
|-------|-------|-----|
| `--background` | `oklch(0.99 0.003 155)` | Fondo principal — blanco con matiz sage barely visible |
| `--foreground` | `oklch(0.18 0.025 155)` | Texto principal — casi negro con matiz sage |
| `--primary` | `oklch(0.44 0.10 155)` | "Deep Sage" — principal interactivo |
| `--primary-foreground` | `oklch(0.99 0.003 155)` | Texto sobre primario |
| `--secondary` | `oklch(0.96 0.010 155)` | Fondos de énfasis suave |
| `--muted` | `oklch(0.97 0.007 155)` | Fondos apagados |
| `--muted-foreground` | `oklch(0.45 0.03 155)` | Texto secundario |
| `--accent` | `oklch(0.30 0.045 155)` | Acento oscuro para estados de alta tensión |
| `--destructive` | `oklch(0.58 0.20 25)` | Rojo clínico |
| `--border` | `oklch(0.92 0.012 155)` | Bordes hairline |
| `--input` | `oklch(0.89 0.018 155)` | Fondos de inputs |
| `--ring` | `oklch(0.44 0.10 155)` | Focus ring — igual que primary |

### Dark Mode (`.dark`)
Canvas petroleum con acento ámbar — contrasta y complementa el sage del modo claro.
| Token | Valor | Uso |
|-------|-------|-----|
| `--background` | `oklch(0.155 0.018 230)` | Petroleum oscuro |
| `--primary` | `oklch(0.70 0.14 80)` | Warm Amber — acento cálido |
| `--foreground` | `oklch(0.975 0.005 230)` | Texto claro sobre petroleum |

## 3. Typography Rules
- **Display & Headlines:** `Montserrat` — Peso 600/700 con tracking `-0.02em`. Geometría pura y orden.
- **Body:** `Montserrat` — Peso 400/500 con leading 1.6. Alta legibilidad.
- **Technical Data:** `Geist Mono` — Para IDs, teléfonos, constantes vitales, timestamps. El "alma técnica" del software.
- **Contrast:** El juego entre la calidez de Montserrat y la frialdad de Geist Mono define el carácter premium.

## 4. Component Tokens
- **Radius base:** `0.5rem` (8px) — calibrado preciso. `rounded-xl` = 12px, `rounded-2xl` = 20px para cards principales.
- **Label overline:** `.label-overline` utility → `text-[10px] font-bold uppercase tracking-widest`
- **Section label (primario):** decorative line `w-6 h-[1.5px] bg-primary/30` + `text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]`
- **Cards:** `rounded-xl border border-border` para items de lista; `rounded-2xl` o `rounded-[2rem]` para contenedores principales
- **Shadows:** `shadow-sm` en cards simples; `shadow-xl shadow-primary/[0.02]` en contenedores principales
- **Easing:** `--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1)` para entradas; `--ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1)` para transiciones bidireccionales

## 5. Interaction Patterns
- Botón primario: `shadow-lg shadow-primary/10 active:scale-[0.97] transition-all`
- Links de navegación hover: `hover:text-primary transition-colors`
- Cards de lista hover: `hover:border-primary/40 hover:shadow-sm transition-all`
- Toasts: `sonner` con `richColors` y posición `bottom-right`

## 6. Anti-Patterns (Banned)
- No gradients en texto ni fondos principales.
- No glassmorphism (`backdrop-blur` solo en overlays de alta prioridad como el action bar de MedicalRecordForm).
- No primario azul-índigo (`hue 260`) — es el estereotipo SaaS que PRODUCT.md rechaza explícitamente.
- No `alert()` / `confirm()` del browser — usar `toast.error()` de sonner.
- No `min-h-screen` — usar `min-h-dvh` para compatibilidad con mobile Safari.
- No tipografías gigantes (> 40px).
- No saturación excesiva.
- No lenguaje técnico tipo "System Core" — usar lenguaje humano y clínico.
