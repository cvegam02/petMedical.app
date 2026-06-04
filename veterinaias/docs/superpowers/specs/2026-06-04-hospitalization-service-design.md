# Servicio de Hospitalización — Diseño

**Fecha:** 2026-06-04
**Estado:** Aprobado — pendiente plan de implementación

---

## Objetivo

Agregar el quinto tipo de servicio sobre `service_visits`: **Hospitalización** — internamiento clínico de una mascota. A diferencia de los demás servicios, la hospitalización **siempre deriva** de una consulta o cirugía previa; nunca se agenda directamente.

---

## Decisiones

1. **Sin cita propia.** La hospitalización no nace como cita agendada. Nace desde el panel de conclusión de una consulta o cirugía, mediante un checkbox **"Requiere hospitalización"**.
2. **Redirect-based admission.** Al concluir con el checkbox marcado, se muestra un dialog de confirmación y se redirige a `/dashboard/servicios/hospitalizacion?admitir=<visitId>`. La página detecta el query param y abre `AdmitPatientModal` automáticamente con datos precargados.
3. **`source_visit_id` en `hospitalization_records`.** Campo nuevo exclusivo de este servicio — ningún otro `_records` lo tiene. Apunta a la `service_visit` de la consulta o cirugía de origen.
4. **Bitácora diaria clínica.** Tabla `hospitalization_daily_logs` con notas de evolución, medicamentos administrados, alimentación y temperatura. Append-only en v1.
5. **Alta con recetas + seguimiento.** El formulario de alta incluye `PrescriptionsFields` (existente) y un checkbox **"Agendar cita de seguimiento"** que, si está marcado, abre `NewAppointmentModal` pre-cargado con la mascota y tipo consulta al concluir.
6. **Dashboard.** La banda de activos muestra hospitalizaciones en curso con etiqueta **"Día N"** (igual que boarding). Ícono: `HeartPulse` (lucide), label: `"Hospitalización"`.
7. **Sin página separada de detalle en v1.** El detalle (bitácora + alta) se maneja desde la página de lista vía modal, igual que boarding.

---

## Flujo completo

### Trigger de ingreso

1. Staff concluye una consulta o cirugía con el checkbox **"Requiere hospitalización"** marcado.
2. Aparece dialog: *"El paciente quedará hospitalizado. Se le redirigirá para registrar el ingreso."*
3. Staff acepta → la cita se concluye normalmente → redirect a `/dashboard/servicios/hospitalizacion?admitir=<visitId>`.
4. La página detecta `?admitir=<visitId>`, carga los datos de la visita origen y abre `AdmitPatientModal` con los campos precargados.

### Registro de ingreso

1. Staff completa `AdmitPatientModal` (ver campos abajo).
2. Submit → `POST /api/servicios/hospitalizacion` → crea `service_visit` (`service_type='hospitalization'`, `started_at=now`, `status='in_progress'`) + `hospitalization_records` (con `source_visit_id`).
3. Modal cierra → la hospitalización aparece en la lista como "En curso" y en la banda de activos del dashboard con "Día 1".

### En curso

- Página `/dashboard/servicios/hospitalizacion` muestra la hospitalización activa.
- Click → abre `HospitalizationDetailModal` con:
  - Header: nombre mascota + *"Día N de hospitalización"*
  - Info de ingreso (solo lectura)
  - Bitácora diaria: lista de entradas + form para agregar entrada
  - Botón **"Dar de alta"**

### Alta

1. Staff hace clic en **"Dar de alta"**.
2. Se muestra el formulario de alta inline o en modal.
3. Staff completa campos (ver abajo) y opcionalmente marca **"Agendar cita de seguimiento"**.
4. Submit → `PATCH /api/servicios/hospitalizacion/[id]` → guarda campos de alta → llama `conclude_service_visit` RPC.
5. Si checkbox de seguimiento estaba marcado → abre `NewAppointmentModal` pre-cargado con `pet_id` y tipo `consultation`.
6. La hospitalización pasa a completada; desaparece de la banda de activos.

---

## Campos por fase

### `AdmitPatientModal` — ingreso

**Sección: Paciente** *(solo display, no editable)*
- Nombre + especie (de la visita origen)
- Servicio de origen (consulta / cirugía)

**Sección: Ingreso**
- Motivo de hospitalización *(requerido)*
- Diagnóstico al ingreso (pre-cargado del expediente/cirugía de origen, editable)
- Peso al ingreso (kg)
- Plan de tratamiento inicial

**Sección: Responsable**
- Médico responsable (select de `user_profiles`)

### Bitácora diaria — nueva entrada

- Fecha *(default hoy)*
- Notas de evolución
- Medicamentos administrados (texto libre)
- Temperatura (°C)
- Alimentó: sí / no

