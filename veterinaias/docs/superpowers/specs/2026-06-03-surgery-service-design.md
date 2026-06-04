# Cirugía — Rediseño de Flujo

**Fecha:** 2026-06-03  
**Estado:** Aprobado — pendiente plan de implementación  
**Reemplaza:** diseño anterior del 2026-06-03 (flujo con página separada de registro)

---

## Objetivo

Unificar el flujo de cirugía en dos fases claras e inline, congruentes con los demás servicios
(estética, hotel): **agendar** desde la página de Cirugías con datos pre-op, y **concluir**
directamente dentro del panel de la cita — sin navegación a páginas separadas.

---

## Decisiones

1. **Agendado exclusivo desde la página de Cirugías.** Se elimina "Cirugía" como opción
   creatable en `NewAppointmentModal`. Las citas de tipo cirugía ya existentes siguen visibles
   en el calendario y manejables desde el panel.

2. **Modal de agendado especializado (`ScheduleSurgeryModal`).** Recoge: dueño → mascota
   (selección en dos pasos para evitar confusión con mascotas del mismo nombre), fecha/hora,
   veterinario asignado, y datos pre-op completos (diagnóstico, peso, notas pre-op, tipo de
   anestesia, notas de anestesia).

3. **Conclusión inline en `SurgeryPanel`**, igual que `GroomingPanel` y `BoardingPanel`. Sin
   página separada de registro.

4. **Creación atómica al agendar.** `POST /api/servicios/cirugia` crea en una sola llamada:
   `appointment` + `service_visit` (started_at=null) + `surgery_records` (con pre-op). No
   llama a `conclude_service_visit` todavía.

5. **Estilo visual:** `ScheduleSurgeryModal` y el formulario de conclusión en `SurgeryPanel`
   siguen las convenciones de `MedicalRecordForm`: `FormSection` con ícono + título,
   `Label text-[13px] font-bold`, inputs con `bg-muted/30 focus:bg-white transition-all`.
   El panel omite el card wrapper externo pero mantiene las mismas clases de campo.

---

## Flujo Completo

### Fase 1 — Agendar

1. Staff hace clic en **"+ Nueva cirugía"** en `/dashboard/servicios/cirugia`
2. Se abre `ScheduleSurgeryModal`
3. Staff completa el formulario (ver campos abajo)
4. Submit → `POST /api/servicios/cirugia` crea los tres registros atómicamente
5. Modal cierra, tabla de cirugías refresca

### Fase 2 — Concluir

1. Staff abre la cita desde el calendario o la tabla de cirugías
2. `SurgeryPanel` detecta que existe un `surgery_records` con `ended_at = null`
3. Muestra inline el formulario de conclusión
4. Staff completa los campos de resultado y hace clic en **"Registrar y concluir"**
5. `PATCH /api/servicios/cirugia/[visitId]` actualiza `surgery_records`, inserta prescripciones,
   llama a `conclude_service_visit` RPC
6. Panel muestra tarjeta verde. Cita queda como `completed`

---

## Campos por Fase

### `ScheduleSurgeryModal` (fase 1)

**Sección: Paciente y reserva**
- Dueño (búsqueda por nombre)
- Mascota (dropdown de mascotas del dueño seleccionado — activo solo tras elegir dueño)
- Fecha + hora
- Veterinario asignado

**Sección: Pre-operatorio**
- Diagnóstico / motivo
- Peso (kg)
- Notas pre-op (ayuno, estado, riesgos)

**Sección: Anestesia**
- Tipo (General / Sedación / Local)
- Notas / protocolo anestésico

### `SurgeryPanel` — formulario de conclusión (fase 2)

**Sección: Procedimiento**
- Procedimiento *(requerido al concluir)*
- Hallazgos / técnica
- Complicaciones
- Insumos / suturas

**Sección: Tiempos**
- Hora inicio (`datetime-local`)
- Hora fin (`datetime-local`)

**Sección: Post-operatorio**
- Notas post-op
- Indicaciones de recuperación para el dueño
- Fecha próximo control / retiro de puntos

**Sección: Prescripción**
- Prescripciones (componente `PrescriptionsFields` existente)

---

## API

### `POST /api/servicios/cirugia` (rediseñado)

**Input:** datos de agendado + pre-op
```
pet_id, owner_id, scheduled_date, scheduled_time, attended_by   ← requeridos
diagnosis, weight_kg, pre_op_notes, anesthesia_type, anesthesia_notes  ← opcionales
```

**Operaciones (secuencial, con cleanup en cadena si algo falla):**
1. `INSERT appointments` (service_type='surgery', scheduled_at)
2. `INSERT service_visits` (status='in_progress', started_at=null) — si falla: DELETE appointment
3. `INSERT surgery_records` (campos pre-op, sin campos de conclusión) — si falla: DELETE service_visit → appointment

**Respuesta:** `{ data: { id: visitId, appointment_id } }`

No llama a `conclude_service_visit`.

---

### `PATCH /api/servicios/cirugia/[id]` (nuevo)

**Input:** campos de conclusión
```
procedure          ← requerido
findings, complications, supplies                               ← opcionales
started_at, ended_at                                            ← opcionales
post_op_notes, recovery_instructions, follow_up_date           ← opcionales
prescriptions[]                                                  ← opcional
```

**Operaciones:**
1. `UPDATE surgery_records SET (campos de conclusión)`
2. `INSERT prescriptions` (si las hay)
3. `RPC conclude_service_visit(p_visit_id, p_ended_at)`

---

### Validaciones (`lib/validations/surgery.ts`)

- `scheduleSurgerySchema` — campos de agendado requeridos + pre-op opcionales
- `concludeSurgerySchema` — `procedure` requerido + conclusión opcional

---

## Estados de `SurgeryPanel`

| Condición | UI |
|-----------|-----|
| `loading` | Spinner |
| `isActive` + `surgery.ended_at === null` | Formulario de conclusión inline + acciones de transición |
| `surgery.ended_at !== null` (completed) | Tarjeta verde con resumen + botón "Ver detalles" |
| `cancelled` / `no_show` | Mensaje de texto |

Las acciones de transición debajo del botón principal (Confirmar, No se presentó, Cancelar)
siguen el mismo patrón que `GroomingPanel` y `BoardingPanel`.

---

## Archivos Afectados

### Nuevos
- `components/servicios/ScheduleSurgeryModal.tsx`

### Modificados
- `components/appointments/panels/SurgeryPanel.tsx` — rediseño completo inline
- `app/api/servicios/cirugia/route.ts` — POST rediseñado
- `app/api/servicios/cirugia/[id]/route.ts` — agregar PATCH
- `lib/validations/surgery.ts` — dividir en dos schemas
- `app/dashboard/servicios/cirugia/page.tsx` — usar `ScheduleSurgeryModal`
- `components/appointments/NewAppointmentModal.tsx` — quitar opción surgery
- `lib/constants/service-type.ts` — **sin cambios** (es solo config de display: label + ícono)

### Eliminados
- `components/servicios/SurgeryRecordForm.tsx`
- `components/servicios/NewSurgeryReservationButton.tsx`
- `app/dashboard/servicios/cirugia/registro/page.tsx` (y carpeta)

### Conservados sin cambios
- `app/dashboard/servicios/cirugia/[id]/page.tsx`
- `components/servicios/SurgeryDetail.tsx`
- `components/servicios/SurgeryTable.tsx`
