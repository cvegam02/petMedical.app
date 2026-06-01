# Auditoría de Arquitectura — petMedical.app

**Fecha:** 2026-06-01
**Alcance:** Plan 8 recién implementado + revisión del estado general antes de Plan 9

---

## Resumen ejecutivo

El código funciona hoy, pero **la ausencia de una abstracción para "servicios clínicos" es el problema más grave**. Si Plan 9 (Estadía) se implementa con el mismo patrón que Plan 8 (Estética), el sistema tendrá 3 módulos completamente desconectados que comparten `appointments` pero sin modelo de datos común. La deuda de `(supabase as any)` y el boilerplate de auth son problemas reales pero mecánicos — se resuelven en un sprint. La falta de abstracción de servicios requiere una **decisión de diseño antes de escribir una línea del Plan 9**.

---

## 1. Problemas Críticos (bloquean planes futuros)

### 1.1 Sin abstracción de "servicio prestado" — cada módulo será una isla

El Plan 8 creó `grooming_service_catalog`, `grooming_sessions`, `grooming_session_services` como entidades aisladas. Los planes 9-11 van a repetir el patrón:

- `stay_service_catalog`, `stay_sessions`, `stay_session_services`
- `surgery_service_catalog`, `surgery_sessions`, `surgery_session_services`
- etc.

No hay una entidad abstracta de "servicio prestado a una mascota". Esto ya es visible en `appointments.appointment_type` como `TEXT CHECK IN ('consultation', 'grooming')` — cada nuevo módulo requiere alterar ese constraint. El `AppointmentDetailDialog.tsx` ya tiene bloques `if (isGrooming)` / `else` rígidos. Con 3 módulos más se convierte en un árbol de `if/else` inmanejable.

**Corrección necesaria antes de Plan 9:** Diseñar una abstracción `ServiceVisit` con `service_type` como discriminador. Esto debe decidirse antes de escribir cualquier código del Plan 9.

### 1.2 `appointment_type` como TEXT con CHECK — requiere migración bloqueante por cada módulo nuevo

```sql
CHECK (appointment_type IN ('consultation', 'grooming'))
```

Cada módulo nuevo requiere `ALTER TABLE appointments DROP CONSTRAINT ... ADD CONSTRAINT ...` — con lock en producción. En PG 12+ un `ALTER TYPE ... ADD VALUE` en un enum es non-blocking, o bien una tabla de referencia es más extensible.

### 1.3 `grooming_sessions` no tiene protección real de inmutabilidad

Solo existen políticas de `SELECT` e `INSERT`. El endpoint PATCH permite `{ ended_at: null }` — un usuario puede "des-completar" una sesión ya finalizada. El comentario `-- immutable after insert` en la migración no está reforzado por la base de datos.

**Corrección:**
```sql
CREATE POLICY "no_delete_grooming_sessions" ON grooming_sessions
  FOR DELETE USING (false);
```
Y validar en el PATCH que si `ended_at` ya existe, rechazar con 409.

### 1.4 Creación de sesión + servicios no es atómica

El flujo en `app/api/servicios/estetica/route.ts` hace INSERT en `grooming_sessions` y luego INSERT en `grooming_session_services`. Si el segundo falla, hay un DELETE manual de cleanup. Si ese DELETE también falla, queda una sesión huérfana sin servicios en la BD.

**Corrección:** Una función RPC de Postgres que ejecute ambas inserts en una transaction real.

---

## 2. Acoplamiento Problemático

### 2.1 `AppointmentDetailDialog` hace demasiado (399 líneas)

- Fetch propio de sesión de grooming
- Lógica de start/conclude session
- Renderizado condicional consulta vs grooming
- Llama a 3 endpoints distintos

Con 3 módulos más, este componente se vuelve inmanejable.

**Corrección:** Extraer `GroomingSessionPanel` que recibe `appointmentId` y maneja su estado. El dialog solo orquesta qué panel mostrar basado en `appointment_type`.

### 2.2 `NewAppointmentModal` tiene 15+ estados y 3 refs de control de flujo

Los refs `skipOwnerSearchRef`, `skipPetFetchRef`, `preloadedRef` son señal de que el componente está resolviendo demasiados casos de carrera internamente. No escala con más modos de apertura.