### Formulario de alta

**Sección: Egreso**
- Notas de egreso
- Diagnóstico final
- Instrucciones post-hospitalización para el dueño

**Sección: Medicación**
- Prescripciones (`PrescriptionsFields` existente)

**Sección: Seguimiento**
- Checkbox **"Agendar cita de seguimiento"** → al confirmar alta, abre `NewAppointmentModal` con pet pre-cargado y tipo consulta

---

## Modelo de datos

```sql
CREATE TABLE hospitalization_records (
  visit_id                    UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  source_visit_id             UUID REFERENCES service_visits(id),
  admitted_by                 UUID REFERENCES user_profiles(id),
  reason                      TEXT NOT NULL,
  diagnosis                   TEXT,
  weight_kg                   NUMERIC(5,2),
  treatment_plan              TEXT,
  -- Alta
  discharge_notes             TEXT,
  discharge_diagnosis         TEXT,
  post_discharge_instructions TEXT
);

CREATE TABLE hospitalization_daily_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     UUID NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE,
  log_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  medications  TEXT,
  fed          BOOLEAN NOT NULL DEFAULT false,
  temperature  NUMERIC(4,1),
  created_by   UUID NOT NULL REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX hospitalization_daily_logs_visit_id_idx ON hospitalization_daily_logs(visit_id);
```

RLS (mismo patrón que `boarding_records`): SELECT/INSERT/UPDATE gateados por
`visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id())`.

---

## API

### `POST /api/servicios/hospitalizacion`

**Input:**
```
source_visit_id   ← requerido (visita de origen)
reason            ← requerido
diagnosis, weight_kg, treatment_plan, admitted_by   ← opcionales
```

**Operaciones (con cleanup en cadena si algo falla):**
1. Resuelve `pet_id` y `owner_id` desde `source_visit_id`
2. `INSERT service_visits` (`service_type='hospitalization'`, `started_at=now`, `status='in_progress'`)
3. `INSERT hospitalization_records` — si falla: DELETE service_visit

**Respuesta:** `{ data: { id: visitId } }`

---

### `GET /api/servicios/hospitalizacion`

Lista de hospitalizaciones del tenant. Embed: `pet`, `record:hospitalization_records(*)`, `source:source_visit_id(service_type, appointment_id)`. Ordenado por `created_at` desc.

---

### `GET /api/servicios/hospitalizacion/[id]`

Hospitalización completa con bitácora. Embed: `pet`, `record:hospitalization_records(*)`, logs vía subquery.

---

### `PATCH /api/servicios/hospitalizacion/[id]`

**Input:** campos de alta
```
discharge_notes, discharge_diagnosis, post_discharge_instructions   ← opcionales
prescriptions[]   ← opcional
```

**Operaciones:**
1. `UPDATE hospitalization_records SET (campos de alta)`
2. `INSERT prescriptions` (si las hay)
3. `RPC conclude_service_visit(p_visit_id, p_ended_at)`

Invariante: 409 si ya tiene `ended_at`.

---

### `GET /POST /api/servicios/hospitalizacion/[id]/daily-logs`

- GET: lista de entradas de bitácora ordenadas por `log_date` asc, `created_at` asc.
- POST: nueva entrada (`log_date`, `notes`, `medications`, `fed`, `temperature`).

---

## Validaciones (`lib/validations/hospitalization.ts`)

- `admitPatientSchema` — `source_visit_id` + `reason` requeridos; resto opcionales.
- `dischargeSchema` — todos opcionales; `prescriptions[]` array.
- `dailyLogSchema` — `log_date` requerido; resto opcionales.

---

## UI

### Página de lista

`app/dashboard/servicios/hospitalizacion/page.tsx`
- Sección "En curso" (si hay activas) + tabla de historial.
- Sin CTA "Nueva hospitalización" — siempre se inicia desde consulta/cirugía.
- Click en fila → abre `HospitalizationDetailModal`.

### Modal de detalle

`components/servicios/HospitalizationDetailModal.tsx`
- Al abrir carga `GET /api/servicios/hospitalizacion/[id]` y `GET .../daily-logs`.
- Muestra: datos de ingreso + bitácora diaria + botón "Dar de alta" (si `status='in_progress'`).
- Formulario de alta inline al hacer clic en "Dar de alta".
- Tras alta exitosa: si checkbox seguimiento marcado → cierra modal → abre `NewAppointmentModal`.

### Modal de ingreso

`components/servicios/AdmitPatientModal.tsx`
- Props: `sourceVisitId`, `onAdmitted`.
- Carga datos de la visita origen al montar (`GET /api/servicios/hospitalizacion?sourceVisitId=`... o directamente desde la página).
- Pre-carga diagnóstico si viene de consulta (`medical_records`) o de cirugía (`surgery_records.diagnosis`).

