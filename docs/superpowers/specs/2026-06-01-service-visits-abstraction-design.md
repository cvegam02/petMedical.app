# Diseño — Abstracción de Servicios Clínicos (`service_visits`)

**Fecha:** 2026-06-01
**Estado:** Aprobado
**Contexto:** Rediseño arquitectónico previo al Plan 9 (Estadía). Reemplaza el modelo de módulos aislados por una abstracción central que soporta los 5 servicios del sistema.

---

## Problema que resuelve

El Plan 8 (Estética) creó tablas aisladas (`grooming_sessions`, `grooming_session_services`) sin abstracción común. Si los planes 9-11 siguen el mismo patrón, el sistema tendrá 5 módulos completamente desconectados. El `AppointmentDetailDialog` ya tiene `if (isGrooming)` rígido — con 4 servicios más se vuelve inmanejable. `appointments.appointment_type` usa un TEXT CHECK que requiere migraciones bloqueantes por cada servicio nuevo.

---

## Los 5 servicios

| Servicio | Creado desde | Aparece en calendario |
|---|---|---|
| Consulta Médica | Cita o walk-in | ✅ Como slot de hora |
| Estética | Cita | ✅ Como slot de hora |
| Cirugía | Programación o desde cierre de consulta | ✅ Como slot de hora |
| Hospitalización | Cierre de cirugía o admisión directa | ✅ Como bloque multi-día |
| Estadía | Cita o directamente | ✅ Como bloque multi-día |

**Dos vistas del calendario:**
- **Citas del día** — slots puntuales de hora (Consulta, Estética, Cirugía)
- **Servicios activos** — bloques multi-día en curso (Hospitalización, Estadía)

---

## Modelo de datos

### Tabla central: `service_visits`

```sql
CREATE TYPE service_type AS ENUM (
  'consultation', 'grooming', 'surgery', 'hospitalization', 'boarding'
);

CREATE TYPE visit_status AS ENUM (
  'scheduled', 'in_progress', 'completed', 'cancelled'
);

CREATE TABLE service_visits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id       UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  owner_id     UUID NOT NULL REFERENCES owners(id),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  service_type service_type NOT NULL,
  status       visit_status NOT NULL DEFAULT 'scheduled',
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notas:**
- `appointment_id` es nullable — un servicio puede nacer sin cita previa (walk-in, urgencias, derivaciones)
- No hay `parent_visit_id` en esta tabla — las relaciones entre servicios viven en las tablas de extensión con FKs semánticos
- `service_type` es un Postgres enum — extensible con `ALTER TYPE service_type ADD VALUE` sin lock de tabla

---

### Tablas de extensión (1:1 con `service_visits`)

#### `consultation_records`
*(migración de `medical_records`)*

```sql
CREATE TABLE consultation_records (
  visit_id         UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  attended_by      UUID REFERENCES user_profiles(id),
  reason           TEXT NOT NULL,
  diagnosis        TEXT,
  treatment        TEXT,
  notes            TEXT,
  weight_kg        NUMERIC,
  temperature_celsius NUMERIC,
  follow_up_for_visit_id UUID REFERENCES service_visits(id)  -- si es seguimiento
);
-- Relaciones existentes se mantienen apuntando a consultation_records:
-- prescriptions, attachments, addendums, pet_vaccinations, pet_dewormings
```

> `follow_up_for_visit_id` nullable — apunta a la cirugía u hospitalización de la que es seguimiento.
> Campos removidos respecto al modelo actual: `heart_rate_bpm`, `respiratory_rate_bpm` (no se usan en la práctica clínica veterinaria local).

---

#### `grooming_records`
*(migración de `grooming_sessions`)*

```sql
CREATE TABLE grooming_records (
  visit_id UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  notes    TEXT
);

CREATE TABLE grooming_record_services (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id          UUID NOT NULL REFERENCES grooming_records(id) ON DELETE CASCADE,
  service_catalog_id UUID REFERENCES grooming_service_catalog(id) ON DELETE SET NULL,
  service_name       TEXT NOT NULL  -- desnormalizado al momento de registrar
);
```

---

#### `surgery_records`

```sql
CREATE TABLE surgery_records (
  visit_id              UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  surgery_type          TEXT NOT NULL,
  surgeon_id            UUID REFERENCES user_profiles(id),
  location              TEXT,                -- dónde se realizará
  materials_needed      TEXT,                -- qué se necesita
  pre_op_instructions   TEXT,
  post_op_instructions  TEXT,
  anesthesia_notes      TEXT,
  notes                 TEXT,
  origin_visit_id       UUID REFERENCES service_visits(id)  -- consulta que derivó en esta cirugía (nullable)
);
```

> `origin_visit_id` nullable — una cirugía puede programarse directamente sin consulta previa.

---

#### `hospitalization_records`

```sql
CREATE TABLE hospitalization_records (
  visit_id         UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  admission_reason TEXT NOT NULL,
  care_plan        TEXT,
  attending_vet_id UUID REFERENCES user_profiles(id),
  notes            TEXT,
  origin_visit_id  UUID REFERENCES service_visits(id)  -- cirugía que derivó (nullable)
);