### 2.3 `GroomingSessionsTable` embebe un Dialog de finalización

Mezcla responsabilidades de listado y edición. Se va a repetir en Estadía y Hospitalización.

---

## 3. Patrones Inconsistentes

### 3.1 Dos URL schemas para el mismo dominio

- `/api/servicios/estetica` — sesiones de grooming
- `/api/catalog/grooming-services` — catálogo de grooming
- `/api/catalog/vaccines` — catálogo de vacunas
- `/api/medical-records` — consultas (no tiene `/api/servicios/medico`)

No hay convención establecida. Los planes 9-11 van a fragmentar esto más.

**Corrección:** Definir la convención ahora. Propuesta: `/api/services/{type}/sessions` y `/api/catalog/{type}`.

### 3.2 `(supabase as any)` en 35 ocurrencias — type system bypasseado sistemáticamente

El cliente de Supabase no está tipado con el genérico `<Database>` en su creación. Todos los beneficios de TypeScript para queries se pierden.

**Corrección:**
```typescript
// lib/supabase/server.ts y client.ts
createServerClient<Database>(url, key, ...)
```

### 3.3 Validación de roles duplicada (app + RLS) sin contrato claro

Algunas routes validan rol a nivel de aplicación Y tienen RLS con `auth_role() = 'admin'`. Otras solo tienen una capa. No hay un contrato explícito de cuál es la fuente de verdad.

### 3.4 El pet search en `GroomingSessionModal` no filtra por tenant

El modal puede mostrar mascotas de otras clínicas al staff. El endpoint `/api/pets?q=...` devuelve mascotas de todos los tenants donde la mascota tiene una registration, no solo la del tenant actual.

---

## 4. Deuda Técnica Acumulada

### 4.1 El boilerplate de auth (8-10 líneas) se repite en ~15 routes

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
if (!(profile as any)?.tenant_id) return NextResponse.json(...)
```

Si cambia la lógica, hay que editar 15 archivos.

**Corrección:** `lib/auth/session.ts` con `requireTenantAuth()`.

### 4.2 Sin transacciones reales en ninguna operación multi-tabla

Identificado en `medical-records/route.ts` (con comentario "no transaction — MVP"), `servicios/estetica/route.ts` (cleanup manual), y toda la inserción de vacunaciones. Se va a repetir en los planes 9-11.

---

## 5. Lo que está bien

- **Aislamiento de historial clínico** — Las RLS sobre `medical_records`, `prescriptions`, `pet_vaccinations`, `pet_dewormings` son correctas y rigurosas.
- **`auth_tenant_id()` y `auth_role()` como funciones SECURITY DEFINER** — El patrón correcto para RLS en Supabase.
- **Soft-delete en catálogos** (`active: false`) — Preserva integridad histórica.
- **Detección de conflictos de citas con override** — UX correcta para el dominio.
- **`groomingSessionSchema` con `service_name` y `service_catalog_id` opcional** — Permite servicios ad-hoc y del catálogo con trazabilidad.

---

## 6. Recomendaciones Priorizadas

### Urgente (antes de Plan 9)

| # | Qué | Impacto |
|---|-----|---------|
| R1 | Diseñar abstracción `ServiceVisit` antes de codificar Estadía | Evita reescribir 4 módulos |
| R2 | Crear `lib/auth/session.ts` con `requireTenantAuth()` | Elimina 15 duplicados |
| R3 | Tipar el cliente Supabase con `<Database>` | Elimina 35 casts `as any` |

### Importante (próximo sprint)

| # | Qué | Impacto |
|---|-----|---------|
| R4 | Pet search en `GroomingSessionModal` filtrado por tenant | Corrección de seguridad |
| R5 | Constraint DB e invariante en PATCH para `ended_at` inmutable | Integridad de datos |
| R6 | Extraer `GroomingSessionPanel` de `AppointmentDetailDialog` | Preparar para planes 9-11 |
| R7 | Definir y documentar convención de URL de API | Evitar más fragmentación |

### Deuda a atacar cuando haya tiempo

| # | Qué |
|---|-----|
| R8 | RPCs de Postgres para operaciones multi-tabla (empezar con `create_grooming_session`) |
| R9 | Auditar datos de `owners` sin `tenant_id` si hubo datos pre-migración |
