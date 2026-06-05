---
name: MundoPet
description: Plataforma SaaS de gestión veterinaria — donde el cuidado clínico y la confianza institucional convergen.
colors:
  vitality-green: "#35C48B"
  vitality-green-deep: "#27A673"
  vitality-green-dark: "#1D865C"
  vitality-green-pale: "#DCF8EB"
  vitality-green-surface: "#F1FCF7"
  institutional-blue: "#0F4C81"
  institutional-blue-mid: "#337DB9"
  institutional-blue-light: "#5C99CA"
  institutional-blue-surface: "#F3F8FC"
  canvas-white: "#FAFBFC"
  pure-surface: "#FFFFFF"
  ink-dark: "#161D24"
  slate-mid: "#55616C"
  muted-steel: "#73808C"
  whisper-border: "#E7EBEF"
  soft-fill: "#F3F5F7"
  amber-sand: "#F3C57B"
  success: "#22C55E"
  warning: "#F59E0B"
  error: "#EF4444"
  info: "#3B82F6"
  dark-canvas: "#101418"
  dark-surface: "#182028"
  dark-text: "#F7F9FB"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.1em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.vitality-green}"
    textColor: "{colors.pure-surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.vitality-green-deep}"
    textColor: "{colors.pure-surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.institutional-blue-surface}"
    textColor: "{colors.institutional-blue}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.vitality-green-pale}"
    textColor: "{colors.vitality-green-dark}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.pure-surface}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.pure-surface}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
---

# Design System: MundoPet

## 1. Overview

**Creative North Star: "La Confianza Verde"**

MundoPet es la plataforma donde el verde carga el peso emocional del cuidado y el azul carga el peso institucional de la confianza. La atmósfera es la del veterinario de confianza: un consultorio moderno con buena luz, superficies limpias, nada superfluo — serio sin ser frío, porque el trabajo involucra seres vivos. El verde actúa; el azul ancla.

La densidad es equilibrada (5/10): dashboards orientados a datos con espacio suficiente para respirar. El movimiento es funcional (4/10): feedback de estado, skeleton loaders, sin coreografía. La varianza es predecible (3/10): grillas consistentes, affordances familiares, estructura que desaparece en la tarea.

Este sistema rechaza explícitamente: la estética SaaS de gradientes azul-púrpura, el look de apps de mascotas para consumidor (iconos de patitas, lavados pastel, ilustraciones infantiles, todo redondeado por defecto), la rigidez corporativa navy-and-gold, y la UI hospitalaria genérica de tablas pesadas sin jerarquía.

**Key Characteristics:**
- Verde como señal emocional: acciones, confirmaciones, bienestar del paciente
- Azul como ancla institucional: headers, navegación, autoridad clínica
- Datos hacia adelante: el expediente clínico es el producto, la UI es el marco
- Manrope single-family: legible a cualquier densidad, amigable a cualquier escala
- Flat by default: las superficies ganan profundidad con propósito, no con decoración

## 2. Colors: La Paleta Bienestar + Confianza

Dos ejes de marca con roles distintos: Verde Bienestar para acción y salud, Azul Institucional para estructura y confianza. Los grises neutros son el lenguaje primario de superficie; ambos ejes de marca sirven momentos específicos, no compiten.

### Primary — Verde Bienestar

