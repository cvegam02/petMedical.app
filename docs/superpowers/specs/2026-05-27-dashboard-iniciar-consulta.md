# Dashboard: Iniciar Consulta Directo

**Fecha:** 2026-05-27
**Estado:** Aprobado — listo para implementar

## Problema

El flujo actual para registrar una consulta es innecesariamente largo:

1. Dashboard → lista de citas
2. Click en tarjeta → navega a página de detalle de cita
3. Confirmar cita (si no estaba confirmada)
4. Click en "Registrar consulta" → formulario de expediente

Un médico en turno necesita iniciar consultas rápidamente. La página de detalle de cita agrega fricción sin valor real para ese flujo.

## Solución

Rediseñar el dashboard para que un médico pueda iniciar una consulta en dos clicks desde el momento que llega a la app.

## Cambios de UX

### Sección "Siguiente consulta" (nueva)

Al tope de la sección de citas del dashboard, aparece una tarjeta hero destacada con la próxima cita del día en estado `scheduled` o `confirmed`, ordenada por hora ascendente.

Contenido de la tarjeta:
- Nombre de la mascota + especie
- Nombre del dueño
- Hora de la cita + duración en minutos
- Motivo de consulta
- Botón primario "Iniciar consulta →"

El botón navega directamente a `/dashboard/pets/${petId}/records/new?appointmentId=${appointmentId}` sin pasos intermedios.

Si no hay próxima cita pendiente (todas completadas, canceladas, o sin citas hoy), la sección no se renderiza.

### Tarjetas de citas restantes (modificadas)

Las demás citas del día se muestran como tarjetas más pequeñas. Al hacer click abren un **modal de acción rápida** en lugar de navegar a la página de detalle.

### Modal de acción rápida (nuevo)

El modal muestra:
- Nombre de mascota + especie
- Nombre del dueño + teléfono
- Hora + duración + estado
- Motivo de consulta

Acciones disponibles (según estado de la cita):
- **"Iniciar consulta"** — solo si estado es `scheduled` o `confirmed`. Navega a `/dashboard/pets/${petId}/records/new?appointmentId=${appointmentId}`
- **"No se presentó"** — solo si estado es `scheduled` o `confirmed`. PATCH status a `no_show`, cierra modal, refresca página
- **"Cancelar cita"** — solo si estado es `scheduled` o `confirmed`. PATCH status a `cancelled`, cierra modal, refresca página

Si la cita está en estado terminal (`completed`, `cancelled`, `no_show`), el modal solo muestra la información sin acciones.

### Scope del cambio

- El modal **solo existe en el dashboard**. Las tarjetas en `/dashboard/appointments` siguen navegando a la página de detalle.
- La página de detalle de cita (`/dashboard/appointments/[appointmentId]/page.tsx`) no se modifica.
- `AppointmentCard.tsx` no se modifica.
- `StatusActions.tsx` no se modifica.

## Flujo de estados

"Iniciar consulta" funciona desde `scheduled` o `confirmed`. No realiza ningún PATCH antes de navegar al formulario.

La transición de estado ocurre cuando el médico guarda el expediente:
- El API de medical records actualiza el appointment a `completed` y asigna `medical_record_id`

Esto permite que una cita `scheduled` pase directamente a `completed` sin pasar por `confirmed`.

Flujo completo:
```
scheduled ──→ (Iniciar consulta) ──→ formulario ──→ guardar ──→ completed
confirmed ──→ (Iniciar consulta) ──→ formulario ──→ guardar ──→ completed
```

## Componentes

### Nuevos

| Componente | Tipo | Ubicación |
|------------|------|-----------|
| `NextAppointmentCard` | Client Component | `components/dashboard/NextAppointmentCard.tsx` |
| `DashboardAppointmentCard` | Client Component | `components/dashboard/DashboardAppointmentCard.tsx` |
| `AppointmentQuickModal` | Client Component | `components/dashboard/AppointmentQuickModal.tsx` |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `app/dashboard/page.tsx` | Usa los 3 componentes nuevos en la sección de citas de hoy |

### Sin cambios

- `components/appointments/AppointmentCard.tsx`
- `components/appointments/StatusActions.tsx`
- `app/dashboard/appointments/[appointmentId]/page.tsx`
- `app/dashboard/appointments/page.tsx`

## Lógica de "Siguiente consulta"

La cita hero es la primera cita del día (ordenada por `scheduled_at` ASC) cuyo estado es `scheduled` o `confirmed`. Se obtiene del mismo query que ya existe en `dashboard/page.tsx` filtrando `todayAppointments`.

```
nextAppointment = todayAppointments
  .filter(a => ['scheduled', 'confirmed'].includes(a.status))
  .at(0)  // ya viene ordenado por scheduled_at ASC
```

Las citas restantes (`otherAppointments`) son todas las de `todayAppointments` excepto la `nextAppointment`.

## Consideraciones de roles

El filtro de citas por doctor (`assigned_to`) ya existe en `dashboard/page.tsx`. Los componentes nuevos reciben las citas ya filtradas — no necesitan lógica de roles propia.

## Tests

- `NextAppointmentCard`: renderiza correctamente con cita `scheduled` y `confirmed`; no renderiza si no hay cita pendiente
- `DashboardAppointmentCard`: llama `onSelect` al hacer click; no navega
- `AppointmentQuickModal`: muestra acciones correctas según estado; PATCH correcto en "No se presentó" y "Cancelar"; navega en "Iniciar consulta"
