# Form Redesign — Design Spec
**Fecha:** 2026-05-26  
**Estado:** Aprobado por usuario

---

## Objetivo

Reemplazar las pantallas de formulario actuales —un título suelto con campos sin estructura— por el patrón **B+C**: secciones dentro de una card (C) con un panel contextual a la derecha (B). Unificar todos los componentes base de formulario con el design system "Architectural Order".

---

## Alcance

### Dentro del scope

| Qué | Archivos |
|-----|---------|
| Componente `Input` | `components/ui/input.tsx` |
| Componente `SelectTrigger` | `components/ui/select.tsx` |
| Estilos de native `<select>` | todas las ocurrencias en formularios |
| Nuevo patrón `FormSection` | `components/ui/form-section.tsx` (crear) |
| Nuevo `FormPageLayout` | `components/ui/form-page-layout.tsx` (crear) |
| Nuevo `FormContextPanel` | `components/ui/form-context-panel.tsx` (crear) |
| `OwnerForm` | `components/owners/OwnerForm.tsx` |
| `PetForm` | `components/pets/PetForm.tsx` |
| `AppointmentForm` | `components/appointments/AppointmentForm.tsx` |
| `InviteUserForm` | `components/team/InviteUserForm.tsx` |
| Pages de formulario (new/edit) | `app/dashboard/owners/new/page.tsx`, `app/dashboard/owners/[ownerId]/edit/page.tsx`, `app/dashboard/owners/[ownerId]/pets/new/page.tsx`, `app/dashboard/pets/[petId]/edit/page.tsx`, `app/dashboard/appointments/new/page.tsx`, `app/dashboard/settings/team/page.tsx` |
| Auth forms (tratamiento simplificado) | `components/auth/LoginForm.tsx`, `components/auth/RegisterForm.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` |

### Fuera del scope

- `MedicalRecordForm` — ya tiene diseño especial con action bar flotante; se toca en una fase posterior.
- `TenantSetupForm` / onboarding — flujo de onboarding tiene layout propio; también fase posterior.
- Lógica de validación y submit — no cambia nada funcional.

---

## Patrón de layout: B+C

```
┌─────────────────────────────────────────┬───────────────────┐
│  ← Breadcrumb                           │                   │
│                                         │  Panel contextual │
│  ── Sección  ·············              │                   │
│  Nombre completo *                      │  Campos req.      │
│  ┌──────────────────────────────────┐   │  * Nombre         │
│  │                                  │   │  * Teléfono       │
│  └──────────────────────────────────┘   │                   │
│                                         │  Al crear:        │
│  ── Contacto  ·············             │  → Mascotas       │
│  Teléfono *       Email                 │  → Citas          │
│  ┌───────────┐   ┌──────────────┐       │                   │
│  │           │   │              │       │                   │
│  └───────────┘   └──────────────┘       │                   │
│                                         │                   │
│  ─────────────────────────────────────  │                   │
│  [  Guardar  ]  [ Cancelar ]            │                   │
└─────────────────────────────────────────┴───────────────────┘
```

La columna del formulario ocupa `1fr`, el panel contextual tiene ancho fijo `w-64` (`256px`). En pantallas menores a `lg` (1024px), el panel contextual se colapsa debajo del formulario (`grid-cols-1`) — el panel pasa a ser horizontal/compacto en lugar de vertical.

---

## Componentes nuevos

### `FormPageLayout`

Wrapper de página para formularios. Recibe:
- `backHref: string` — URL del breadcrumb padre
- `backLabel: string` — texto del enlace padre (ej. "Dueños")
- `overline: string` — etiqueta overline (ej. "Directorio")
- `title: string` — título de la página (ej. "Nuevo dueño")
- `contextPanel?: React.ReactNode` — contenido del panel derecho
- `children` — el formulario

Renderiza:
1. Fila de breadcrumb (`← backLabel / title`)
2. Overline + título (igual que las páginas de lista)
3. Grid `grid-cols-[1fr_256px] gap-8` o `grid-cols-1` si no hay `contextPanel`

### `FormSection`

Agrupa campos dentro del form card con un separador de sección. Recibe:
- `title: string` — nombre de la sección ("Identidad", "Contacto", "Horario")
- `children`

Renderiza:
```
── IDENTIDAD ────────────────────────
[children]
```
Línea decorativa: `<span class="w-4 h-[1px] bg-border" />` + texto overline + `<div class="flex-1 h-[1px] bg-border" />`

### `FormContextPanel`

Card blanca con contenido contextual. Recibe `children`. Solo es un contenedor con `bg-card border border-border rounded-xl p-5 space-y-4 text-sm`.

Dentro se componen con elementos simples (no necesitan ser componentes):
- **Required badges**: lista de badges para campos obligatorios
- **Tip list**: lista con `→` items de ayuda
- **Flow steps**: numerados para formularios con flujo (citas)

---

## Cambios en componentes base

