# Abstracción service_visits — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modelo de servicios aislados por una abstracción central `service_visits`, migrando los dos servicios existentes (Consulta y Estética) a la nueva arquitectura sin perder datos.

**Architecture:** Una tabla `service_visits` es el padre de toda visita clínica. Cada servicio tiene una tabla de extensión 1:1 (`consultation_records`, `grooming_records`). `appointments.appointment_type` (TEXT CHECK) se convierte en `service_type` (enum Postgres extensible). La UI pasa de `if/else` por tipo a un patrón de paneles registrados por `service_type`.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS, enums nativos), TypeScript. Migraciones se aplican vía el MCP de Supabase (`apply_migration`, project_id `qgruuhrgwgjduzlctdlx`) Y se guardan como archivo en `supabase/migrations/`.

**Spec:** `docs/superpowers/specs/2026-06-01-service-visits-abstraction-design.md`

**Alcance:** Fundación + migración de Consulta y Estética. Cirugía, Hospitalización y Estadía NO se construyen aquí — son los planes 9-11 sobre esta base. El enum `service_type` sí incluye los 5 valores desde ahora para evitar `ALTER TYPE` futuro.

**Sin tests:** Por preferencia del proyecto. Verificación con `npx tsc --noEmit`, `npm run build` cuando aplique, y smoke manual.

---

## Notas de ejecución

- **Migraciones:** cada migración se aplica con el MCP `mcp__plugin_supabase_supabase__apply_migration` (project_id `qgruuhrgwgjduzlctdlx`) y ADEMÁS se guarda el SQL en el archivo indicado para que el repo quede como fuente de verdad.
- **Preservación de datos:** La estrategia reutiliza el `id` de los registros existentes como `service_visits.id`, así los hijos (prescriptions, attachments, etc.) conservan su FK. No se pierden datos del tenant demo.
- **`(supabase as any)`:** se mantiene el patrón existente en este plan (tiparlo es el refactor R3 separado del audit, no entra aquí).
- **Directorio de trabajo:** `/home/cvega/Documentos/Projects/VeterinaIAs/veterinaias`

---

## File Map

**Migraciones nuevas (`supabase/migrations/`):**
- `20260601000001_service_visits_foundation.sql` — enums, `service_visits`, `service_visit_deliveries`, RLS
- `20260601000002_migrate_consultations.sql` — `consultation_records` desde `medical_records`, repunta hijos
- `20260601000003_migrate_grooming.sql` — `grooming_records` + `grooming_record_services` desde tablas grooming
- `20260601000004_appointments_service_type.sql` — `appointment_type` → `service_type` enum

**Tipos:**
- `lib/types/database.ts` — modificar

**API routes a modificar:**
- `app/api/medical-records/route.ts`, `app/api/medical-records/[id]/route.ts`
- `app/api/medical-records/[id]/addendums/route.ts`
- `app/api/medical-records/[id]/prescription/pdf/route.ts`
- `app/api/consultations/walk-in/route.ts`
- `app/api/historiales/[petId]/pdf/route.ts`
- `app/api/servicios/estetica/route.ts`, `app/api/servicios/estetica/[id]/route.ts`
- `app/api/pets/[id]/grooming-sessions/route.ts`
- `app/api/appointments/route.ts`, `app/api/appointments/first-visit/route.ts`, `app/api/appointments/[id]/route.ts`

**Componentes a modificar:**
- `components/appointments/NewAppointmentModal.tsx`
- `components/appointments/AppointmentDetailDialog.tsx`
- `components/servicios/GroomingSessionModal.tsx`, `GroomingSessionsTable.tsx`, `GroomingHistoryModal.tsx`
- `app/dashboard/pets/[petId]/page.tsx` y páginas de records

**Componentes nuevos (panel pattern):**
- `components/appointments/panels/ConsultationPanel.tsx`
- `components/appointments/panels/GroomingPanel.tsx`
- `components/appointments/panels/index.ts` (registro)

---

# FASE 0 — Fundación

## Task 1: Migración de fundación (enums + service_visits + deliveries)

**Files:**
- Create: `supabase/migrations/20260601000001_service_visits_foundation.sql`

- [ ] **Step 1: Escribir el SQL de fundación**

```sql
-- 20260601000001_service_visits_foundation.sql

-- Enums centrales
CREATE TYPE service_type AS ENUM (
  'consultation', 'grooming', 'surgery', 'hospitalization', 'boarding'
);

CREATE TYPE visit_status AS ENUM (
  'scheduled', 'in_progress', 'completed', 'cancelled'
);

-- Tabla central de visitas de servicio
CREATE TABLE service_visits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id         UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  owner_id       UUID NOT NULL REFERENCES owners(id),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  service_type   service_type NOT NULL,
  status         visit_status NOT NULL DEFAULT 'scheduled',
  started_at     TIMESTAMPTZ,
  ended_at       TIMESTAMPTZ,
  created_by     UUID NOT NULL REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX service_visits_tenant_id_idx   ON service_visits(tenant_id);
CREATE INDEX service_visits_pet_id_idx       ON service_visits(pet_id);
CREATE INDEX service_visits_appointment_id_idx ON service_visits(appointment_id);
CREATE INDEX service_visits_status_idx        ON service_visits(tenant_id, status);

CREATE TRIGGER service_visits_updated_at
  BEFORE UPDATE ON service_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE service_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_service_visits" ON service_visits
  FOR SELECT USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_insert_service_visits" ON service_visits
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_update_service_visits" ON service_visits
  FOR UPDATE USING (tenant_id = auth_tenant_id());

-- Registro de entregas al dueño (whatsapp / email / pdf / print)
CREATE TABLE service_visit_deliveries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     UUID NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'pdf', 'print')),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_by UUID NOT NULL REFERENCES user_profiles(id)
);

CREATE INDEX service_visit_deliveries_visit_id_idx ON service_visit_deliveries(visit_id);

ALTER TABLE service_visit_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_deliveries" ON service_visit_deliveries
  FOR SELECT USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_insert_deliveries" ON service_visit_deliveries
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
```

