# Agenda — Operations Dashboard Redesign

**Date:** 2026-06-07
**Status:** Approved — ready for implementation
**Scope:** Replaces `/dashboard` (current `AgendaScreen`). The `/dashboard/appointments` page and its full calendar view are unchanged.

---

## Goal

Replace the current day-calendar-centric dashboard (`AgendaScreen` + `DayView`) with an operations-first control board. The primary mental model when opening this page is **"¿qué está pasando AHORA?"** — active services and alerts dominate, the appointment schedule is secondary and compact.

---

## Route

`/dashboard` — server-rendered page (existing route, replaces current component).

---

## Layout: Operations First

Single-column vertical layout. No sidebars or split-screen. Sections in priority order:

```
┌─────────────────────────────────────────────┐
│  Header — fecha + acciones globales         │
├─────────────────────────────────────────────┤
│  Métricas strip — 4-5 chips                 │
├─────────────────────────────────────────────┤
│  Alertas banner (condicional)               │
├─────────────────────────────────────────────┤
│  Servicios activos — hero section           │
├─────────────────────────────────────────────┤
│  Próximas citas — franja compacta           │
└─────────────────────────────────────────────┘
```

---

## Sections

### 1. Header

**Always visible.**

- Left: overline label "Agenda" + fecha completa en español (e.g. "Sábado, 7 de junio")
- Right: dos botones
  - "Nueva cita" — secondary style (`#F3F8FC` bg, `#0F4C81` text, `Whisper Border`). Abre `NewAppointmentModal`.
  - "Atender ahora" — primary style (`#35C48B` bg, white text). Navega a `/dashboard/servicios/consulta/new` (walk-in).

### 2. Métricas Strip

**Always visible.**

Grid de 4 chips neutros + 1 chip de alerta condicional:

| Chip | Valor | Color base |
|------|-------|-----------|
| En servicio | Count de `service_visits` con `status = 'in_progress'` (excluye boarding) | Soft Fill neutro |
| Hotel activo | Count de `service_visits` con `service_type = 'boarding'` y `status = 'in_progress'` | Soft Fill neutro |
| Citas hoy | Count de appointments con `scheduled_at` en el día actual | Soft Fill neutro |
| Por confirmar | Count de appointments con `status = 'scheduled'` y `scheduled_at` en el día actual | Soft Fill neutro |
| ⚠ Alertas | Count total de alertas activas. **Solo aparece si ≥1.** | `#FEF2F2` bg, `#FECACA` border, `#DC2626` text |

Estilo chips: `border-radius: 12px`, `Soft Fill (#F3F5F7)` bg, `Whisper Border (1px)`, número en `font-size: 24px, font-weight: 800, #161D24`. Label en `Label style (9px, 700, UPPERCASE, tracking)`.

### 3. Alertas Banner

**Condicional — solo visible si hay ≥1 alerta activa.**

Un banner por cada alerta, stackeados verticalmente. Estilo: `#FEF2F2` bg, `#FECACA` border, `border-radius: 12px`.

**Tipos de alerta generados en servidor:**

1. **Checkout vencido (Hotel):** `boarding_records.expected_check_out < now` y `service_visits.status = 'in_progress'`. Texto: `"{pet.name} — Hotel · Salida vencida"`. CTA: "Ver estancia →" navega a `/dashboard/servicios/hotel/stay/{visitId}`.
2. **Cita urgente sin confirmar:** `appointments.status = 'scheduled'` y `scheduled_at` dentro de los próximos 60 minutos. Texto: `"{pet.name} — {service_type} · Sin confirmar, en {N} min"`. CTA: "Ver cita →" abre `AppointmentQuickModal`.

### 4. Servicios Activos

**Always visible. Hero section — máxima prominencia visual.**

Contenedor: `bg-white`, `border: 1px solid #E7EBEF`, `border-radius: 16px`, `padding: 16px`.

Header del contenedor:
- Izquierda: dot verde `#35C48B` + label "Servicios activos" en Label style
- Derecha: badge `#F1FCF7 / #DCF8EB / #1D865C` con count "{N} en curso"

**Cards de servicios activos:**

Cada `service_visit` con `status = 'in_progress'` genera una card.

- Fondo: `#FAFBFC`, border `1px #E7EBEF`, `border-radius: 12px`
- Si la visita tiene alerta activa: border cambia a `1px #FECACA`
- Estado indicator dot: verde `#35C48B` si normal, rojo `#DC2626` si tiene alerta
- Contenido: nombre de mascota (font-weight 700) + especie (muted) + badge de tipo de servicio (neutro, Label style) + servicios específicos (solo grooming)
- Timer/día: ámbar `#F59E0B` para sesiones cortas (`{N} min`), muted `#73808C` para estancias largas (`Día {N} · sale {fecha}`), rojo `#DC2626` + "⚠ Salida vencida" para checkout overdue
- Click: abre modal de detalle del servicio correspondiente:
  - `grooming` → `GroomingSessionDetailModal`
  - `boarding` → `BoardingStayDetailModal`
  - `hospitalization` → `HospitalizationDetailModal`
  - `consultation` → navega a `/dashboard/servicios/consulta/{appointmentId}` (usando `appointment_id` de la visit)
  - `surgery` → navega a `/dashboard/servicios/cirugia/{appointmentId}`

**Empty state:** cuando `items.length === 0`:
- Dot muted + "Sin servicios en curso"
- Subtexto: "La clínica está libre"
- Contenedor con borde dashed, sin el fondo ámbar

