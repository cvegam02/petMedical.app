# Plan 7 — Impresión de Recetas — Diseño Detallado

**Fecha:** 2026-05-30
**Estado:** Aprobado
**Alcance:** Impresión de recetas veterinarias en PDF conforme a NOM-064-ZOO-2000, perfil profesional del veterinario y configuración mínima de recetas.

**Spec de roadmap:** `docs/superpowers/specs/2026-05-29-veterinaias-roadmap-planes4-11.md` §Plan 7

---

## Contexto

Los Planes 4, 5 y 6 están completos. El sistema ya genera PDFs de historiales médicos usando `@react-pdf/renderer` (`renderToBuffer`) en `lib/pdf/medicalHistoryDocument.tsx` y `app/api/historiales/[petId]/pdf/route.ts`. El Plan 7 reutiliza ese patrón para imprimir recetas.

**Decisiones de alcance tomadas en brainstorming:**
- **Medicamentos controlados (Grupo I / folio SENASICA):** DIFERIDOS a un plan futuro. El Plan 7 cubre solo la receta normal.
- **Firma del veterinario:** NO se carga imagen. La receta deja un espacio en blanco para firma física.
- **Configuración del template:** mínima — dos campos opcionales en Settings. El resto del formato es fijo (estandarizado por NOM-064).
- **Generación del documento:** `@react-pdf/renderer` (Opción A) — reutiliza el patrón de historiales, sin dependencias nuevas.

---

## Sección 1: Datos profesionales del veterinario (Mi Perfil)

### 1.1 Cambios en `user_profiles`

| Campo nuevo | Tipo | Notas |
|-------------|------|-------|
| `professional_license` | `TEXT NULLABLE` | cédula profesional |
| `professional_address` | `TEXT NULLABLE` | dirección del consultorio (puede diferir de la clínica) |

No se agrega `signature_url` — la firma es física en la impresión.

### 1.2 Página "Mi Perfil"

Nueva ruta `/dashboard/perfil`, accesible a **todos los roles** (fuera del Settings admin-only).

- Formulario con campos editables: `full_name`, `phone`, `professional_license`, `professional_address`
- Actualiza la propia fila de `user_profiles` vía `PATCH /api/profile`
- La RLS existente `users_update_own_profile` ya permite que un usuario actualice su propio perfil

### 1.3 API `PATCH /api/profile`

- Auth: usuario autenticado
- Actualiza únicamente la fila del usuario actual (`eq('id', user.id)`)
- Validación Zod: todos los campos opcionales, strings; `full_name` requiere min 1 si se envía
- Devuelve el perfil actualizado

### 1.4 Menú de usuario en el topbar

Nuevo componente cliente `components/dashboard/UserMenu.tsx` que reemplaza el área actual de nombre + botón de logout en `app/dashboard/layout.tsx`.

- El trigger muestra nombre + rol + avatar (igual que el diseño actual), ahora clickeable
- Al hacer clic abre un dropdown con:
  - **Mi Perfil** → `Link` a `/dashboard/perfil`
  - **Cerrar sesión** → ejecuta el `signOutAction` existente (server action) dentro de un `<form>`
- Dropdown con cierre por click-outside (patrón de `FreeTextCombobox`: listener `mousedown` sobre `document` contra un `containerRef`)
- El `UserMenu` recibe como props `fullName`, `role`, `initials` desde el layout (server component)

---

## Sección 2: Configuración de Recetas (Settings)

### 2.1 Página `/dashboard/settings/recetas`

Admin-only (consistente con el resto de Settings, que ya redirige no-admins).

Config mínima guardada en `tenant.settings` (JSONB existente):

| Campo | Tipo | Notas |
|-------|------|-------|
| `prescription_footer_note` | `string` opcional | Texto de pie de página personalizado, debajo de la leyenda obligatoria |
| `prescription_validity_days` | `number` opcional | Si se define, la receta muestra "Vigencia: X días" |

- Formulario con dos campos; guarda vía el `PATCH /api/settings` existente (hace merge de `settings`)
- Nueva entrada "Recetas" en `SettingsNav` (ícono `FileText`)

La leyenda **"Reservado al tratamiento de animales"** y los campos NOM-064 son fijos. Esta página solo controla los dos extras opcionales.

### 2.2 Tipo `TenantSettings`

Extender la interfaz `TenantSettings` en `lib/types/database.ts` con:
```typescript
prescription_footer_note?: string
prescription_validity_days?: number
```

---

## Sección 3: PrescriptionDocument (React-PDF)

Nuevo `lib/pdf/prescriptionDocument.tsx`, siguiendo el estilo de `medicalHistoryDocument.tsx` (mismos `StyleSheet`, fuentes Helvetica, colores).

### 3.1 Layout (NOM-064-ZOO-2000)

```
┌─────────────────────────────────────────────────┐
│ [Logo]   NOMBRE CLÍNICA              RECETA       │
│          Dirección · Teléfono                     │
├─────────────────────────────────────────────────┤
│ M.V.Z. <Nombre del veterinario>                  │
│ Cédula Profesional: <cédula>                     │
│ <Dirección del consultorio>                       │
│                          Fecha de emisión: <fecha>│
├─────────────────────────────────────────────────┤
│ PACIENTE                  PROPIETARIO             │
│ Nombre · Especie · Raza   Nombre                 │
│ Sexo · Edad · Peso        Domicilio              │
├─────────────────────────────────────────────────┤
│ DIAGNÓSTICO                                       │
│ <diagnosis del expediente>                        │
│                                                   │
│ TRATAMIENTO                                       │
│ <treatment del expediente>                        │
├─────────────────────────────────────────────────┤
│ PRESCRIPCIÓN                                      │
│ 1. <Medicamento> (<principio activo>)            │
│    Dosis: X · Vía: Y · Frecuencia: Z · Dur: W    │
│    Notas: ...                                     │
│ 2. ...                                            │
├─────────────────────────────────────────────────┤
│ <Pie de página personalizado, si existe>         │
│ Vigencia: X días (si configurado)                │
│                                                   │
│            _______________________                │
│            <Nombre> · Céd. <cédula>               │
│              Firma del médico                     │
│                                                   │
│ "Reservado al tratamiento de animales"            │
└─────────────────────────────────────────────────┘
```

