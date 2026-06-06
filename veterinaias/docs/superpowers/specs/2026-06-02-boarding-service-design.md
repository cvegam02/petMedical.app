# Servicio de Hotel para mascotas (boarding) — Diseño

**Fecha:** 2026-06-02
**Estado:** Aprobado (diseño) — pendiente plan de implementación

**Nomenclatura:** el nombre visible en toda la app es **"Hotel"** (no "guardería"/"estadía").
El `service_type` interno sigue siendo **`boarding`** (enum existente) y los nombres técnicos
de componentes/archivos mantienen "Boarding". Ruta de página: `/dashboard/servicios/hotel`;
API: `/api/servicios/hotel`. En prosa, "estancia" = una instancia del servicio (un hospedaje).

## Problema / objetivo

Agregar el tercer tipo de servicio sobre la abstracción `service_visits`: **Hotel para
mascotas** (boarding) — hospedaje multi-día no clínico. El enum `service_type` ya incluye
`boarding`; falta su tabla de extensión, su flujo (reserva → check-in → bitácora diaria →
check-out) y su UI, reutilizando los patrones de Consulta y Estética.

## Decisiones (del brainstorming)

1. **Solo por reserva (cita).** Una estancia nace siempre como cita `service_type='boarding'`;
   el check-in/check-out se hace desde el panel de la cita. **No** hay alta walk-in.
2. **Bitácora diaria incluida** en v1 (tabla `boarding_daily_logs`).
3. **Datos de check-in:** fecha esperada de salida, instrucciones de alimentación,
   pertenencias, cuidados especiales / medicación.
4. **Gestión:** página `/dashboard/servicios/hotel` (lista en curso / pasadas) + modal de
   detalle (info + bitácora diaria + check-out). La banda de "Servicios activos" del
   dashboard enlaza al detalle.
5. **Check-out:** reutiliza la función `conclude_service_visit` (cierre atómico de visita +
   cita); las notas finales se guardan en `boarding_records` justo antes.
6. **CTA:** se agrega un 4º CTA "Nueva reserva de hotel" (abre `NewAppointmentModal` con
   boarding). La fila pasa a 4.
7. **Ícono:** `BedDouble` (lucide) para boarding en toda la app; label "Hotel".

## Modelo de datos (migración nueva)

```sql
CREATE TABLE boarding_records (
  visit_id             UUID PRIMARY KEY REFERENCES service_visits(id) ON DELETE CASCADE,
  expected_check_out   DATE,
  feeding_instructions TEXT,
  belongings           TEXT,
  special_care         TEXT,
  notes                TEXT            -- notas finales (check-out)
);

CREATE TABLE boarding_daily_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id   UUID NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE,
  log_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  fed        BOOLEAN NOT NULL DEFAULT false,
  walked     BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX boarding_daily_logs_visit_id_idx ON boarding_daily_logs(visit_id);
```

RLS (mismo patrón que `grooming_records`): SELECT/INSERT/UPDATE sobre `boarding_records` y
SELECT/INSERT sobre `boarding_daily_logs`, gateadas por
`visit_id IN (SELECT id FROM service_visits WHERE tenant_id = auth_tenant_id())`.

`started_at` = check-in, `ended_at` = check-out, `status` `in_progress` durante la estancia.
`boarding_records` se crea en el check-in.

## Ciclo de vida

1. **Reserva:** `NewAppointmentModal` agrega el tipo **Hotel**. Crea una cita
   `service_type='boarding'`, `scheduled_at` = entrada planeada. (Sin campos boarding-only en
   la reserva; los datos se capturan en el check-in.)
2. **Check-in** (`BoardingPanel`, cita activa sin estancia): formulario con fecha esperada de
   salida + alimentación + pertenencias + cuidados especiales → `POST /api/servicios/hotel`
   crea `service_visit` (`started_at`=now, `status='in_progress'`) + `boarding_records`.
   Mantiene las transiciones confirmar / no_show / cancelar.
3. **En curso** (`BoardingPanel`): resumen (entrada, salida esperada, "día N") + botón
   **Check-out** con notas finales.
4. **Check-out:** `PATCH /api/servicios/hotel/[id]` guarda `boarding_records.notes` (si viene)
   y luego llama `conclude_service_visit` (cierra visita + cita atómicamente).
5. **Completada:** resumen de solo lectura.

## API `/api/servicios/hotel` (espejo de estética)

- `GET` — lista de estancias del tenant (`service_visits` con `service_type='boarding'`,
  embed `pet`, `record:boarding_records(*)`), ordenadas por `created_at` desc. Branch
  `?appointmentId=` → estancia única ligada a la cita (para `BoardingPanel`).
- `[id] GET` — estancia única completa (visit + `boarding_records`), para el modal de detalle
  (que puede abrirse desde la tabla o desde la banda del dashboard, donde el item genérico no
  trae los campos de boarding).
- `POST` — check-in: resuelve `owner_id` (cita o `pet_registrations`), inserta `service_visit`
  + `boarding_records`. Devuelve la estancia.
- `[id] PATCH` — check-out: set `boarding_records.notes` (si viene), luego
  `rpc('conclude_service_visit', { p_visit_id:id, p_ended_at, p_notes:null, p_intake_notes:null })`.
  (Los params de notas grooming van null → no-op.) Invariante: 409 si ya tiene `ended_at`.
