# Plan 8 — Estética

**Fecha:** 2026-05-31
**Estado:** Aprobado
**Alcance:** Módulo de servicios de estética integrado al sistema: sección "Servicios" en el sidebar, página dedicada de Estética, 3 puntos de entrada para registrar sesiones, historial por mascota y catálogo configurable en Settings.

---

## Contexto

La clínica puede ofrecer servicios no clínicos como baño, corte de pelo, corte de uñas, limpieza de oídos, etc. Estos servicios se registran independientemente del expediente clínico, tienen su propia página en el dashboard y quedan en el historial de la mascota.

**Decisiones de diseño:**

- Nueva sección **"Servicios"** en el sidebar principal (al lado de Citas). Dentro, sub-ítems por tipo de servicio: Estética (Plan 8), y a futuro Estadía, Cirugía, Hospitalización (Planes 9–11).
- **Página dedicada por servicio** (`/dashboard/servicios/estetica`): lista de sesiones con acceso a crear nuevas.
- **3 puntos de entrada** para registrar una sesión: desde la página de Servicios (walk-in), desde el perfil de la mascota, y al completar una cita de estética.
- Las citas de estética se agendan en el **calendario existente** (nuevo tipo de cita), sin duplicar la lógica de agenda.
- **Catálogo de servicios** en Settings › Servicios (nueva sección separada de Catálogos clínicos). Los sub-tabs de Estadía/Cirugía/Hospitalización se agregarán cuando lleguen sus planes.
- **Sin precio en v1** — cobro fuera del sistema.
- **Sin fotos ni campo de estilista en v1** — anotados para versión futura.

---

## 1. Modelo de Datos

### 1.1 Nueva tabla `grooming_service_catalog`

Catálogo de servicios de estética configurables por tenant. Mismo patrón que `vaccine_catalog`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | RLS tenant-scoped |
| `name` | TEXT NOT NULL | ej. "Baño", "Corte de pelo", "Corte de uñas" |
| `duration_minutes` | INTEGER NULLABLE | duración estimada — opcional |
| `active` | BOOLEAN DEFAULT true | archivar sin borrar |
| `notes` | TEXT NULLABLE | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** SELECT / INSERT / UPDATE restringidos a `tenant_id = auth_tenant_id()`.

### 1.2 Migración en tabla `appointments`

```sql
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'consultation'
  CHECK (appointment_type IN ('consultation', 'grooming'));
```

Las citas existentes quedan como `'consultation'` automáticamente. Retrocompatible.

### 1.3 Nueva tabla `grooming_sessions`

Registro de una sesión de estética realizada. **Inmutable tras guardar** (como `medical_records`).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | RLS |
| `pet_id` | UUID FK → pets | |
| `appointment_id` | UUID FK NULLABLE → appointments ON DELETE SET NULL | null si es walk-in o manual |
| `session_date` | DATE NOT NULL | fecha de la sesión |
| `notes` | TEXT NULLABLE | observaciones libres |
| `created_by` | UUID FK → user_profiles | quién registró |
| `created_at` | TIMESTAMPTZ | |

**RLS:** SELECT `tenant_id = auth_tenant_id()` · INSERT `tenant_id = auth_tenant_id()` · Sin UPDATE.

### 1.4 Nueva tabla `grooming_session_services`

Servicios realizados dentro de una sesión (N por sesión).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `session_id` | UUID FK → grooming_sessions ON DELETE CASCADE | |
| `tenant_id` | UUID FK → tenants | para RLS directo |
| `service_catalog_id` | UUID FK NULLABLE → grooming_service_catalog ON DELETE SET NULL | null si texto libre |
| `service_name` | TEXT NOT NULL | desnormalizado al registrar |
| `created_at` | TIMESTAMPTZ | |

**RLS:** SELECT / INSERT restringidos a `tenant_id = auth_tenant_id()`.

---

## 2. Sidebar — Sección "Servicios"

Nueva entrada en `components/dashboard/SidebarNav.tsx`.

**Estructura del sidebar actualizada:**

```
Inicio
Dueños
Mascotas
Citas
Servicios          ← nueva sección con sub-ítems colapsables
  └ Estética       ← Plan 8
  └ Estadía        ← Plan 9 (a futuro)
  └ Cirugía        ← Plan 10 (a futuro)
  └ Hospitalización ← Plan 11 (a futuro)

— Administración —
Configuración
```

