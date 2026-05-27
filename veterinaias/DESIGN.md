# Design System: VeterinaIAs — "Architectural Order"

## 1. Visual Theme & Atmosphere
"Architectural Order" — Una interfaz diseñada para la eficiencia y la claridad mental. Se siente como un consultorio moderno y bien organizado: mucha luz, estructuras limpias y enfoque en la tarea.
- **Density:** 5 (Balanced whitespace)
- **Variance:** 3 (Symmetric, predictable, easy to navigate)
- **Motion:** 5 (Fluid, helpful transitions)

## 2. Color Palette (Calibrated OKLCH - "Calm Indigo")
- **Background:** `oklch(0.99 0.002 260)` — Blanco con un matiz de azul muy sutil para reducir la fatiga visual.
- **Surface:** `#FFFFFF` — Blanco puro para tarjetas y áreas de contenido.
- **Primary:** `oklch(0.55 0.12 260)` — "Trust Indigo". Un azul profesional que transmite calma y autoridad.
- **Ink:** `oklch(0.25 0.02 260)` — Gris azulado muy oscuro para el texto, legible pero menos duro que el negro.
- **Border:** `oklch(0.92 0.01 260)` — Bordes suaves que separan sin fragmentar.

## 3. Typography Rules
- **Display & Headlines:** `Montserrat` — Peso 600/700 con Tracking `-0.02em`. Geometría pura y orden.
- **Body:** `Montserrat` — Peso 400/500 con Leading 1.6. Alta legibilidad.
- **Technical Data:** `Geist Mono` — Para ID de pacientes, teléfonos, constantes vitales y pesos. El "alma técnica" del software.
- **Contrast:** El juego entre la calidez de Montserrat y la frialdad de Geist Mono define el carácter premium de la app.

## 4. Component Stylings
- **Corners:** `0.75rem` (12px) constante. Ni muy redondo ni muy afilado.
- **Cards:** Bordes finos (1px) y sombras extremadamente suaves para dar una elevación natural.
- **Inputs:** Fondo blanco, bordes definidos, focus claro en color primario.

## 5. Anti-Patterns (Banned)
- No layouts oscuros o de alto contraste.
- No tipografías gigantes (> 40px).
- No lenguaje técnico tipo "System Core" (usar lenguaje humano y clínico).
- No saturación excesiva.