- [ ] **Step 2: Aplicar la migración**

Usar el MCP `mcp__plugin_supabase_supabase__apply_migration` con:
- `project_id`: `qgruuhrgwgjduzlctdlx`
- `name`: `service_visits_foundation`
- `query`: el SQL completo de arriba

Expected: `{"success":true}`

- [ ] **Step 3: Verificar que las tablas existen**

Usar el MCP `mcp__plugin_supabase_supabase__list_tables` (project_id `qgruuhrgwgjduzlctdlx`) y confirmar que aparecen `service_visits` y `service_visit_deliveries`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601000001_service_visits_foundation.sql
git commit -m "feat: service_visits — fundación (enums, tablas centrales, RLS)"
```

---

## Task 2: Tipos TypeScript de la fundación

**Files:**
- Modify: `lib/types/database.ts`

- [ ] **Step 1: Agregar enums y tipos al inicio del archivo**

Después de `export type AppointmentType = ...` (línea ~5), agregar:

```typescript
export type ServiceType = 'consultation' | 'grooming' | 'surgery' | 'hospitalization' | 'boarding'
export type VisitStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface ServiceVisit {
  id: string
  tenant_id: string
  pet_id: string
  owner_id: string
  appointment_id: string | null
  service_type: ServiceType
  status: VisitStatus
  started_at: string | null
  ended_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ServiceVisitDelivery {
  id: string
  visit_id: string
  tenant_id: string
  channel: 'whatsapp' | 'email' | 'pdf' | 'print'
  delivered_at: string
  delivered_by: string
}
```

- [ ] **Step 2: Agregar las tablas al bloque `Database['public']['Tables']`**

Después de la entrada `grooming_session_services` (que se eliminará en Fase 2, por ahora coexiste), agregar:

```typescript
      service_visits: {
        Row: { id: string; tenant_id: string; pet_id: string; owner_id: string; appointment_id: string | null; service_type: ServiceType; status: VisitStatus; started_at: string | null; ended_at: string | null; created_by: string; created_at: string; updated_at: string }
        Insert: { tenant_id: string; pet_id: string; owner_id: string; appointment_id?: string | null; service_type: ServiceType; status?: VisitStatus; started_at?: string | null; ended_at?: string | null; created_by: string }
        Update: { status?: VisitStatus; started_at?: string | null; ended_at?: string | null; updated_at?: string }
        Relationships: []
      }
      service_visit_deliveries: {
        Row: { id: string; visit_id: string; tenant_id: string; channel: 'whatsapp' | 'email' | 'pdf' | 'print'; delivered_at: string; delivered_by: string }
        Insert: { visit_id: string; tenant_id: string; channel: 'whatsapp' | 'email' | 'pdf' | 'print'; delivered_by: string }
        Update: Record<string, never>
        Relationships: []
      }
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add lib/types/database.ts
git commit -m "feat: service_visits — tipos TypeScript de la fundación"
```

---

# FASE 1 — Migración de Consulta

## Task 3: Migración consultation_records (preserva datos)

**Files:**
- Create: `supabase/migrations/20260601000002_migrate_consultations.sql`

Estrategia: crear un `service_visit` por cada `medical_record` **reutilizando el id**, luego transformar `medical_records` en `consultation_records` (mismo id como `visit_id`), repuntar hijos.

- [ ] **Step 1: Escribir el SQL de migración**

```sql
-- 20260601000002_migrate_consultations.sql

-- 1. Crear un service_visit por cada medical_record existente, reutilizando el id.
--    owner_id se resuelve desde el appointment o desde pet_registrations del tenant.
INSERT INTO service_visits (id, tenant_id, pet_id, owner_id, appointment_id, service_type, status, started_at, ended_at, created_by, created_at)
SELECT
  mr.id,
  mr.tenant_id,
  mr.pet_id,
  COALESCE(
    (SELECT a.owner_id FROM appointments a WHERE a.id = mr.appointment_id),
    (SELECT pr.owner_id FROM pet_registrations pr WHERE pr.pet_id = mr.pet_id AND pr.tenant_id = mr.tenant_id LIMIT 1)
  ),
  mr.appointment_id,
  'consultation',
  'completed',
  mr.created_at,
  mr.created_at,
  mr.created_by,
  mr.created_at
FROM medical_records mr
-- Solo migrar los que tienen owner resoluble (defensivo)
WHERE EXISTS (
  SELECT 1 FROM pet_registrations pr WHERE pr.pet_id = mr.pet_id AND pr.tenant_id = mr.tenant_id
) OR mr.appointment_id IS NOT NULL;

-- 2. Crear consultation_records con los datos clínicos, keyed por visit_id = medical_record.id
CREATE TABLE consultation_records (
  visit_id            UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  attended_by         UUID REFERENCES user_profiles(id),
  reason              TEXT NOT NULL,
  diagnosis           TEXT,
  treatment           TEXT,
  notes               TEXT,
  weight_kg           NUMERIC(5,2),
  temperature_celsius NUMERIC(4,1),
  follow_up_for_visit_id UUID REFERENCES service_visits(id)
);

INSERT INTO consultation_records (visit_id, attended_by, reason, diagnosis, treatment, notes, weight_kg, temperature_celsius)
SELECT id, attended_by, reason, diagnosis, treatment, notes, weight_kg, temperature_celsius
FROM medical_records
WHERE id IN (SELECT id FROM service_visits);  -- solo los migrados

ALTER TABLE consultation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_consultation_records" ON consultation_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_consultation_records" ON consultation_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

CREATE INDEX consultation_records_follow_up_idx ON consultation_records(follow_up_for_visit_id);

-- 3. Repuntar hijos: renombrar medical_record_id -> visit_id (apunta al mismo id, ahora en service_visits)
ALTER TABLE prescriptions   RENAME COLUMN medical_record_id TO visit_id;
ALTER TABLE attachments     RENAME COLUMN medical_record_id TO visit_id;
ALTER TABLE addendums       RENAME COLUMN medical_record_id TO visit_id;

ALTER TABLE prescriptions DROP CONSTRAINT prescriptions_medical_record_id_fkey;
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE CASCADE;
ALTER TABLE attachments DROP CONSTRAINT attachments_medical_record_id_fkey;
ALTER TABLE attachments ADD CONSTRAINT attachments_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE CASCADE;
ALTER TABLE addendums DROP CONSTRAINT addendums_medical_record_id_fkey;
ALTER TABLE addendums ADD CONSTRAINT addendums_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE CASCADE;

-- 4. Vacunaciones/desparasitaciones: medical_record_id es nullable -> renombrar a visit_id
ALTER TABLE pet_vaccinations RENAME COLUMN medical_record_id TO visit_id;
ALTER TABLE pet_dewormings   RENAME COLUMN medical_record_id TO visit_id;
ALTER TABLE pet_vaccinations DROP CONSTRAINT pet_vaccinations_medical_record_id_fkey;
ALTER TABLE pet_vaccinations ADD CONSTRAINT pet_vaccinations_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE SET NULL;
ALTER TABLE pet_dewormings DROP CONSTRAINT pet_dewormings_medical_record_id_fkey;
ALTER TABLE pet_dewormings ADD CONSTRAINT pet_dewormings_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES service_visits(id) ON DELETE SET NULL;

-- 5. Appointments: la FK a medical_records ya no aplica (service_visits.appointment_id es la relación)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_medical_record_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_origin_record_id_fkey;
ALTER TABLE appointments DROP COLUMN IF EXISTS medical_record_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS origin_record_id;

-- 6. Eliminar medical_records (sus datos ya viven en service_visits + consultation_records)
DROP TABLE medical_records CASCADE;
```

> **Nota sobre nombres de constraint:** los nombres `*_medical_record_id_fkey` son los autogenerados por Postgres. Si la migración falla porque un constraint tiene otro nombre, consultar con `mcp__...__execute_sql`: `SELECT conname FROM pg_constraint WHERE conrelid = 'prescriptions'::regclass;` y ajustar.

- [ ] **Step 2: Verificar nombres de constraint ANTES de aplicar**

Usar `mcp__plugin_supabase_supabase__execute_sql` (project_id `qgruuhrgwgjduzlctdlx`):
```sql
SELECT conrelid::regclass AS tabla, conname
FROM pg_constraint
WHERE conrelid IN ('prescriptions'::regclass,'attachments'::regclass,'addendums'::regclass,'pet_vaccinations'::regclass,'pet_dewormings'::regclass,'appointments'::regclass)
AND contype = 'f';
```
Ajustar los nombres en el SQL del Step 1 si difieren.

- [ ] **Step 3: Aplicar la migración**

MCP `apply_migration`, name `migrate_consultations`, con el SQL ya ajustado.
Expected: `{"success":true}`

- [ ] **Step 4: Verificar integridad**

`execute_sql`:
```sql
SELECT
  (SELECT count(*) FROM service_visits WHERE service_type='consultation') AS visits,
  (SELECT count(*) FROM consultation_records) AS records,
  (SELECT count(*) FROM prescriptions) AS presc;
```
Expected: `visits == records`, `presc` sin cambio respecto a antes.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601000002_migrate_consultations.sql
git commit -m "feat: migrar medical_records -> consultation_records sobre service_visits"
```

---

## Task 4: Tipos TypeScript — consultation_records

**Files:**
- Modify: `lib/types/database.ts`

- [ ] **Step 1: Reemplazar la interfaz `MedicalRecord` por `ConsultationRecord`**

Buscar `export interface MedicalRecord {` y reemplazar todo el bloque por:

```typescript
export interface ConsultationRecord {
  visit_id: string
  attended_by: string | null
  reason: string
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  weight_kg: number | null
  temperature_celsius: number | null
  follow_up_for_visit_id: string | null
}
```

- [ ] **Step 2: Actualizar `Prescription`, `Attachment`, `Addendum`**

En cada interfaz, renombrar la propiedad `medical_record_id: string` → `visit_id: string`.

- [ ] **Step 3: Actualizar `PetVaccination` y `PetDeworming`**

Renombrar `medical_record_id: string | null` → `visit_id: string | null`.

- [ ] **Step 4: Actualizar `Appointment` interface y tabla**

Quitar `medical_record_id` y `origin_record_id` de la interfaz `Appointment` y del tipo `appointments` en `Database`.

- [ ] **Step 5: Reemplazar la tabla `medical_records` en `Database['public']['Tables']`**

Eliminar la entrada `medical_records` y agregar:

```typescript
      consultation_records: {
        Row: { visit_id: string; attended_by: string | null; reason: string; diagnosis: string | null; treatment: string | null; notes: string | null; weight_kg: number | null; temperature_celsius: number | null; follow_up_for_visit_id: string | null }
        Insert: { visit_id: string; attended_by?: string | null; reason: string; diagnosis?: string | null; treatment?: string | null; notes?: string | null; weight_kg?: number | null; temperature_celsius?: number | null; follow_up_for_visit_id?: string | null }
        Update: Record<string, never>
        Relationships: []
      }
```

En las tablas `prescriptions`, `attachments`, `addendums`, `pet_vaccinations`, `pet_dewormings` del bloque `Database`, renombrar `medical_record_id` → `visit_id`.

- [ ] **Step 6: Verificar (esperamos errores en consumidores — se arreglan en tasks siguientes)**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: errores SOLO en archivos que usan `medical_records`/`MedicalRecord`/`medical_record_id` (se corrigen en Tasks 5-8). Anotar la lista.

- [ ] **Step 7: Commit**

```bash
git add lib/types/database.ts
git commit -m "refactor: tipos — MedicalRecord -> ConsultationRecord, medical_record_id -> visit_id"
```

---

## Task 5: API de consulta — crear y leer sobre service_visits

**Files:**
- Modify: `app/api/medical-records/route.ts`
- Modify: `app/api/medical-records/[id]/route.ts`

- [ ] **Step 1: Refactor POST en `medical-records/route.ts`**

El POST debe ahora crear primero un `service_visit` y luego el `consultation_records`. Reemplazar el bloque de inserción del record por:

```typescript
// Crear la visita de servicio (consulta)
const { data: visit, error: visitError } = await (supabase as any)
  .from('service_visits')
  .insert({
    tenant_id: profile.tenant_id,
    pet_id: rest.pet_id,
    owner_id: rest.owner_id,            // el POST debe recibir owner_id
    appointment_id: rest.appointment_id ?? null,
    service_type: 'consultation',
    status: 'completed',
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    created_by: user.id,
  })
  .select()
  .single()
if (visitError) return NextResponse.json({ error: 'Error al crear la visita' }, { status: 500 })

const { data: record, error: recordError } = await (supabase as any)
  .from('consultation_records')
  .insert({
    visit_id: visit.id,
    attended_by: attendedBy,
    reason: rest.reason,
    diagnosis: rest.diagnosis ?? null,
    treatment: rest.treatment ?? null,
    notes: rest.notes ?? null,
    weight_kg: weight_kg ?? null,
    temperature_celsius: temperature_celsius ?? null,
  })
  .select()
  .single()
if (recordError) {
  await (supabase as any).from('service_visits').delete().eq('id', visit.id)
  return NextResponse.json({ error: 'Error al crear el expediente' }, { status: 500 })
}

// IMPORTANTE: prescriptions/vaccinations/dewormings ahora usan visit_id = visit.id
const recordId = visit.id
```

Actualizar las inserciones de `prescriptions`, `pet_vaccinations`, `pet_dewormings` para usar `visit_id: recordId` en lugar de `medical_record_id: record.id`. Remover referencias a `heart_rate_bpm` / `respiratory_rate_bpm`.

- [ ] **Step 2: Actualizar la validación**

En `lib/validations/medical-record.ts`, quitar `heart_rate_bpm` y `respiratory_rate_bpm` del schema si existen, y asegurar que `owner_id` esté disponible (puede venir del appointment o resolverse). Verificar el schema actual primero con Read.

- [ ] **Step 3: Refactor GET/detalle en `[id]/route.ts`**

El `id` de la ruta ahora es el `visit_id`. Cambiar el `.from('medical_records')` por un join:

```typescript
const { data, error } = await (supabase as any)
  .from('service_visits')
  .select(`
    id, pet_id, owner_id, appointment_id, status, started_at, created_at,
    consultation:consultation_records(*),
    prescriptions(*),
    attachments(*),
    addendums(*)
  `)
  .eq('id', id)
  .eq('service_type', 'consultation')
  .single()
```
Mapear la respuesta para que el shape que consume el frontend siga teniendo `reason`, `diagnosis`, etc. (vienen dentro de `consultation`).

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/api/medical-records/ lib/validations/medical-record.ts
git commit -m "refactor: API consulta crea service_visit + consultation_records"
```

---

## Task 6: API walk-in

**Files:**
- Modify: `app/api/consultations/walk-in/route.ts`

- [ ] **Step 1: Leer el archivo completo**

```bash
cat app/api/consultations/walk-in/route.ts
```

- [ ] **Step 2: Refactor**

El walk-in crea pet/owner si no existen y luego un expediente. Adaptar la creación del expediente al nuevo flujo: crear `service_visit` (con `owner_id` resuelto, `appointment_id: null`, `service_type: 'consultation'`) y luego `consultation_records`, igual que en Task 5 Step 1. Actualizar prescriptions/vaccinations/dewormings a `visit_id`.

Devolver `{ petId, recordId: visit.id }` (mantener el nombre `recordId` para no romper el frontend que hace `router.push(.../records/${json.recordId})`).

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/api/consultations/walk-in/route.ts
git commit -m "refactor: walk-in crea service_visit + consultation_records"
```

---

## Task 7: Rutas dependientes — addendums, PDFs, historial

**Files:**
- Modify: `app/api/medical-records/[id]/addendums/route.ts`
- Modify: `app/api/medical-records/[id]/prescription/pdf/route.ts`
- Modify: `app/api/historiales/[petId]/pdf/route.ts`
- Modify: `app/api/appointments/route.ts`, `app/api/appointments/first-visit/route.ts`, `app/api/appointments/[id]/route.ts`

- [ ] **Step 1: addendums**

`addendums` ahora usa `visit_id`. En el POST, cambiar `medical_record_id: id` → `visit_id: id`. El `id` de la ruta es el `visit_id`.

- [ ] **Step 2: prescription PDF**

Leer el archivo. Cambiar la query que carga el expediente de `medical_records` a `service_visits` + `consultation_records` (igual patrón que Task 5 Step 3). El PDF lee `reason/diagnosis/prescriptions` — esos campos ahora vienen de `consultation` y de `prescriptions` (que sigue funcionando vía `visit_id`).

- [ ] **Step 3: historial PDF (`historiales/[petId]/pdf`)**

Leer el archivo. La query que arma el historial de la mascota debe cambiar de `medical_records` a `service_visits` filtrando `service_type='consultation'` con join a `consultation_records`. Mantener el shape del PDF.

- [ ] **Step 4: appointments routes**

Quitar cualquier referencia a `medical_record_id` / `origin_record_id` en los inserts/selects de appointments (esas columnas ya no existen). Verificar los 3 archivos con grep:
```bash
grep -rn "medical_record_id\|origin_record_id" app/api/appointments/
```
Eliminar/ajustar lo que aparezca.

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add app/api/
git commit -m "refactor: addendums, PDFs e historial leen service_visits + consultation_records"
```

---

## Task 8: Componentes de consulta

**Files:**
- Modify: `components/medical-records/MedicalRecordForm.tsx`
- Modify: `app/dashboard/pets/[petId]/page.tsx`
- Modify: `app/dashboard/pets/[petId]/records/[recordId]/page.tsx`
- Modify: `app/dashboard/pets/[petId]/records/new/page.tsx`
- Modify: cualquier otro consumidor que tsc reporte

- [ ] **Step 1: Identificar todos los consumidores rotos**

```bash
grep -rln "medical_record\|MedicalRecord\|heart_rate\|respiratory_rate" components/ app/dashboard/ | grep -v node_modules
```

- [ ] **Step 2: MedicalRecordForm**

Quitar los campos de frecuencia cardíaca y respiratoria del formulario (inputs + schema + estado). Mantener weight_kg y temperature_celsius.

- [ ] **Step 3: Pet profile page**

La query que carga `medical_records(...)` en `app/dashboard/pets/[petId]/page.tsx` debe cambiar a `service_visits` filtrando `service_type='consultation'` con join a `consultation_records`. El shape que consume `MedicalRecordCard` debe mantenerse — mapear los campos desde el join.

- [ ] **Step 4: Record detail page**

Misma transformación en `records/[recordId]/page.tsx` — el `recordId` es ahora el `visit_id`.

- [ ] **Step 5: Verificar TypeScript y build**

```bash
npx tsc --noEmit 2>&1 | head -20
npm run build 2>&1 | tail -20
```
Expected: build verde.

- [ ] **Step 6: Smoke manual**

Levantar `npm run dev`, crear una consulta walk-in, verla en el perfil de la mascota, abrir su detalle, descargar el PDF. Todo debe funcionar.

- [ ] **Step 7: Commit**

```bash
git add components/ app/dashboard/
git commit -m "refactor: componentes de consulta sobre service_visits; quitar FC/FR"
```

---

# FASE 2 — Migración de Estética

## Task 9: Migración grooming_records

**Files:**
- Create: `supabase/migrations/20260601000003_migrate_grooming.sql`

- [ ] **Step 1: Verificar constraints de las tablas grooming**

`execute_sql`:
```sql
SELECT conrelid::regclass AS tabla, conname FROM pg_constraint
WHERE conrelid IN ('grooming_sessions'::regclass,'grooming_session_services'::regclass) AND contype='f';
```

- [ ] **Step 2: Escribir el SQL**

```sql
-- 20260601000003_migrate_grooming.sql

-- 1. service_visit por cada grooming_session, reutilizando id
INSERT INTO service_visits (id, tenant_id, pet_id, owner_id, appointment_id, service_type, status, started_at, ended_at, created_by, created_at)
SELECT
  gs.id,
  gs.tenant_id,
  gs.pet_id,
  COALESCE(
    (SELECT a.owner_id FROM appointments a WHERE a.id = gs.appointment_id),
    (SELECT pr.owner_id FROM pet_registrations pr WHERE pr.pet_id = gs.pet_id AND pr.tenant_id = gs.tenant_id LIMIT 1)
  ),
  gs.appointment_id,
  'grooming',
  CASE WHEN gs.ended_at IS NOT NULL THEN 'completed'::visit_status
       WHEN gs.started_at IS NOT NULL THEN 'in_progress'::visit_status
       ELSE 'completed'::visit_status END,
  gs.started_at,
  gs.ended_at,
  gs.created_by,
  gs.created_at
FROM grooming_sessions gs
WHERE EXISTS (SELECT 1 FROM pet_registrations pr WHERE pr.pet_id = gs.pet_id AND pr.tenant_id = gs.tenant_id)
   OR gs.appointment_id IS NOT NULL;

-- 2. grooming_records
CREATE TABLE grooming_records (
  visit_id UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  notes    TEXT
);

INSERT INTO grooming_records (visit_id, notes)
SELECT id, notes FROM grooming_sessions WHERE id IN (SELECT id FROM service_visits);

ALTER TABLE grooming_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_grooming_records" ON grooming_records
  FOR SELECT USING (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_grooming_records" ON grooming_records
  FOR INSERT WITH CHECK (visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

-- 3. grooming_record_services desde grooming_session_services
CREATE TABLE grooming_record_services (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id          UUID NOT NULL REFERENCES grooming_records(visit_id) ON DELETE CASCADE,
  service_catalog_id UUID REFERENCES grooming_service_catalog(id) ON DELETE SET NULL,
  service_name       TEXT NOT NULL
);

INSERT INTO grooming_record_services (id, record_id, service_catalog_id, service_name)
SELECT gss.id, gss.session_id, gss.service_catalog_id, gss.service_name
FROM grooming_session_services gss
WHERE gss.session_id IN (SELECT id FROM service_visits);

CREATE INDEX grooming_record_services_record_id_idx ON grooming_record_services(record_id);

ALTER TABLE grooming_record_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_grooming_record_services" ON grooming_record_services
  FOR SELECT USING (record_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));
CREATE POLICY "tenant_insert_grooming_record_services" ON grooming_record_services
  FOR INSERT WITH CHECK (record_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id()));

-- 4. Eliminar tablas viejas
DROP TABLE grooming_session_services CASCADE;
DROP TABLE grooming_sessions CASCADE;
```

- [ ] **Step 3: Aplicar la migración**

MCP `apply_migration`, name `migrate_grooming`.
Expected: `{"success":true}`

- [ ] **Step 4: Verificar**

`execute_sql`:
```sql
SELECT
  (SELECT count(*) FROM service_visits WHERE service_type='grooming') AS visits,
  (SELECT count(*) FROM grooming_records) AS records,
  (SELECT count(*) FROM grooming_record_services) AS svcs;
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601000003_migrate_grooming.sql
git commit -m "feat: migrar grooming_sessions -> grooming_records sobre service_visits"
```

---

## Task 10: Tipos TypeScript — grooming_records

**Files:**
- Modify: `lib/types/database.ts`

- [ ] **Step 1: Reemplazar tipos grooming**

Quitar las entradas `grooming_sessions` y `grooming_session_services` del bloque `Database` y los aliases `GroomingSession`, `GroomingSessionService`. Agregar:

```typescript
      grooming_records: {
        Row: { visit_id: string; notes: string | null }
        Insert: { visit_id: string; notes?: string | null }
        Update: { notes?: string | null }
        Relationships: []
      }
      grooming_record_services: {
        Row: { id: string; record_id: string; service_catalog_id: string | null; service_name: string }
        Insert: { record_id: string; service_catalog_id?: string | null; service_name: string }
        Update: Record<string, never>
        Relationships: []
      }
```

Y los aliases:
```typescript
export type GroomingRecord = Database['public']['Tables']['grooming_records']['Row']
export type GroomingRecordService = Database['public']['Tables']['grooming_record_services']['Row']
```

- [ ] **Step 2: Verificar (errores esperados en consumidores grooming)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add lib/types/database.ts
git commit -m "refactor: tipos grooming_records / grooming_record_services"
```

---

## Task 11: API de estética sobre service_visits

**Files:**
- Modify: `app/api/servicios/estetica/route.ts`
- Modify: `app/api/servicios/estetica/[id]/route.ts`
- Modify: `app/api/pets/[id]/grooming-sessions/route.ts`

- [ ] **Step 1: POST en `servicios/estetica/route.ts`**

Crear `service_visit` (service_type `grooming`, status según si hay `started_at`) + `grooming_records` + `grooming_record_services`. Reemplazar la lógica actual de insert en `grooming_sessions`:

```typescript
const { data: visit, error: visitError } = await (supabase as any)
  .from('service_visits')
  .insert({
    tenant_id: tenantId,
    pet_id: sessionData.pet_id,
    owner_id: ownerId,                 // resolver desde pet_registrations o appointment
    appointment_id: sessionData.appointment_id ?? null,
    service_type: 'grooming',
    status: sessionData.started_at ? 'in_progress' : 'completed',
    started_at: sessionData.started_at ?? null,
    created_by: user.id,
  })
  .select().single()
if (visitError) return NextResponse.json({ error: 'Error al crear la visita' }, { status: 500 })

const { error: recError } = await (supabase as any)
  .from('grooming_records').insert({ visit_id: visit.id, notes: sessionData.notes ?? null })
if (recError) { await (supabase as any).from('service_visits').delete().eq('id', visit.id); return NextResponse.json({ error: 'Error al crear el registro' }, { status: 500 }) }

if (services.length > 0) {
  const rows = services.map(s => ({ record_id: visit.id, service_catalog_id: s.service_catalog_id ?? null, service_name: s.service_name }))
  await (supabase as any).from('grooming_record_services').insert(rows)
}
```
Para resolver `ownerId`: consultar `pet_registrations` del tenant para el `pet_id`. Si no se encuentra, error 422.

- [ ] **Step 2: GET en `servicios/estetica/route.ts`**

Cambiar la query de `grooming_sessions` a `service_visits` filtrando `service_type='grooming'`, con joins:
```typescript
.from('service_visits')
.select(`
  id, session_date:started_at, started_at, ended_at, status,
  pet:pet_id(id, name, species:species_id(name)),
  record:grooming_records(notes),
  services:grooming_record_services(id, service_name)
`)
.eq('tenant_id', tenantId)
.eq('service_type', 'grooming')
```
Mapear `notes` desde `record.notes` y mantener el shape que consume `GroomingSessionsTable`. El branch `?appointmentId=` filtra por `appointment_id`.

- [ ] **Step 3: PATCH en `servicios/estetica/[id]/route.ts`**

Ahora actualiza `service_visits` (status, ended_at) y `grooming_records` (notes) por separado. El `id` es el `visit_id`:
```typescript
// status/ended_at van a service_visits
await (supabase as any).from('service_visits')
  .update({ ended_at: body.ended_at, status: body.ended_at ? 'completed' : undefined })
  .eq('id', id).eq('tenant_id', tenantId)
// notes va a grooming_records
if (body.notes !== undefined) {
  await (supabase as any).from('grooming_records').update({ notes: body.notes }).eq('visit_id', id)
}
```
Agregar invariante: leer el visit actual; si `ended_at` ya existe, rechazar con 409 (cierra el hueco del audit 1.3).

- [ ] **Step 4: per-pet grooming sessions**

`pets/[id]/grooming-sessions/route.ts`: cambiar query a `service_visits` (service_type grooming, pet_id) con joins a `grooming_records` y `grooming_record_services`. Mantener shape.

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add app/api/servicios/ app/api/pets/
git commit -m "refactor: API estética sobre service_visits + grooming_records"
```

---

## Task 12: Componentes de estética

**Files:**
- Modify: `components/servicios/GroomingSessionsTable.tsx`
- Modify: `components/servicios/GroomingSessionModal.tsx`
- Modify: `components/servicios/GroomingHistoryModal.tsx`

- [ ] **Step 1: Identificar consumidores rotos**

```bash
grep -rln "grooming_session\|GroomingSession\b\|session_id" components/ app/dashboard/ | grep -v node_modules
npx tsc --noEmit 2>&1 | grep servicios | head
```

- [ ] **Step 2: Ajustar los shapes**

Los componentes consumen el shape de la API (que ya se preservó en Task 11). Ajustar nombres de tipo (`GroomingSession` → el shape de fila que devuelve la API) y cualquier referencia a `session_id`/`started_at` que haya cambiado. Como la API mantuvo el shape de respuesta, los cambios deben ser mínimos (principalmente imports de tipos).

- [ ] **Step 3: Verificar TypeScript y build**

```bash
npx tsc --noEmit 2>&1 | head -20
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Smoke manual**

Crear una sesión de estética desde el perfil de mascota y desde Servicios → Estética. Verificar historial.

- [ ] **Step 5: Commit**

```bash
git add components/servicios/
git commit -m "refactor: componentes de estética sobre el nuevo shape"
```

---

# FASE 3 — Appointments enum + panel pattern

## Task 13: appointments.service_type enum

**Files:**
- Create: `supabase/migrations/20260601000004_appointments_service_type.sql`
- Modify: `lib/types/database.ts`

- [ ] **Step 1: SQL**

```sql
-- 20260601000004_appointments_service_type.sql
ALTER TABLE appointments ADD COLUMN service_type service_type NOT NULL DEFAULT 'consultation';
UPDATE appointments SET service_type = appointment_type::service_type WHERE appointment_type IS NOT NULL;
ALTER TABLE appointments DROP COLUMN appointment_type;
```

- [ ] **Step 2: Aplicar**

MCP `apply_migration`, name `appointments_service_type`.

- [ ] **Step 3: Tipos**

En `database.ts`: en `appointments` Row/Insert/Update cambiar `appointment_type?: AppointmentType` → `service_type: ServiceType` (Insert/Update opcional). En la interfaz `Appointment`, cambiar `appointment_type` → `service_type`. Quitar el alias `AppointmentType` (ya no se usa) o dejarlo deprecado. Actualizar `DashboardAppointment` (`components/dashboard/DashboardAppointmentCard.tsx`) `appointment_type` → `service_type`.

- [ ] **Step 4: Actualizar consumidores**

```bash
grep -rln "appointment_type" app/ components/ | grep -v node_modules
```
Reemplazar todas las referencias por `service_type`. Incluye `NewAppointmentModal`, `AppointmentDetailDialog`, la query de `app/dashboard/appointments/page.tsx` y `app/dashboard/appointments/[appointmentId]/page.tsx`.

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260601000004_appointments_service_type.sql lib/types/database.ts app/ components/
git commit -m "refactor: appointments.appointment_type -> service_type (enum)"
```

---

## Task 14: NewAppointmentModal — service_type primero con campos por tipo

**Files:**
- Modify: `components/appointments/NewAppointmentModal.tsx`

- [ ] **Step 1: Leer el componente completo**

```bash
cat components/appointments/NewAppointmentModal.tsx
```

- [ ] **Step 2: Selector de tipo con los servicios agendables**

El dropdown de tipo de servicio usa `ServiceType`. Para este plan solo Consulta y Estética están operativas (Cirugía/Estadía se agregan en sus planes). Mostrar las opciones `Consulta` (`consultation`) y `Estética` (`grooming`). El campo de servicios de estética (multi-select del catálogo) se muestra solo cuando `service_type === 'grooming'` (ya existe esa lógica — solo cambiar el nombre del estado de `appointmentType` a `serviceType`).

- [ ] **Step 3: Payload**

El payload de la cita manda `service_type` en vez de `appointment_type`.

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add components/appointments/NewAppointmentModal.tsx
git commit -m "refactor: NewAppointmentModal usa service_type"
```

---

## Task 15: AppointmentDetailDialog → panel pattern

**Files:**
- Create: `components/appointments/panels/ConsultationPanel.tsx`
- Create: `components/appointments/panels/GroomingPanel.tsx`
- Create: `components/appointments/panels/index.ts`
- Modify: `components/appointments/AppointmentDetailDialog.tsx`

- [ ] **Step 1: Extraer `GroomingPanel`**

Crear `components/appointments/panels/GroomingPanel.tsx` con toda la lógica de sesión de grooming que hoy vive embebida en `AppointmentDetailDialog` (el fetch de sesión por `appointmentId`, iniciar sesión, concluir servicio con notas). Props: `{ appointment, onClose, onRefresh }`.

- [ ] **Step 2: Extraer `ConsultationPanel`**

Crear `components/appointments/panels/ConsultationPanel.tsx` con la UI de consulta (botón "Iniciar consulta" → link a `records/new`, confirmar cita, no_show, cancelar). Props iguales.

- [ ] **Step 3: Registro de paneles**

```typescript
// components/appointments/panels/index.ts
import { ConsultationPanel } from './ConsultationPanel'
import { GroomingPanel } from './GroomingPanel'
import type { ServiceType } from '@/lib/types/database'
import type { ComponentType } from 'react'

interface PanelProps {
  appointment: any
  onClose: () => void
  onRefresh: () => void
}

export const SERVICE_PANELS: Partial<Record<ServiceType, ComponentType<PanelProps>>> = {
  consultation: ConsultationPanel,
  grooming: GroomingPanel,
  // surgery, hospitalization, boarding → planes 9-11
}
```

- [ ] **Step 4: Adelgazar `AppointmentDetailDialog`**

El dialog ahora solo muestra la info común (mascota, fecha, hora, dueño) y delega las acciones al panel:

```tsx
import { SERVICE_PANELS } from './panels'

const Panel = SERVICE_PANELS[appointment.service_type] ?? SERVICE_PANELS.consultation
// ...en el bloque de acciones:
<Panel appointment={appointment} onClose={() => onOpenChange(false)} onRefresh={() => router.refresh()} />
```
Eliminar todos los `if (isGrooming)` y la lógica de sesión que se movió a `GroomingPanel`.

- [ ] **Step 5: Verificar TypeScript y build**

```bash
npx tsc --noEmit 2>&1 | head -20
npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Smoke manual**

Abrir una cita de consulta y una de estética desde el calendario. Verificar que cada una muestra su panel correcto, iniciar/concluir estética funciona, iniciar consulta navega.

- [ ] **Step 7: Commit**

```bash
git add components/appointments/
git commit -m "refactor: AppointmentDetailDialog usa panel pattern por service_type"
```

---

## Task 16: Limpieza final y verificación integral

**Files:**
- varios (limpieza)

- [ ] **Step 1: Buscar referencias muertas**

```bash
grep -rln "medical_records\|medical_record_id\|MedicalRecord\|grooming_sessions\|grooming_session_services\|appointment_type\|heart_rate\|respiratory_rate\|origin_record_id\|share_tokens" app/ components/ lib/ | grep -v node_modules
```
Cada resultado debe revisarse y limpiarse. (Nota: `share_tokens` puede seguir existiendo si hay UI de compartir que aún lo usa — no se elimina en este plan, solo se verifica que no quede roto.)

- [ ] **Step 2: Build completo**

```bash
npm run build 2>&1 | tail -30
```
Expected: build verde, sin errores de tipos ni de referencias.

- [ ] **Step 3: Smoke integral**

`npm run dev` y recorrer:
1. Crear cita de consulta → iniciar → registrar expediente → ver en perfil → PDF
2. Walk-in de urgencia → registrar → ver en perfil
3. Crear cita de estética → iniciar sesión → concluir desde Servicios → Estética
4. Calendario muestra ambos tipos con su panel correcto

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: limpieza de referencias muertas post-migración service_visits"
```

---

## Self-Review

**Cobertura del spec:**

| Sección del spec | Task |
|---|---|
| Enums `service_type` / `visit_status` | Task 1 |
| Tabla `service_visits` + RLS | Task 1 |
| `service_visit_deliveries` | Task 1 (tabla); wiring de UI queda para cada servicio |
| `consultation_records` (migración de medical_records) | Tasks 3-8 |
| Remover heart_rate / respiratory_rate | Tasks 3, 4, 8 |
| `grooming_records` + `grooming_record_services` | Tasks 9-12 |
| `appointments.service_type` enum | Task 13 |
| Relaciones semánticas (`follow_up_for_visit_id`, etc.) | Columnas creadas en Tasks 3 (consultation); las de surgery/hospitalization son planes 9-11 |
| Panel pattern (`AppointmentDetailDialog`) | Task 15 |
| `NewAppointmentModal` service_type-first | Task 14 |
| Dos vistas del calendario | Fuera de alcance de este plan (se diseña con Hospitalización/Estadía, planes 9-11) — anotado |
| Compartir por canal | Tabla creada (Task 1); el wiring de UI por servicio queda para cada plan |

**Notas de alcance:** Las tablas `surgery_records`, `hospitalization_records`, `boarding_records` y sus relaciones NO se crean aquí — son planes 9-11 sobre esta fundación. El enum ya incluye sus valores. Las dos vistas del calendario y el wiring de `service_visit_deliveries` por servicio se diseñan cuando lleguen esos servicios.

**Placeholder scan:** Sin TBD/TODO. Cada paso de SQL y código está completo. Los pasos que dicen "leer el archivo primero" son por archivos que no leí completos al planear (walk-in, PDFs, modal) — el ejecutor debe leerlos antes de modificar, no son placeholders de contenido.

**Consistencia de tipos:** `visit_id` es el nombre consistente del FK en todas las tablas hijas. `service_type` y `visit_status` son los enums consistentes. `ServiceVisit`, `ConsultationRecord`, `GroomingRecord` son los tipos consistentes en TS.