**Implementación:** El ítem "Servicios" actúa como grupo con sub-ítems. Se expande cuando el pathname empieza con `/dashboard/servicios`. En v1 solo existe el sub-ítem "Estética". Los demás se agregan con sus planes.

Icono del grupo: `Wrench` o `Sparkles` de lucide-react. Icono de Estética: `Scissors`.

---

## 3. Página de Estética `/dashboard/servicios/estetica`

Página principal del servicio. Muestra el historial de sesiones de la clínica y permite iniciar nuevas.

### 3.1 Layout de la página

```
[Overline: Servicios]
[H1: Estética]

[Botón primario: + Nueva sesión]        [Filtros: fecha, mascota]

[Tabla / lista de sesiones recientes]
  ─ Fecha · Mascota · Dueño · Servicios realizados · Notas · Acciones
  ─ ...
  ─ [Paginación]
```

**Columnas de la tabla:**
- Fecha de sesión
- Mascota (nombre + especie)
- Dueño
- Servicios realizados (chips)
- Notas (truncadas)
- Link al perfil de la mascota

Las sesiones se ordenan por `session_date DESC`. Paginación simple (20 por página).

### 3.2 Botón "Nueva sesión" — flujo walk-in

Abre un modal de búsqueda de mascota (igual que el flujo walk-in de consultas: buscar por nombre de mascota o dueño dentro del tenant). Al seleccionar la mascota, abre el **Modal de registro de sesión** (sección 5).

---

## 4. Calendario — Citas de Estética

### 4.1 Selector de tipo en `NewAppointmentModal`

Selector al inicio del modal:

```
Tipo de cita:  ○ Consulta   ● Estética
```

Default: Consulta. Si el usuario elige Estética, el campo "Motivo" se reemplaza por un multi-select opcional de servicios del catálogo `grooming_service_catalog`. Los servicios seleccionados se guardan en el campo `reason` de `appointments` como texto plano (ej. `"Baño, Corte de pelo"`).

### 4.2 Diferenciación visual en el calendario

Las citas de tipo `grooming` se muestran con color distinto (acento secundario, p. ej. teal más oscuro o violeta) e ícono de tijeras para distinguirlas de las consultas.

### 4.3 Al completar una cita de estética

Cuando una cita `grooming` pasa a `completed`, aparece un banner/prompt:

> "¿Deseas registrar la sesión de estética?"  [Registrar] [Omitir]

Clic en "Registrar" abre el **Modal de registro de sesión** con la mascota pre-seleccionada y `appointment_id` enlazado.

---

## 5. Modal de Registro de Sesión

Único modal reutilizado desde los 3 puntos de entrada:

| Punto de entrada | Mascota pre-seleccionada | `appointment_id` |
|-----------------|--------------------------|-------------------|
| Página Servicios (walk-in) | No — buscar primero | null |
| Perfil de mascota | Sí | null |
| Completar cita | Sí | ID de la cita |

**Campos del modal:**

- `pet` — mascota (pre-seleccionada o buscable). Muestra nombre + foto/avatar.
- `session_date` — fecha, default hoy. Usa `DateInput` existente.
- `services` — multi-select + texto libre (combobox con opciones del catálogo). **Mínimo 1 servicio requerido.**
- `notes` — textarea opcional.

**Al guardar:**

1. INSERT en `grooming_sessions` (con o sin `appointment_id`)
2. INSERT en `grooming_session_services` por cada servicio (desnormalizando `service_name`)
3. Registro inmutable — sin edición posterior
4. Muestra confirmación y cierra el modal

---

## 6. Perfil de Mascota — Cartilla de Estética

Nueva sección **"Estética"** en el hero de `app/dashboard/pets/[petId]/page.tsx`. Mismo patrón que Vacunas/Desparasitaciones: botón que abre un modal con el historial.

**Modal "Estética" (historial):**

| Columna | Contenido |
|---------|-----------|
| Fecha | `session_date` formateada |
| Servicios | Chips con cada servicio |
| Notas | Texto (truncado si largo) |
| Clínica | Nombre del tenant |