### Panel en cita

`components/appointments/panels/HospitalizationPanel.tsx`
- Se registra en `panels/index.ts` bajo `hospitalization`.
- Para citas cuya visita derivó en hospitalización: muestra badge "Paciente hospitalizado" + link al detalle.
- Estado completado: muestra resumen de egreso.

### Checkbox en conclusión de otros servicios

- `SurgeryPanel.tsx` — checkbox "Requiere hospitalización" en el formulario de conclusión.
- Panel de consulta (`AppointmentDetailDialog` / `MedicalRecordForm`) — mismo checkbox.
- Ambos: al concluir con checkbox marcado → dialog de confirmación → `router.push('/dashboard/servicios/hospitalizacion?admitir=<visitId>')`.

---

## Estados de `HospitalizationPanel`

| Condición | UI |
|---|---|
| `loading` | Spinner |
| `status = 'in_progress'` | Info de ingreso + link "Ver hospitalización" |
| `status = 'completed'` | Tarjeta verde con resumen de egreso |
| `cancelled` / `no_show` | Mensaje de texto |

---

## Dashboard

- `lib/constants/service-type.ts`: `hospitalization: { label: 'Hospitalización', Icon: HeartPulse }`.
- `ActiveServicesBand`: etiqueta **"Día N"** para hospitalizaciones (igual que boarding).
- Click en tarjeta activa → abre `HospitalizationDetailModal`.
- `app/api/service-visits/active/route.ts`: agrega embed `hospitalization:hospitalization_records(reason, diagnosis)`.

---

## Manejo de errores

- Ingreso (visit → record): si falla INSERT de `hospitalization_records`, se revierte la visita.
- Alta: si falla UPDATE de `hospitalization_records` → 500 sin concluir. Si falla el RPC → 500 (atómico no aplicado).
- Bitácora: fallos individuales muestran toast de error; no rompen el modal.
- Si se navega a `?admitir=<visitId>` con un `visitId` inválido o ya hospitalizado → toast de error + limpiar query param.

---

## Fuera de alcance (YAGNI)

- Alta walk-in (siempre deriva de consulta/cirugía).
- Asignación de jaula/área específica.
- Edición de entradas de bitácora (append-only en v1).
- Foto o adjuntos en bitácora.
- Cobro / tarifa por día.
- Notificaciones automáticas al dueño.

---

## Testing

Sin tests automatizados (preferencia del proyecto). Verificación manual:
1. Concluir una consulta con "Requiere hospitalización" → confirmar redirect y pre-carga en modal.
2. Registrar ingreso → aparece en lista "En curso" y en banda del dashboard con "Día 1".
3. Agregar 2 entradas de bitácora desde el detalle.
4. Dar de alta con prescripción → hospitalización pasa a completada, desaparece de banda.
5. Dar de alta con "Agendar cita de seguimiento" marcado → `NewAppointmentModal` se abre con mascota pre-cargada.

---

## Archivos

### Nuevos
- `supabase/migrations/<ts>_hospitalization_tables.sql`
- `lib/validations/hospitalization.ts`
- `app/api/servicios/hospitalizacion/route.ts`
- `app/api/servicios/hospitalizacion/[id]/route.ts`
- `app/api/servicios/hospitalizacion/[id]/daily-logs/route.ts`
- `components/servicios/AdmitPatientModal.tsx`
- `components/servicios/HospitalizationDetailModal.tsx`
- `components/servicios/HospitalizationTable.tsx`
- `components/appointments/panels/HospitalizationPanel.tsx`
- `app/dashboard/servicios/hospitalizacion/page.tsx`

### Modificados
- `lib/constants/service-type.ts` (+hospitalization, label 'Hospitalización', HeartPulse)
- `lib/validations/appointment.ts` (enum service_type + hospitalization — ya existe en DB)
- `lib/types/database.ts` (tipos hospitalization_records / hospitalization_daily_logs)
- `components/appointments/panels/index.ts` (registro hospitalization)
- `components/appointments/panels/SurgeryPanel.tsx` (checkbox "Requiere hospitalización")
- Panel de consulta / `MedicalRecordForm` (checkbox "Requiere hospitalización")
- `app/api/service-visits/active/route.ts` (embed hospitalization_records)
- `components/dashboard/ActiveServicesBand.tsx` (label "Día N" + routing para hospitalization)
- `components/dashboard/DashboardHome.tsx` (handler para abrir HospitalizationDetailModal)
- Sidebar / `app/dashboard/layout.tsx` (link Hospitalización bajo Servicios)
