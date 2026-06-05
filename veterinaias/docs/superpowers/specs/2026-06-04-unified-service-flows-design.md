# Unified Service Flows — Design Spec

**Date:** 2026-06-04
**Status:** Approved

---

## Problem

The app has multiple scattered entry points and inconsistent exit flows for each service type, causing staff confusion:

- 4 different dashboard CTAs, all opening the same modal with different pre-configurations
- Estética has two completely separate creation paths (appointment modal vs. direct `GroomingSessionModal`)
- Cirugía has its own dedicated modal (`ScheduleSurgeryModal`) outside the unified modal
- Conclusion flows are inconsistent: consulta concludes implicitly, estética has a two-step panel flow, hotel has a panel flow, cirugía has a dedicated detail page
- The Dashboard and Calendar are separate screens despite the calendar being the operational center

---

## Goals

1. One entry point per service (same modal, same pattern, every time)
2. All service initiation and conclusion from the service detail page — nowhere else
3. Dashboard and Calendar fused into a single operational screen
4. Each service has a clear, explicit lifecycle with one action available at a time
5. Schedule overlap warning without hard blocking (parallel staff is valid)

---

## Architecture

### Screen: Agenda (replaces Dashboard as home)

**Route:** `/dashboard` (same route, new content)

The main screen is the calendar view. Staff opens the app and sees today. No separate dashboard page.

```
┌─────────────────────────────────────────────────────────┐
│  MetricsStrip                                           │
│  [Citas hoy: 8]  [En curso: 2]  [Hotel activo: 3]      │
├─────────────────────────────────────────────────────────┤
│  CalendarView (default: day view, navigable to week)    │
│                                                         │
│  09:00  ██████ Firulais — Estética (confirmado)         │
│  10:00  ██████ Luna — Consulta (agendado)               │
│  10:00  ██████ Rex — Cirugía (confirmado)     ← parallel│
│  11:00  [empty slot]                                    │
│  ...                                                    │
├─────────────────────────────────────────────────────────┤
│  [Atender Ahora]  (fixed button, bottom or header)      │
└─────────────────────────────────────────────────────────┘
```

**Metrics definitions:**
- **Citas hoy**: total appointments scheduled for today (all service types)
- **En curso**: active service_visits today excluding hotel (consulta, estética, cirugía in_progress)
- **Hotel activo**: boarding stays currently in_progress (multi-day, tracked separately)

**Interactions:**
- Click on empty slot → opens `NewAppointmentModal` with that time pre-filled
- Click on appointment → opens `AppointmentPanel` (side panel)
- Click "Atender Ahora" → creates immediate consultation and navigates to `/servicios/consulta/[id]`

---

### Component: AppointmentPanel (side panel)

Read-only summary + navigation. **No initiation or conclusion actions here.**

```
┌─────────────────────────────┐
│  🐾 Firulais                │
│  Dueño: Carlos García       │
│  Estética · 09:00–10:00     │
│                             │
│  ● Confirmado               │
│                             │
│  [Confirmar]  [Cancelar]    │  ← only pre-start status actions
│  [No se presentó]           │
│                             │
│  [Ver detalle →]            │  ← navigates to detail page
└─────────────────────────────┘
```

The panel allows quick status actions (confirm, cancel, no-show) without navigating away from the calendar — these hit the same API endpoints as the detail page. The "Ver detalle" button is the gateway to initiation, conclusion, and any service-specific content.

---

### Component: NewAppointmentModal (unified)

Single modal component used from every entry point. Accepts optional `serviceType` prop.

**Without `serviceType`** (opened from calendar empty slot):
1. Step 1: Service type selector (Consulta / Estética / Hotel / Cirugía)
2. Step 2: Owner + pet selector
3. Step 3: Service-specific fields
4. Step 4: Date/time (pre-filled if opened from a time slot) + overlap warning if applicable