CREATE TABLE hospitalization_log_entries (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES hospitalization_records(visit_id) ON DELETE CASCADE,
  logged_by UUID NOT NULL REFERENCES user_profiles(id),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry     TEXT NOT NULL   -- qué se hizo: suero, alimentación, observaciones, etc.
);
```

> `origin_visit_id` nullable — la hospitalización puede venir de una cirugía o ser admisión directa por razones médicas.

---

#### `boarding_records`

```sql
CREATE TABLE boarding_records (
  visit_id           UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  planned_check_in   DATE NOT NULL,
  planned_check_out  DATE NOT NULL,
  food_included      BOOLEAN NOT NULL DEFAULT false,
  food_instructions  TEXT,
  notes              TEXT
);

CREATE TABLE boarding_daily_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id  UUID NOT NULL REFERENCES boarding_records(visit_id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  logged_by  UUID NOT NULL REFERENCES user_profiles(id),
  notes      TEXT NOT NULL,
  incidents  TEXT   -- null si no hubo incidentes
);
```

---

### Relaciones entre servicios

Las relaciones se expresan con FKs semánticos en las tablas de extensión, no con un genérico `parent_visit_id` en `service_visits`:

| Relación | Dónde vive | Campo |
|---|---|---|
| Consulta → Cirugía (derivación) | `surgery_records` | `origin_visit_id` |
| Cirugía → Hospitalización | `hospitalization_records` | `origin_visit_id` |
| Cirugía/Hospitalización → Consulta (seguimiento) | `consultation_records` | `follow_up_for_visit_id` |

Estos FKs son **siempre nullable** — ningún servicio *requiere* venir de otro. Son opcionales y se llenan automáticamente por el flujo de UI, no por el usuario.

---

### Appointments

```sql
-- Reemplazar el CHECK constraint actual por el enum
ALTER TABLE appointments
  DROP COLUMN appointment_type,
  ADD COLUMN service_type service_type NOT NULL DEFAULT 'consultation';
```

La relación es **unidireccional**: solo `service_visits` conoce al appointment, no al revés.

```sql
-- Para saber si una cita ya generó un servicio:
SELECT * FROM service_visits WHERE appointment_id = 'APT-001';
```

---

### Compartir con el dueño

No hay página web para el dueño. El staff genera y entrega el documento directamente.

**Canales disponibles:**

| Canal | Servicios |
|---|---|
| WhatsApp | Todos (requiere integración) |
| Email | Todos |
| PDF descargable | Todos |
| Imprimir | Solo Consulta Médica |

**Registro de entregas:**

```sql
CREATE TABLE service_visit_deliveries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     UUID NOT NULL REFERENCES service_visits(id),
  channel      TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'pdf', 'print')),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_by UUID NOT NULL REFERENCES user_profiles(id)
);
```

---

## Migración de tablas existentes

| Tabla actual | Acción | Tabla nueva |
|---|---|---|
| `medical_records` | Migrar a nueva estructura | `consultation_records` |
| `grooming_sessions` | Migrar a nueva estructura | `grooming_records` |
| `grooming_session_services` | Migrar | `grooming_record_services` |
| `share_tokens` | Reemplazar por | `service_visit_deliveries` |
| `appointments.appointment_type TEXT CHECK(...)` | Reemplazar por | `appointments.service_type` (enum) |

Las tablas relacionadas de consulta (`prescriptions`, `attachments`, `addendums`, `pet_vaccinations`, `pet_dewormings`) mantienen su estructura — solo su FK cambia de `medical_records` a `consultation_records`.

> **Dado que el sistema está en desarrollo sin datos de producción**, la migración se realiza con DROP + recreación limpia, no con scripts de transformación de datos.

---

## Impacto en componentes de UI

### `AppointmentDetailDialog` — de if/else a panel pattern

```tsx
// HOY — crece con cada servicio nuevo:
if (isGrooming) { /* UI estética */ }
else { /* UI consulta */ }

// NUEVO — agregar un servicio = agregar una línea:
const PANELS = {
  consultation:    ConsultationPanel,
  grooming:        GroomingPanel,
  surgery:         SurgeryPanel,
  hospitalization: HospitalizationPanel,
  boarding:        BoardingPanel,
}
const Panel = PANELS[visit.service_type]
return <Panel visitId={visit.id} />
```

Cada panel vive en su propio archivo. Cambiar la UI de Cirugía no implica tocar el código de Consulta.

### `NewAppointmentModal` — service type primero

1. El usuario elige el tipo de servicio
2. El formulario adapta sus campos al tipo elegido
3. Los campos comunes (fecha, hora, paciente) siempre aparecen
4. Los campos específicos (materiales para cirugía, fechas para estadía) aparecen solo para el tipo correspondiente

### Hospitalización — no se crea desde el calendario

Se crea desde:
- El cierre de una cirugía ("¿La mascota queda hospitalizada?")
- La página Servicios → Hospitalización (admisión directa)

Pero **sí aparece** en el calendario como bloque multi-día para visibilidad del equipo.

---

## Lo que NO cambia

- `grooming_service_catalog` — se mantiene igual
- `vaccine_catalog`, `medication_catalog` — se mantienen igual
- `pet_vaccinations`, `pet_dewormings` — se mantienen, solo cambia el FK de `medical_records` a `consultation_records`
- `prescriptions`, `attachments`, `addendums` — ídem
- RLS pattern con `auth_tenant_id()` — se replica en todas las tablas nuevas
- Lógica de walk-in — sigue igual, solo el destino es `service_visits` en vez de directamente a `medical_records`
