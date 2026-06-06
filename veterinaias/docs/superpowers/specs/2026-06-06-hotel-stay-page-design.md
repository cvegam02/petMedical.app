# Hotel — Pantalla de estadía dedicada

**Fecha:** 2026-06-06  
**Estado:** Aprobado

---

## Problema

El flujo actual mezcla la pantalla de detalles de la cita con el seguimiento operativo de la estadía en un solo componente (`BoardingStayDetail.tsx`). Además, `app/dashboard/servicios/hotel/[id]/page.tsx` importa `HotelAppointmentDetail` que no existe, por lo que la ruta está rota.

---

## Flujo deseado

```
Calendario → Clic en cita → Side panel lateral (BoardingPanel)
  → "Ver detalles" → /hotel/[appointmentId]   ← Page 1: Detalle + check-in
    → Confirmar check-in → redirect a /hotel/stay/[visitId]   ← Page 2: Seguimiento
```

---

## Page 1 — Detalle de cita (`/hotel/[appointmentId]`)

**Componente:** `components/servicios/HotelAppointmentDetail.tsx`

Muestra información de la cita y el formulario de check-in. No hace seguimiento de estadía.

**Contenido:**
- Header: back link "← Hotel", nombre de la mascota, badge de estado de la cita
- Info de la cita: fecha/hora, dueño (con teléfono), duración esperada
- **Si status = `scheduled`:** botón "Confirmar reserva" + acciones de no-show/cancelar
- **Si status = `confirmed` y sin visita activa:** formulario de check-in (alimentación, pertenencias, cuidados especiales) + botón "Registrar check-in" + acciones de no-show/cancelar
- **Si visita ya existe:** redirect automático a `/hotel/stay/[visitId]` (lógica ya existente en `[id]/page.tsx`)

**Post-check-in:** `router.push('/dashboard/servicios/hotel/stay/' + visitId)`

---

## Page 2 — Seguimiento de estadía (`/hotel/stay/[visitId]`)

**Componente:** `components/servicios/HotelStayPage.tsx`  
**Ruta:** `app/dashboard/servicios/hotel/stay/[id]/page.tsx`

### Hero

Sección superior prominente que comunica el estado de la mascota de un vistazo.

- Avatar grande (~80px) con ícono de especie + punto de estado animado (ámbar = en curso, verde = finalizada)
- Nombre de la mascota (texto grande, bold)
- Especie + nombre del dueño con teléfono clickeable
- Badge de estado: `En curso` / `Salida vencida` / `Finalizada`
- Fechas: check-in real y check-out esperado visibles en el hero
- Botón "← Volver al hotel" en el header

### Cuerpo (max-w-3xl, una columna)

1. **Tarjeta de instrucciones de cuidado** — alimentación, pertenencias, cuidados especiales (solo lectura, datos capturados en check-in)
2. **Tarjeta "Hoy"** — solo si la estadía está en curso; permite registrar notas del día + fed/walked + botón guardar
3. **Tabla de bitácora** — historial de días anteriores con columnas: Día, Fecha, Alimentó, Paseó, Notas, Editar
4. **Sección de check-out** — solo si en curso; textarea de notas de salida + botón "Realizar check-out" → al completar, redirige a `/dashboard/servicios/hotel`

---

## Archivos a crear / modificar

| Acción | Archivo |
|--------|---------|
| Crear | `components/servicios/HotelAppointmentDetail.tsx` |
| Crear | `components/servicios/HotelStayPage.tsx` |
| Crear | `app/dashboard/servicios/hotel/stay/[id]/page.tsx` |
| Modificar | `app/dashboard/servicios/hotel/[id]/page.tsx` — usar `HotelAppointmentDetail` correctamente |
| Refactorizar | `components/servicios/BoardingStayDetail.tsx` — extraer lógica a los dos nuevos componentes |
| Limpiar (menor) | `components/appointments/panels/BoardingPanel.tsx` — sin cambios de fondo necesarios |

---

## API y datos

No hay cambios en la API ni en la base de datos. Los endpoints existentes se reutilizan:

- `GET /api/servicios/hotel/[visitId]` — datos de la estadía
- `GET /api/servicios/hotel/[visitId]/daily-logs` — bitácora
- `POST /api/servicios/hotel` — crear estadía (check-in)
- `PATCH /api/servicios/hotel/[visitId]` — check-out (ended_at + notas)
- `POST /api/servicios/hotel/[visitId]/daily-logs` — guardar día
- `PATCH /api/appointments/[id]` — transiciones de estado

---

## Fuera de scope

- Cambios en la API
- Cambios en migraciones de base de datos
- Rediseño del `BoardingPanel` en el side panel del calendario
- Cambios en `BoardingStayDetailModal` (usado en ActiveServicesBand)
