# Plan 8 — Estética

**Fecha:** 2026-05-31
**Estado:** Aprobado
**Alcance:** Módulo de servicios de estética (baño, corte, uñas, etc.) integrado al calendario existente, con catálogo configurable e historial por mascota.

---

## Contexto

La clínica puede ofrecer servicios no clínicos como baño, corte de pelo, corte de uñas, limpieza de oídos, etc. Estos servicios se agendan, se realizan y quedan registrados en el historial de la mascota — pero son independientes del expediente clínico.

**Decisiones de diseño tomadas:**

- La estética se agenda **dentro del calendario de citas existente** (no calendario aparte). Esto reutiliza estados, confirmación y vista sin duplicar lógica.
- El catálogo de servicios va en **Settings › Servicios** (nueva sección, separada de Catálogos clínicos). Cuando lleguen planes 9–11, sus catálogos se agregarán como sub-tabs en esa misma sección.
- **Sin precio en v1** — el cobro se maneja fuera del sistema.
- **Sin fotos ni campo de estilista en v1** — anotados para versión futura.
- El historial sigue el **patrón de cartilla** (igual que Vacunas/Desparasitaciones): modal en el hero del perfil de mascota.

---

## 1. Modelo de Datos

### 1.1 Nueva tabla `grooming_service_catalog`

Catálogo de servicios de estética por tenant. Mismo patrón que `vaccine_catalog`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | RLS tenant-scoped |
| `name` | TEXT NOT NULL | ej. "Baño", "Corte de pelo", "Corte de uñas" |
| `duration_minutes` | INTEGER NULLABLE | duración estimada — opcional, para bloquear calendario |
| `active` | BOOLEAN DEFAULT true | archivar sin borrar |
| `notes` | TEXT NULLABLE | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:**
- SELECT: `tenant_id = auth_tenant_id()`
- INSERT: `tenant_id = auth_tenant_id()`
- UPDATE: `tenant_id = auth_tenant_id()`

### 1.2 Migración en tabla `appointments`

Nueva columna que distingue el tipo de cita:

```sql
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'consultation'
  CHECK (appointment_type IN ('consultation', 'grooming'));
```

Las citas existentes quedan como `'consultation'` automáticamente gracias al DEFAULT.

### 1.3 Nueva tabla `grooming_sessions`

Registro de una sesión de estética realizada. Inmutable tras guardar (como `medical_records`).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | RLS |
| `pet_id` | UUID FK → pets | |
| `appointment_id` | UUID FK NULLABLE → appointments | SET NULL si se borra la cita; null si se agrega manualmente |
| `session_date` | DATE NOT NULL | fecha de la sesión |
| `notes` | TEXT NULLABLE | observaciones libres |
| `created_by` | UUID FK → user_profiles | quién registró la sesión |
| `created_at` | TIMESTAMPTZ | |

**RLS:**
- SELECT: `tenant_id = auth_tenant_id()`
- INSERT: `tenant_id = auth_tenant_id()`
- No UPDATE (inmutable)

### 1.4 Nueva tabla `grooming_session_services`

Servicios realizados dentro de una sesión (relación N:M desnormalizada).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `session_id` | UUID FK → grooming_sessions ON DELETE CASCADE | |
| `tenant_id` | UUID FK → tenants | para RLS directo |
| `service_catalog_id` | UUID FK NULLABLE → grooming_service_catalog ON DELETE SET NULL | null si texto libre |
| `service_name` | TEXT NOT NULL | desnormalizado al momento de registrar |
| `created_at` | TIMESTAMPTZ | |

**RLS:**
- SELECT: `tenant_id = auth_tenant_id()`
- INSERT: `tenant_id = auth_tenant_id()`

---

## 2. Settings › Servicios (nueva sección)

### 2.1 Navegación

Agregar entrada **"Servicios"** al array `SECTIONS` en `components/settings/SettingsNav.tsx`:

```ts
{ href: '/dashboard/settings/servicios', icon: Scissors, label: 'Servicios' }
```

Ubicada después de "Catálogos" en la nav. Icono: `Scissors` de lucide-react.

### 2.2 Página `settings/servicios/page.tsx`

Misma estructura que `settings/catalogos/page.tsx`: tabs internas con un tab inicial **"Estética"**.

```
Settings › Servicios
└── Tab: Estética   ← Plan 8
└── Tab: Estadía    ← Plan 9 (a futuro)
└── Tab: Cirugía    ← Plan 10 (a futuro)
└── Tab: Hospit.    ← Plan 11 (a futuro)
```

En v1 solo existe el tab "Estética". Los demás se agregan cuando lleguen sus planes.

### 2.3 Tab Estética — CRUD del catálogo

Componente `components/settings/GroomingServiceCatalogTab.tsx`. Patrón idéntico a `VaccineCatalogTab`.

**Lista:**
- Columnas: Nombre, Duración estimada (`X min` o `—`), Estado (activo/archivado)
- Botón "Agregar servicio" → modal con formulario
- Acciones por fila: Editar / Archivar (toggle `active`)

**Formulario (modal):**
- `name` — texto requerido
- `duration_minutes` — número opcional, sufijo "min"
- `notes` — textarea opcional

---

## 3. Citas — Extender el flujo existente

### 3.1 Selector de tipo en `NewAppointmentModal`

Al crear una cita, el modal muestra un selector al inicio:

```
Tipo de cita:  ○ Consulta   ○ Estética
```

Default: Consulta (sin cambio en flujo existente).