### 3.2 Fuentes de datos

| Bloque | Fuente |
|--------|--------|
| Clínica (nombre, dirección, teléfono, logo) | `tenant` + `tenant.settings` (`address`, `phone`, `logo_url`) |
| Veterinario (nombre, cédula, dirección consultorio) | perfil de `created_by` del expediente |
| Fecha de emisión | `created_at` del expediente |
| Paciente (nombre, especie, raza, sexo, edad, peso) | `pet` + `weight_kg` del expediente |
| Propietario (nombre, domicilio) | `owner` (`full_name`, `address`) |
| Diagnóstico / Tratamiento | `medical_record.diagnosis`, `medical_record.treatment` |
| Medicamentos | `prescriptions` (nombre, principio activo, dosis, vía, frecuencia, duración, notas) |

### 3.3 Reglas de renderizado

- **Diagnóstico / Tratamiento:** si el expediente no tiene `diagnosis` o `treatment`, esa sub-sección no se renderiza (no aparece vacía).
- **Cédula faltante:** si el `created_by` no tiene `professional_license`, el campo se imprime como línea en blanco (`_______`) para llenarse a mano. Lo mismo para `professional_address`.
- **Pie de página personalizado / vigencia:** solo se renderizan si están configurados en `tenant.settings`.
- **Espacio de firma:** una línea en blanco con el nombre del veterinario y su cédula impresos debajo, más la etiqueta "Firma del médico".
- **Leyenda obligatoria:** "Reservado al tratamiento de animales" siempre presente al pie.

### 3.4 Interfaz de props

```typescript
interface PrescriptionData {
  clinic: { name: string; address: string | null; phone: string | null; logoUrl: string | null }
  vet: { full_name: string; professional_license: string | null; professional_address: string | null }
  patient: { name: string; species: string | null; breed: string | null; sex: string; age: string | null; weight: number | null }
  owner: { full_name: string; address: string | null }
  record: { diagnosis: string | null; treatment: string | null; emittedAt: string }
  prescriptions: Array<{ medication_name: string; active_ingredient: string | null; dosage: string; route_of_administration: string | null; frequency: string; duration: string; notes: string | null }>
  footerNote: string | null
  validityDays: number | null
}
```

---

## Sección 4: API route + botón de impresión

### 4.1 `GET /api/medical-records/[id]/prescription/pdf`

- Auth + verificar que el expediente pertenece al tenant del usuario (vía `medical_records.tenant_id`)
- Fetch en una query: el `medical_record` con `prescriptions`, `pet` (+`species`), `owner`, perfil de `created_by` (`full_name`, `professional_license`, `professional_address`), y `tenant` (+`settings`)
- Si el expediente **no tiene prescriptions** → 400 "El expediente no tiene recetas"
- Calcular edad del paciente desde `pet.date_of_birth`
- `renderToBuffer(createElement(PrescriptionDocument, data))` → devolver el PDF con headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="receta-<pet_name>-<fecha>.pdf"`

### 4.2 Botón "Imprimir receta"

En la página de detalle del expediente (`app/dashboard/pets/[petId]/records/[recordId]/page.tsx`):

- Se muestra **solo cuando el expediente tiene al menos una receta** (`prescriptions.length > 0`)
- Abre el PDF en pestaña nueva (`<a href=".../prescription/pdf" target="_blank">`), mismo patrón que el botón de PDF de historiales
- Ícono `Printer` o `FileText`, etiqueta "Imprimir receta"

---

## Resumen de archivos

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/20260530000002_vet_professional_fields.sql` | Crear — agrega `professional_license`, `professional_address` a `user_profiles` |
| `lib/types/database.ts` | Modificar — `UserProfile` + tabla `user_profiles` con campos nuevos; `TenantSettings` con campos de receta |
| `lib/validations/profile.ts` | Crear — schema Zod para el perfil propio |
| `app/api/profile/route.ts` | Crear — `PATCH` perfil propio |
| `app/dashboard/perfil/page.tsx` | Crear — página Mi Perfil (server) |
| `components/profile/ProfileForm.tsx` | Crear — formulario de perfil (client) |
| `components/dashboard/UserMenu.tsx` | Crear — dropdown de usuario en topbar |
| `app/dashboard/layout.tsx` | Modificar — usar `UserMenu` |
| `app/dashboard/settings/recetas/page.tsx` | Crear — config de recetas (server) |
| `components/settings/PrescriptionConfigForm.tsx` | Crear — formulario de config (client) |
| `components/settings/SettingsNav.tsx` | Modificar — entrada "Recetas" |
| `lib/pdf/prescriptionDocument.tsx` | Crear — documento React-PDF |
| `app/api/medical-records/[id]/prescription/pdf/route.ts` | Crear — genera el PDF |
| `app/dashboard/pets/[petId]/records/[recordId]/page.tsx` | Modificar — botón "Imprimir receta" |

---

## Fuera de alcance (planes futuros)

- Medicamentos controlados Grupo I: folios SENASICA, receta cuantificada con copias, reporte mensual.
- Firma digital / imagen de firma.
- Editor visual de template.