**Live polling:** `fetch('/api/service-visits/active')` cada 60 segundos (comportamiento actual preservado).

### 5. Próximas Citas — Franja Compacta

**Always visible.**

Contenedor: `bg-white`, `border: 1px #E7EBEF`, `border-radius: 14px`, `padding: 12px 16px`.

Header: label "Próximas citas" (Label style) + link "Ver agenda completa →" (verde `#35C48B`) que navega a `/dashboard/appointments`.

Chips de citas — muestran las próximas citas del día con `scheduled_at >= now` (no canceladas/completadas), máx. 5 visibles, luego "+{N} más":

| Estado | Estilo |
|--------|--------|
| Normal (`scheduled`) | `Soft Fill (#F3F5F7)`, `Whisper Border` |
| Confirmada (`confirmed`) | `Surface Vitality (#F1FCF7)`, `#DCF8EB` border |
| Sin confirmar dentro de 60 min | `#FFFBEB` bg, `#FDE68A` border, texto ámbar |

Contenido de cada chip: hora en `Geist Mono / font-weight 700 / #0F4C81` + nombre mascota + tipo de servicio.

Click en chip → abre `AppointmentQuickModal` con el appointment seleccionado.

El color del chip **no** identifica el tipo de servicio — solo la urgencia de confirmación o estado.

---

## Color System

Aplicado del DESIGN.md MundoPet. Reglas clave:

- **Color = urgencia, no categoría.** Los chips de citas y las cards de servicio activo son neutros por defecto. Solo el estado de urgencia (sin confirmar, alerta, overdue) recibe color.
- **Vitality Green (#35C48B):** acciones primarias, estado confirmado, dot de servicio activo normal, badge "en curso", link "Ver agenda completa".
- **Error Red (#EF4444 / #DC2626):** alertas reales únicamente — checkout vencido, banner de alerta.
- **Warning Amber (#F59E0B / #FFFBEB):** citas sin confirmar, timer de sesión corta.
- **Institutional Blue (#0F4C81):** timestamps en chips (Geist Mono), botón "Nueva cita" text.
- **Neutral grays:** todo lo demás — cards, contenedores, chips normales.
- Amber Sand (#F3C57B) no se usa en este dashboard (The Restraint Rule).

---

## Data Model

Todo en una sola carga SSR desde `app/dashboard/page.tsx`:

```typescript
// Appointments de hoy (para métricas + chips)
appointments: {
  id, status, scheduled_at, duration_minutes, service_type,
  pet: { id, name, species: { name } },
  owner: { id, full_name, phone },
  assigned_to_profile: { id, full_name }
}
// Filtro: scheduled_at >= todayStart, ORDER BY scheduled_at ASC

// Servicios activos
service_visits: {
  id, service_type, status, started_at, created_at, appointment_id,
  pet: { id, name, species: { name } },
  grooming_records: { notes, intake_notes, services: { id, service_name } },
  boarding_records: { expected_check_out }
}
// Filtro: status = 'in_progress'

// Métricas derivadas en servidor (no endpoint separado)
metrics: {
  inService: count(service_visits where service_type != 'boarding'),
  hotelActive: count(service_visits where service_type = 'boarding'),
  total: count(appointments today),
  pendingConfirm: count(appointments today where status = 'scheduled'),
  alerts: count(alertas calculadas)
}

// Alertas calculadas en servidor
alerts: Alert[]  // tipo discriminado: 'checkout_overdue' | 'urgent_unconfirmed'
```

---

## Components

### New Components

| Componente | Archivo | Descripción |
|-----------|---------|-------------|
| `OperationsDashboard` | `components/dashboard/OperationsDashboard.tsx` | Shell principal. Reemplaza `AgendaScreen`. Recibe props del server. |
| `AlertBanner` | `components/dashboard/AlertBanner.tsx` | Un banner de alerta. Recibe tipo + datos. |
| `AppointmentChipsStrip` | `components/dashboard/AppointmentChipsStrip.tsx` | Franja de chips compactos. Recibe lista de appointments. |

### Reused Without Changes

- `ActiveServicesBand` — el héroe section. Props idénticas, estilos alineados con nueva paleta.
- `MetricsStrip` — actualizar props e interfaz: reemplazar `completed` y `overdue` por `alerts: number`. Ajustar estilos a paleta MundoPet: 4 chips neutros + chip rojo condicional para `alerts`.
- `AppointmentQuickModal` — click en chip de cita.
- `NewAppointmentModal` — botón "Nueva cita".
- `GroomingSessionDetailModal`, `BoardingStayDetailModal`, `HospitalizationDetailModal` — click en card de servicio activo.

### Removed

- `AgendaScreen` — reemplazado por `OperationsDashboard`
- `DayView` — eliminado de esta ruta (sigue en `/dashboard/appointments` via `CalendarView`)
- `AppointmentPanel` — eliminado de esta ruta

---

## What Changes vs Current

| Elemento | Antes | Después |
|---------|-------|---------|
| Hero section | `DayView` calendario por horas | `ActiveServicesBand` expandida |
| Alertas | Inline en cards de servicio | Banner dedicado condicional |
| Citas | Calendario completo (07:00–19:00) | Franja de 5 chips compactos |
| Métricas | Strip simple de texto inline | Grid de chips con color semántico |
| Colores | Ámbar estructural + múltiples colores por servicio | Neutro base + verde/rojo/ámbar solo para urgencia |

---

## Out of Scope

- Multi-doctor views (Plan Empresa deferred per memory)
- Notificaciones push
- Widgets configurables o drag-and-drop
- Filtros por doctor en esta pantalla