### `Input` (`components/ui/input.tsx`)
- `h-8` → `h-9` (alineado con los botones rediseñados)
- `rounded-lg` → `rounded-sm`
- `ring-3` → `ring-2`
- Mantener todo lo demás

### `SelectTrigger` (`components/ui/select.tsx`)
- `data-[size=default]:h-8` → `data-[size=default]:h-9`
- `data-[size=sm]:h-7` → `data-[size=sm]:h-8`
- `rounded-lg` → `rounded-sm`
- `ring-3` → `ring-2`
- Añadir `w-full` por defecto (actualmente es `w-fit`)

### Native `<select>` en formularios
Los formularios usan `<select>` nativos con clases mezcladas (`border-slate-300`, `border-input`). Reemplazar por el componente `<Select>` / `<SelectTrigger>` de `components/ui/select.tsx` para consistencia visual total.

**Afecta:**
- `PetForm`: especie, raza, sexo
- `AppointmentForm`: mascota, duración, asignar a

---

## Formularios — diseño por forma

### `OwnerForm` — Secciones

```
── IDENTIDAD ────
  Nombre completo *  (full width)

── CONTACTO ─────
  Teléfono *   |   Email
  Dirección        (full width)

[Guardar]  [Cancelar]
```

Panel contextual: "Campos requeridos" + "Al crear el dueño" con 3 bullets.

### `PetForm` — Secciones

```
── PACIENTE ─────
  Nombre *   |   Especie *
  Raza (si hay)   |   Sexo

── DATOS CLÍNICOS ────
  Fecha nacimiento  |  Color
  Microchip         |  (vacío)

── NOTAS ────
  Notas (full width)

[Guardar]  [Cancelar]
```

Panel contextual: muestra el nombre del dueño (pasado como prop `ownerName`), y qué se puede hacer después.

### `AppointmentForm` — Secciones

```
── PACIENTE ─────
  Dueño * (con autocomplete)
  Mascota * (select, deshabilitado hasta elegir dueño)

── HORARIO ──────
  Fecha y hora *  |  Duración

── DETALLES ─────
  Motivo
  Asignar a (si hay equipo)
  Notas internas (textarea)

[Crear cita]  [Cancelar]
```

Panel contextual: "Flujo de la cita" (numerado: Crear → Confirmar → Consulta) + campos requeridos.

### `InviteUserForm`
Formulario simple (email + rol). Sin panel contextual. Solo aplicar `FormSection` y `Input` actualizado.

### Auth forms (`LoginForm`, `RegisterForm`)
Tratamiento distinto: no tienen sidebar de dashboard, son pantallas de auth centradas. No se aplica B+C. Solo mejoras de consistencia:
- Eliminar `text-red-500` → `text-destructive`
- Eliminar `text-slate-600`, `text-blue-600` → tokens del design system
- El Card/layout de la página de login/register se mejora con el overline de la marca y se quita el Card de shadcn a favor de un contenedor más limpio.

---

## Pages de formulario

Actualmente son shells muy simples con `<h1 className="text-2xl font-bold text-slate-900">`. Reemplazar por `FormPageLayout`:

```tsx
// Antes
export default function NewOwnerPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nuevo dueño</h1>
      <OwnerForm />
    </div>
  )
}

// Después
export default function NewOwnerPage() {
  return (
    <FormPageLayout
      backHref="/dashboard/owners"
      backLabel="Dueños"
      overline="Directorio"
      title="Nuevo dueño"
      contextPanel={<OwnerContextPanel />}
    >
      <OwnerForm />
    </FormPageLayout>
  )
}
```

---

## Colores y tokens — correcciones

Hay strings de color hardcodeados en formularios y páginas de auth que deben migrarse a tokens:

| Clase actual | Clase correcta |
|---|---|
| `text-red-500` | `text-destructive` |
| `text-slate-900` | `text-foreground` |
| `text-slate-600` | `text-muted-foreground` |
| `text-blue-600` | `text-primary` |
| `border-slate-300` | `border-input` |
| `hover:underline` (auth links) | `hover:text-primary hover:underline` |

---

## Orden de implementación

1. Actualizar `Input` y `SelectTrigger` (componentes base — no rompe nada)
2. Crear `FormSection`, `FormPageLayout`, `FormContextPanel`
3. Actualizar `OwnerForm` + pages de owner
4. Actualizar `PetForm` + pages de pet
5. Actualizar `AppointmentForm` + page de appointments/new
6. Actualizar `InviteUserForm`
7. Corregir auth forms y páginas de auth

---

## Lo que NO cambia

- Lógica de validación (Zod schemas)
- Lógica de submit / API calls
- Manejo de errores del servidor (toast.error)
- Tests existentes — solo actualizar si hay cambios en el texto de botones o labels
- `MedicalRecordForm` (queda para iteración posterior)
- `TenantSetupForm` / onboarding (queda para iteración posterior)