- Ordenado por `session_date DESC`
- Botón **"Registrar sesión"** dentro del modal → abre el Modal de Registro con la mascota pre-seleccionada

---

## 7. Settings › Servicios (catálogo)

### 7.1 Nueva sección en la nav de Settings

Agregar **"Servicios"** al array `SECTIONS` en `components/settings/SettingsNav.tsx`, después de "Catálogos":

```ts
{ href: '/dashboard/settings/servicios', icon: Scissors, label: 'Servicios' }
```

### 7.2 Página `settings/servicios/page.tsx`

Tabs internas. En v1 solo existe el tab **"Estética"**. Misma estructura que `settings/catalogos/page.tsx`.

```
Settings › Servicios
  Tab: Estética   ← Plan 8 (v1)
  Tab: Estadía    ← Plan 9 (a futuro)
  ...
```

### 7.3 Tab Estética — CRUD del catálogo

Componente `GroomingServiceCatalogTab`. Patrón idéntico a `VaccineCatalogTab`.

**Lista:** Nombre | Duración (`X min` o `—`) | Estado

**Formulario (modal):** `name` (requerido) · `duration_minutes` (opcional) · `notes` (opcional)

**Acciones por fila:** Editar | Archivar (toggle `active`)

---

## 8. APIs

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/settings/grooming-catalog` | GET, POST | Listar y crear servicios del catálogo |
| `/api/settings/grooming-catalog/[id]` | PATCH | Editar o archivar un servicio |
| `/api/servicios/estetica` | GET | Listar sesiones del tenant (con filtros, paginación) |
| `/api/servicios/estetica` | POST | Crear nueva sesión + líneas de servicio |
| `/api/pets/[petId]/grooming-sessions` | GET | Historial de sesiones de una mascota |

Todas usan el cliente Supabase server + RLS. Siguen el patrón de rutas existente.

---

## 9. Tipos TypeScript

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

Extender `appointments`:
```ts
appointment_type: 'consultation' | 'grooming'
```

---

## 10. Rutas de archivos a crear / modificar

**Nuevos:**
- `app/dashboard/servicios/estetica/page.tsx` — página principal Estética
- `app/dashboard/settings/servicios/page.tsx` — Settings › Servicios
- `app/api/servicios/estetica/route.ts`
- `app/api/settings/grooming-catalog/route.ts`
- `app/api/settings/grooming-catalog/[id]/route.ts`
- `app/api/pets/[petId]/grooming-sessions/route.ts`
- `components/servicios/GroomingSessionModal.tsx` — modal de registro (reutilizable desde 3 puntos)
- `components/servicios/GroomingHistoryModal.tsx` — modal historial en perfil
- `components/servicios/GroomingSessionsTable.tsx` — tabla en página Estética
- `components/settings/GroomingServiceCatalogTab.tsx`
- `supabase/migrations/YYYYMMDD_plan8_estetica.sql`

**Modificados:**
- `components/dashboard/SidebarNav.tsx` — agregar sección Servicios con sub-ítems
- `components/settings/SettingsNav.tsx` — agregar tab Servicios
- `app/dashboard/appointments/` — selector tipo + diferenciación visual + prompt al completar
- `app/dashboard/pets/[petId]/page.tsx` — sección Estética en hero
- `lib/types/database.ts` — nuevos tipos

---

## 11. Fuera de alcance (v1)

- Fotos antes/después
- Campo de estilista responsable (`performed_by`)
- Precio / cobro / facturación
- Sub-tabs de Estadía, Cirugía, Hospitalización (se agregan con sus planes)
- Notificaciones WhatsApp para citas de estética

---

## Patrón base para Planes 9–11

```
[servicio]_service_catalog     → catálogo en Settings › Servicios › [tab]
appointment_type               → tipo de cita en calendario existente
[servicio]_sessions            → registro inmutable de sesión
[servicio]_session_[items]     → líneas/detalles del servicio
Página /servicios/[servicio]   → listado global con walk-in
Modal en perfil mascota        → cartilla por mascota
```

Estadía extiende esto con rango de fechas (`check_in`, `check_out`) y tarifa diaria. Cirugía y Hospitalización agregan campos clínicos (consentimiento, signos vitales, etc.).