- `[id]/daily-logs` — `GET` (lista por `visit_id`), `POST` (nueva entrada: `log_date`,
  `notes`, `fed`, `walked`).

Validación Zod nueva en `lib/validations/boarding.ts` (check-in, check-out, daily log).

## UI

### Reserva
- `lib/validations/appointment.ts`: el enum `service_type` pasa a incluir `'boarding'` (en
  `appointmentSchema`, `updateAppointmentSchema`, `firstVisitSchema`).
- `NewAppointmentModal`: el selector de tipo ofrece **Hotel**; `initialAppointmentType`
  acepta `'boarding'`. (Sin multi-select de catálogo; boarding no usa catálogo de servicios.)

### Panel de cita
- `components/appointments/panels/BoardingPanel.tsx` (props `{ appointment, onClose, onRefresh }`):
  check-in form / resumen en curso + check-out / resumen completado.
- Registrarlo en `components/appointments/panels/index.ts` bajo `boarding`.

### Página + detalle
- `app/dashboard/servicios/hotel/page.tsx` — encabezado "Hotel" + `BoardingStaysTable`.
- `components/servicios/BoardingStaysTable.tsx` — lista (badge de estado, mascota, entrada,
  salida esperada / "día N", duración), click → detalle.
- `components/servicios/BoardingStayDetailModal.tsx` — recibe el `visitId` (y un seed opcional,
  p. ej. nombre de la mascota) y al abrir **carga por id** la estancia completa (`[id] GET`) y
  la bitácora (`[id]/daily-logs GET`). Muestra pet + estado, fechas + "día N de M" (con
  `expected_check_out`), datos de recepción (alimentación/pertenencias/cuidados), **bitácora
  diaria** (lista de entradas + form para agregar: notas, alimentó, paseó), y botón
  **Check-out** (con notas finales) cuando está en curso. Tras check-out o nueva entrada,
  refresca y notifica al padre (`onChanged`).
- `SidebarNav`: agregar "Hotel" bajo Servicios.

### Dashboard
- `lib/constants/service-type.ts`: agregar `boarding: { label: 'Hotel', Icon: BedDouble }`.
- `ActiveServicesBand`:
  - Etiqueta de tiempo: para `service_type==='boarding'` mostrar **"Día N"** (días desde
    `started_at`, mínimo 1) en vez de "X min en curso".
  - Click: enrutar por `service_type` → `BoardingStayDetailModal` para boarding,
    `GroomingSessionDetailModal` para grooming. (El item ya trae `service_type`.)
- `DashboardCTAs`: 4º CTA "Nueva reserva de hotel" (ícono `BedDouble`) → abre
  `NewAppointmentModal` con boarding. La fila pasa a `grid-cols-4`. `DashboardHome` cablea el
  handler.

## Manejo de errores

- Cada inserción multi-paso (check-in: visit→record) revierte la visita si falla el record
  (mismo patrón que estética).
- Check-out: si falla guardar `boarding_records.notes` → 500 sin cerrar; si falla el RPC →
  500 (cierre atómico no aplicado). El cierre crítico (visita + cita) es atómico.
- Listas/daily-logs que fallan → la sección/tabla muestra vacío/fallback, no rompe la página.

## Fuera de alcance (YAGNI)

- Cobro / tarifa por noche / facturación.
- Asignación de jaula/espacio físico (no se pidió; se puede añadir después como campo).
- Alta walk-in (se decidió solo-reserva).
- Cirugía y hospitalización (sus propios planes).
- Edición de entradas de bitácora ya creadas (v1: solo agregar; son append-only).

## Testing

Sin tests automatizados (preferencia del proyecto). Verificación manual:
1. Crear una cita de Hotel desde el dashboard (CTA) / agenda.
2. Check-in desde el panel de la cita con los 4 datos → aparece en "Servicios activos" con
   "Día 1" y en `/dashboard/servicios/hotel` como en curso.
3. Agregar 2 entradas de bitácora desde el detalle.
4. Check-out con notas → la estancia pasa a completada, la cita queda `completed`, sale de la
   banda; los números del dashboard se actualizan.

## Archivos

**Nuevos**
- `supabase/migrations/<ts>_boarding_tables.sql`
- `lib/validations/boarding.ts`
- `app/api/servicios/hotel/route.ts`
- `app/api/servicios/hotel/[id]/route.ts`
- `app/api/servicios/hotel/[id]/daily-logs/route.ts`
- `components/appointments/panels/BoardingPanel.tsx`
- `components/servicios/BoardingStaysTable.tsx`
- `components/servicios/BoardingStayDetailModal.tsx`
- `app/dashboard/servicios/hotel/page.tsx`

**Modificados**
- `lib/validations/appointment.ts` (enum service_type +boarding)
- `lib/constants/service-type.ts` (+boarding, label 'Hotel', BedDouble)
- `lib/types/database.ts` (tipos boarding_records / boarding_daily_logs)
- `components/appointments/NewAppointmentModal.tsx` (tipo Hotel)
- `components/appointments/panels/index.ts` (registro boarding)
- `components/dashboard/ActiveServicesBand.tsx` (label días + ruteo de detalle)
- `components/dashboard/DashboardCTAs.tsx` (+CTA hotel, grid-cols-4)
- `components/dashboard/DashboardHome.tsx` (handler del CTA)
- `components/dashboard/SidebarNav.tsx` (link Hotel)