- **Vitality Green** (#35C48B): CTAs primarios, estados de confirmación, indicadores de nav activos, marcadores de progreso. El color de acción de la plataforma.
- **Deep Vitality** (#27A673): Estado hover en elementos verdes, texto de éxito sobre fondos claros.
- **Dark Vitality** (#1D865C): Texto on-hover, fill de íconos de éxito, texto de badges success.
- **Pale Vitality** (#DCF8EB): Tinte de fondo para estados de éxito, alert banners positivos.
- **Surface Vitality** (#F1FCF7): Fondo hover en items de nav, fondo de badges secundarios, hover de cards.

### Secondary — Azul Institucional

- **Institutional Blue** (#0F4C81): Headers, logo, texto activo en navegación, texto de badges clínicos, anclajes de sección. El color de autoridad.
- **Trust Mid** (#337DB9): Links, badges de info, elementos interactivos secundarios.
- **Trust Light** (#5C99CA): Tintes de íconos, variante para dark mode.
- **Institutional Surface** (#F3F8FC): Fondo de botón secundario, fondos de estado info.

### Tertiary — Calidez Humana

- **Amber Sand** (#F3C57B): Ilustraciones de empty states, highlights de onboarding, acentos call-to-attention.

**The Restraint Rule.** Amber Sand aparece en ≤5% de cualquier pantalla. Humaniza; no domina. Nunca como color estructural o de fondo de componente interactivo.

### Neutral

- **Canvas White** (#FAFBFC): Fondo del app — barely off-white, nunca blanco puro.
- **Pure Surface** (#FFFFFF): Cards, inputs, modales. La superficie elevada.
- **Ink Dark** (#161D24): Texto primario — near-black con calidez mínima.
- **Slate Mid** (#55616C): Texto secundario, descripciones, metadata.
- **Muted Steel** (#73808C): Placeholder, labels deshabilitados, captions de datos.
- **Whisper Border** (#E7EBEF): Bordes de card (1px), divisores, bordes de input en reposo.
- **Soft Fill** (#F3F5F7): Fondos muted, estados deshabilitados, secciones de baja jerarquía.

### Semantic

- **Success** (#22C55E) · **Warning** (#F59E0B) · **Error** (#EF4444) · **Info** (#3B82F6)

### Dark Mode

- **Dark Canvas** (#101418): Fondo app en dark mode.
- **Dark Surface** (#182028): Cards, panels en dark mode.
- **Dark Text** (#F7F9FB): Texto primario en dark mode.
- Primary permanece en Vitality Green (#35C48B); secondary en Trust Light (#5C99CA).

**The One Brand Rule.** Verde es el color de acción. Azul es el color de autoridad. Nunca aparecen juntos en el mismo elemento interactivo — sin gradiente, sin split, sin superposición. El verde actúa; el azul ancla.

**The No-Warm-Gray Rule.** La escala de grises es cool-to-neutral. Amber Sand es el único elemento cálido del sistema, reservado exclusivamente para contextos de ilustración y onboarding.

## 3. Typography: La Voz Única

**Display Font:** Manrope (sans-serif)
**Body Font:** Manrope (sans-serif)
**Technical Data:** Geist Mono (utility override — no en encabezados, nav, ni body)

**Character:** Manrope es un grotesco humanista geométrico — preciso y técnico en peso Bold, amigable y legible en Regular. Una sola familia cubre toda la jerarquía sin tensión entre display y body.

**The Single Voice Rule.** Manrope carga todo el texto: encabezados, body, labels, botones. La jerarquía se expresa a través del peso (400 → 700), tamaño (0.75rem → 3rem) y color — nunca a través de una segunda tipografía. Geist Mono es una excepción utilitaria para datos técnicos, no una voz de marca.

### Hierarchy

- **Display** (700, 3rem/48px, lh 1.15, ls -0.02em): Headers de página, bienvenida del dashboard. Máximo uno por vista.
- **Headline** (700, 2.25rem/36px, lh 1.2, ls -0.015em): Headers de sección, títulos de diálogo.
- **Title** (600, 1.875rem/30px, lh 1.3, ls -0.01em): Títulos de card principal, headers de panel.
- **Title S** (600, 1.5rem/24px, lh 1.35): Sub-sección headers, labels de sección en formularios.
- **Subtitle** (500, 1.25rem/20px, lh 1.4): Headers de grupo en listas, subtítulos de soporte.
- **Body Large** (400, 1.125rem/18px, lh 1.6): Descripciones lead, texto de empty states.
- **Body** (400, 1rem/16px, lh 1.6): Body por defecto. 65–75ch max para prosa.
- **Body Small** (400, 0.875rem/14px, lh 1.55): Celdas de tabla, items de sidebar, info secundaria.
- **Label** (700, 0.75rem/12px, lh 1.4, ls 0.1em, UPPERCASE): Overlines de sección, badges de estado, headers de columna, chips de metadata.

## 4. Elevation

Flat by default. Las superficies descansan en el mismo plano visual. La profundidad aparece solo cuando una superficie está genuinamente desprendida de la página: modales, dropdowns, tooltips flotantes, paletas de comandos.

**The One Shadow Rule.** Un único token de sombra cubre todos los contextos flotantes: `0px 4px 12px rgba(15, 76, 129, 0.08)`. Está tintada hacia Institutional Blue — nunca gris puro, nunca negro. Para modales sobre overlay oscuro, incrementar opacidad a 0.14 sin modificar la fórmula.

### Shadow Vocabulary

- **Ambient Float** (`0px 4px 12px rgba(15,76,129,0.08)`): Dropdowns, popovers, elementos de acción flotantes.
- **Modal Lift** (`0px 8px 24px rgba(15,76,129,0.12)`): Diálogos modales, command palette.

**The Flat-By-Default Rule.** Si una card tiene sombra en reposo, elimínala. Las cards en reposo usan separación solo por borde (Whisper Border, 1px). La sombra se gana con la elevación, no se pinta de fábrica.

## 5. Components

### Buttons

Redondeados (12px) sin ser lúdicos — precisos, táctiles, con feedback claro en press.

- **Shape:** 12px radius (rounded-md). Consistente en todos los tipos.
- **Primary:** Vitality Green (#35C48B) / white text / sin sombra en reposo. Hover: Deep Vitality (#27A673). Active: scale(0.98). Sin outer glow. Sin gradiente.
- **Secondary:** Institutional Surface (#F3F8FC) / Institutional Blue text (#0F4C81) / 1px Whisper Border. Hover: Pale Vitality background (#DCF8EB) / Dark Vitality text.
- **Ghost:** transparent / Ink Dark text / sin borde. Hover: Soft Fill background. Para acciones no-primarias o destructivas alternativas.
- **Destructive:** Error Red (#EF4444) / white text. Misma forma que primary. Solo dentro de diálogos de confirmación — nunca como CTA prominente de página.

### Cards

- **Corner Style:** 16px radius (rounded-lg).
- **Background:** Pure Surface (#FFFFFF).
- **Border:** 1px Whisper Border (#E7EBEF) en reposo. On hover: border cambia a Pale Vitality (#DCF8EB).
- **Shadow Strategy:** Sin sombra en reposo (ver Elevation). Ambient Float on hover.
- **Internal Padding:** 24px.

**The No-Nested-Card Rule.** Una card nunca contiene otra card. Si el contenido dentro de una card necesita agrupamiento, usar una línea divisora o una sección tintada (Soft Fill, #F3F5F7) — nunca un card anidado.

### Inputs / Fields

- **Style:** Pure Surface background, Whisper Border (1px), 8px radius (rounded-sm).
- **Label:** Encima del campo, Body Small 500, Ink Dark. Siempre visible — no floating label.
- **Helper text:** Debajo del campo, Caption size, Muted Steel.
- **Focus:** Border cambia a Vitality Green (#35C48B), 2px ring al 20% opacidad.
- **Error:** Border Error Red (#EF4444), mensaje debajo en Error Red Body Small.
- **Disabled:** Soft Fill background, Muted Steel text, 0.5 opacidad en label.

### Navigation

- **Fondo:** Canvas White (#FAFBFC) — congruente con la superficie de la app. 1px Whisper Border en el borde derecho.
- **Item default:** Body Small 500, Slate Mid text, sin fondo.
- **Hover:** Soft Fill background (#F3F5F7), Ink Dark text.
- **Activo/Current:** Surface Vitality background (#F1FCF7), texto Vitality Green, indicador de borde left de 2px en Vitality Green.
- **Íconos:** Lucide outline, 20px, stroke 2px, mismo color que el texto del item.

**The Nav Congruence Rule.** El sidebar nunca tiene fondo oscuro. Pertenece a la misma superficie clara que el contenido. El color institucional (Institutional Blue) se expresa en el logo y en los labels activos — no en el fondo de la navegación.

### Status Badges

- **Shape:** 8px radius (rounded-sm), padding 4px 10px.
- **Text:** Label style (0.75rem, 700, uppercase).
- **Success:** Pale Vitality background / Dark Vitality text. **Warning:** amber-100 / amber-700. **Error:** red-100 / red-700. **Info:** Institutional Surface / Institutional Blue.

### Clinical Record (Signature Component)

El expediente clínico es el producto. Su estructura visual lo refleja.

- Estructura full-bleed sin card wrapper alrededor del contenido principal del record.
- Section headers: combinación de Title S + Label overline.
- Data fields: Label sobre el campo (Body Small 500), valor debajo (Body).
- Entradas de timeline: conector de borde izquierdo (1px Whisper Border vertical) — nunca side-stripe en color.

## 6. Do's and Don'ts

### Do

- **Do** usar Vitality Green exclusivamente para acciones primarias, confirmaciones y estados activos.
- **Do** usar Institutional Blue para headers, logo, labels de navegación y marcadores de autoridad clínica.
- **Do** usar Manrope para todo el texto y Geist Mono solo para datos técnicos (IDs, teléfonos, timestamps, números de expediente).
- **Do** definir la profundidad de cards con 1px Whisper Border, sin sombra en reposo.
- **Do** aplicar 16px radius en cards y 12px en controles interactivos (botones, selects, inputs principales).
- **Do** usar la sombra azul-tintada (`rgba(15,76,129,0.08)`) para todas las superficies flotantes.
- **Do** mantener contraste WCAG AA mínimo. Canvas White (#FAFBFC) + Ink Dark (#161D24) = 16.7:1.
- **Do** usar skeleton loaders (dimensiones coincidentes con el layout) en lugar de spinners centrados para cargas de contenido.
- **Do** mantener Amber Sand (#F3C57B) bajo el 5% del área visible por pantalla.
- **Do** escribir labels de overline, badges y headers de columna en UPPERCASE + tracking-widest (Label style).
- **Do** asegurar que todo elemento interactivo tenga estados: default, hover, focus, active, disabled.

### Don't

- **Don't** usar SaaS clichés: gradientes azul-púrpura, hero metrics con números gigantes, glassmorphism cards, "powerful synergies" copy. (Anti-referencia explícita del producto.)
- **Don't** usar estética de app de mascotas para consumidor: iconos de patitas, lavados pastel, ilustraciones infantiles, rounded-everything por defecto. (Anti-referencia explícita del producto.)
- **Don't** usar patrones de dashboard corporativo: combinaciones navy-and-gold, layouts formales rígidos, look de trajes y maletines. (Anti-referencia del producto.)
- **Don't** usar UI hospitalaria genérica: teal de hospital, tablas densas sin jerarquía, densidad de UI de 2005. (Anti-referencia del producto.)
- **Don't** usar `border-left` o `border-right` mayor a 1px como stripe de acento en cards, list items o alerts. Reescribir con borde completo, tinte de fondo, o nada.
- **Don't** usar gradient text (`background-clip: text` con gradiente). Énfasis via peso o tamaño.
- **Don't** usar glassmorphism como tratamiento de superficie por defecto.
- **Don't** poner Institutional Blue y Vitality Green en el mismo elemento interactivo (The One Brand Rule).
- **Don't** agregar sombra a cards en reposo (The Flat-By-Default Rule).
- **Don't** usar Amber Sand como color dominante o estructural (The Restraint Rule).
- **Don't** usar sidebar con fondo oscuro (The Nav Congruence Rule).
- **Don't** usar tipografías display (700 + tamaño grande) en labels de UI, texto de botones, o campos de datos.
- **Don't** usar `min-h-screen` — usar `min-h-dvh` para compatibilidad con mobile Safari.
- **Don't** usar `#000000` ni `#FFFFFF` puros en texto. Ink Dark (#161D24) es el negro de la plataforma.