**With `serviceType`** (opened from a service page's "Nueva" button):
- Skips step 1, selector is locked to that service type
- Same steps 2–4

**Service-specific fields per type:**

| Service | Fields |
|---|---|
| Consulta | Motivo de consulta (optional) |
| Estética | Servicios a realizar (baño, corte, etc.), notas de ingreso |
| Hotel | Fecha esperada de check-out, notas de ingreso |
| Cirugía | Diagnóstico pre-op, peso, tipo de anestesia, procedimiento a realizar |

**Overlap validation:**
- System checks for existing appointments at the selected time
- If overlap detected: shows warning banner with conflicting appointments
- Staff can proceed anyway (parallel staff is valid) or change the time
- Never hard-blocks creation

---

### Service Detail Pages

Each service has a dedicated detail page. This is the only place where services are initiated and concluded.

**Shared structure for all detail pages:**

```
┌─────────────────────────────────────────────────────────┐
│  Header: [Pet name] · [Owner] · [Service type]          │
│  Estado: ● Confirmado                                   │
├─────────────────────────────────────────────────────────┤
│  Timeline: Agendado → Confirmado → En curso → Completado│
│               ✓           ✓          ·            ·     │
├─────────────────────────────────────────────────────────┤
│  Body: service-specific fields and information          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [PRIMARY ACTION BUTTON]  ← one button, context-driven  │
└─────────────────────────────────────────────────────────┘
```

---

### Service Lifecycles

#### Consulta `/servicios/consulta/[id]`

```
agendado ──► confirmado ──► en curso ──► completado
              [Confirmar]   [Iniciar]    [Finalizar consulta]
                            consulta
```

| State | Primary Action | What happens |
|---|---|---|
| `agendado` | Confirmar cita | → `confirmado` |
| `confirmado` | Iniciar consulta | → `en curso`, records `started_at` |
| `en curso` | Finalizar consulta | Saves medical record + → `completado` |
| `completado` | Hospitalizar paciente *(if needed)* | Creates hospitalization |

Secondary actions available before `en curso`: Cancelar, No se presentó.

---

#### Estética `/servicios/estetica/[id]`

```
agendado ──► confirmado ──► en curso ──► completado
              [Confirmar]   [Iniciar]    [Concluir sesión]
                            sesión
```

| State | Primary Action | What happens |
|---|---|---|
| `agendado` | Confirmar cita | → `confirmado` |
| `confirmado` | Iniciar sesión | → `en curso`, records `started_at` |
| `en curso` | Concluir sesión | Fill: services performed, notes → `completado` |

---

#### Hotel `/servicios/hotel/[id]`

```
agendado ──► confirmado ──► en curso ──► completado
              [Confirmar]   [Check-in]   [Check-out]
              reserva
```

| State | Primary Action | What happens |
|---|---|---|
| `agendado` | Confirmar reserva | → `confirmado` |
| `confirmado` | Check-in | → `en curso`, records `started_at` |
| `en curso` | Check-out | Fill: stay notes → `completado` |

Detail page also shows: daily log entries, day counter, expected check-out date.

---

#### Cirugía `/servicios/cirugia/[id]`

```
agendado ──► confirmado ──► en curso ──► completado
              [Confirmar]   [Iniciar]    [Concluir cirugía]
                            cirugía
```

| State | Primary Action | What happens |
|---|---|---|
| `agendado` | Confirmar cita | → `confirmado` |
| `confirmado` | Iniciar cirugía | → `en curso`, records `started_at` |
| `en curso` | Concluir cirugía | Fill: procedure, findings, complications, recovery instructions, follow-up date → `completado` |
| `completado` | Hospitalizar paciente *(if needed)* | Creates hospitalization |

---

#### Hospitalización `/servicios/hospitalizacion/[id]`

Created exclusively from Consulta or Cirugía detail pages when those services are completed. No direct creation from calendar or dashboard.

```
en curso (desde creación) ──► completado
                               [Dar de alta]
```

| State | Primary Action | What happens |
|---|---|---|
| `en curso` | Dar de alta | Fill: discharge notes, diagnosis, post-discharge instructions → `completado` |

Detail page shows: daily log entries, day counter, option to add daily log.

---

### Entry Points — Final Map

| Entry point | Opens | Pre-configured |
|---|---|---|
| Calendar empty slot | `NewAppointmentModal` | Time pre-filled |
| Calendar appointment click | `AppointmentPanel` | — |
| `/servicios/consulta` → "Nueva consulta" | `NewAppointmentModal` | `serviceType=consulta` |
| `/servicios/estetica` → "Nueva sesión" | `NewAppointmentModal` | `serviceType=estetica` |
| `/servicios/hotel` → "Nueva reserva" | `NewAppointmentModal` | `serviceType=hotel` |
| `/servicios/cirugia` → "Nueva cirugía" | `NewAppointmentModal` | `serviceType=cirugia` |
| Dashboard "Atender Ahora" | Direct → `/servicios/consulta/[id]` | Immediate, no modal |

---

## Components Removed

| Component | Reason |
|---|---|
| `GroomingSessionModal` | Absorbed into `NewAppointmentModal` |
| `ScheduleSurgeryModal` | Absorbed into `NewAppointmentModal` |
| `NewHotelReservationButton` | Unnecessary wrapper |
| `DashboardCTAs` | Replaced by calendar slots + "Atender Ahora" |

---

## Service Page Structure (each service)

Each `/servicios/[tipo]` page shows three sections:

1. **En curso** — services currently active (in_progress), with quick link to detail
2. **Próximas** — upcoming scheduled/confirmed appointments
3. **Historial** — completed and cancelled services

Plus the "Nueva [X]" button in the header.

---

## Out of Scope

- Calendar UI implementation (week/month views, drag-to-reschedule)
- Multi-doctor assignment per appointment
- Push notifications or reminders
- Billing integration per service