**Si el usuario selecciona Estética:**
- El campo "Motivo de consulta" (texto libre) se reemplaza por un multi-select de servicios del catálogo `grooming_service_catalog`.
- El campo es opcional (la cita se puede crear sin especificar servicios, y se detallan al registrar la sesión).
- Los servicios seleccionados se guardan en el campo `reason` de `appointments` como texto desnormalizado (JSON serializado como string, ej. `"Baño, Corte de pelo"`) — no en una tabla separada para no complicar el esquema de citas.

### 3.2 Vista del calendario

Las citas de estética aparecen en el calendario con un indicador visual distinto (color diferente o ícono de tijeras) para distinguirlas de las consultas.

### 3.3 Flujo al completar una cita de estética

Cuando una cita de tipo `grooming` se marca como `completed`, el sistema muestra un prompt/banner:

> "¿Deseas registrar la sesión de estética?"  [Registrar] [Omitir]

Esto lleva al modal de registro de sesión (sección 4).

---

## 4. Registro de Sesión

### 4.1 Modal "Registrar sesión de estética"

Se abre desde dos puntos de entrada:
1. Al completar una cita de estética (flujo automático)
2. Botón "Agregar manualmente" en el historial del perfil de mascota

**Campos:**
- `session_date` — fecha, default hoy. Usa el componente `DateInput` existente.
- `services` — multi-select del catálogo `grooming_service_catalog`. Acepta texto libre (combobox, patrón igual que medicamentos en recetas). Mínimo 1 servicio requerido.
- `notes` — textarea opcional

**Al guardar:**
1. INSERT en `grooming_sessions` con `appointment_id` (si viene de cita) o `null` (manual)
2. INSERT en `grooming_session_services` por cada servicio seleccionado (desnormalizando `service_name`)
3. El registro es inmutable tras guardar (sin edición)

---

## 5. Historial en el Perfil de Mascota

### 5.1 Sección "Estética" en el hero

Nueva sección en `app/dashboard/pets/[petId]/page.tsx`, al lado de Vacunas/Desparasitaciones. Mismo patrón: botón que abre un modal.

**Modal "Estética":**

| Columna | Contenido |
|---------|-----------|
| Fecha | `session_date` formateada |
| Servicios | Chips con cada servicio realizado |
| Notas | Texto libre (truncado si largo) |
| Clínica | Nombre del tenant |

- Las sesiones vinculadas a citas completadas aparecen automáticamente.
- Las sesiones registradas manualmente también aparecen.
- Ordenadas por fecha descendente.
- Botón "Agregar manualmente" abre el modal de registro sin `appointment_id`.

---

## 6. APIs necesarias

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/settings/grooming-catalog` | GET, POST | Listar y crear servicios del catálogo |
| `/api/settings/grooming-catalog/[id]` | PATCH, DELETE | Editar o archivar un servicio |
| `/api/pets/[petId]/grooming-sessions` | GET, POST | Historial y registro de sesiones |

Las APIs usan el cliente Supabase server y siguen el patrón de rutas existente (autenticación por `createClient()`, `auth_tenant_id()` via RLS).

---

## 7. Tipos TypeScript

Agregar a `lib/types/database.ts`:

```ts
grooming_service_catalog: {
  Row: { id: string; tenant_id: string; name: string; duration_minutes: number | null; active: boolean; notes: string | null; created_at: string; updated_at: string }
  Insert: { tenant_id: string; name: string; duration_minutes?: number | null; active?: boolean; notes?: string | null }
  Update: { name?: string; duration_minutes?: number | null; active?: boolean; notes?: string | null; updated_at?: string }
}
grooming_sessions: {
  Row: { id: string; tenant_id: string; pet_id: string; appointment_id: string | null; session_date: string; notes: string | null; created_by: string; created_at: string }
  Insert: { tenant_id: string; pet_id: string; appointment_id?: string | null; session_date: string; notes?: string | null; created_by: string }
  Update: Record<string, never>
}
grooming_session_services: {
  Row: { id: string; session_id: string; tenant_id: string; service_catalog_id: string | null; service_name: string; created_at: string }
  Insert: { session_id: string; tenant_id: string; service_catalog_id?: string | null; service_name: string }
  Update: Record<string, never>
}
```

Y extender el tipo de `appointments` con `appointment_type: 'consultation' | 'grooming'`.

---

## 8. Fuera de alcance (v1)

- Fotos antes/después (Supabase Storage)
- Campo de estilista responsable (`performed_by`)
- Precio / cobro
- Pantalla global "Servicios" en el menú principal del dashboard
- Sub-tabs de Estadía, Cirugía, Hospitalización en Settings › Servicios (se agregan con sus planes)

---

## Dependencias

- Ningún plan previo bloquea este plan — es independiente
- La migración de `appointment_type` en `appointments` es retrocompatible (DEFAULT `'consultation'`)
- El catálogo `grooming_service_catalog` no depende de otros catálogos

## Patrón base para Planes 9–11

Este diseño establece el patrón de "Servicios no clínicos":

```
grooming_service_catalog       → catálogo configurable (Settings › Servicios › [tab])
appointment_type               → tipo de cita en calendario existente
grooming_sessions              → registro inmutable de la sesión
grooming_session_services      → líneas del servicio (N por sesión)
Modal historial en perfil      → cartilla por mascota
```

Estadía, Cirugía y Hospitalización seguirán este patrón, extendiendo `grooming_sessions` con campos propios (rango de fechas, entradas diarias de signos, etc.).
