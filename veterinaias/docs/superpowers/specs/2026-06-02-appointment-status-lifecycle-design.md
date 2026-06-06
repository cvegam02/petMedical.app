# Manejo del status de citas — Diseño

**Fecha:** 2026-06-02
**Estado:** Aprobado (diseño) — pendiente plan de implementación

## Problema

Dos huecos en el manejo del status de las citas:

1. **El cierre de la cita al concluir un servicio no es confiable.** Al concluir una
   sesión de estética, solo el flujo del panel de cita (`GroomingPanel`) cierra la cita
   (con una 2ª llamada del cliente que hace `PATCH /api/appointments/:id` a `completed`).
   Si se finaliza desde el modal de detalle (lista de Estética o banda del dashboard), el
   `service_visit` queda `completed` pero **la cita sigue en `confirmed`**. La regla está
   repartida en el cliente y se desincroniza.

2. **Las citas que ya pasaron no se manejan.** Una cita `scheduled`/`confirmed` cuya hora
   pasó y nadie resolvió se queda así indefinidamente. El dashboard solo muestra citas de
   hoy en adelante, así que el backlog de días anteriores queda invisible.

## Decisiones (del brainstorming)

1. **Auto-cierre server-side y transaccional.** Al concluir un `service_visit`, el backend
   cierra la cita ligada en la **misma transacción** (todo o nada).
2. **"Vencida" es un estado derivado** (calculado en lectura), no un status almacenado. No
   se toca el enum de status.
3. **Umbral de vencida:** `now > scheduled_at + duration_minutes + 30 min` (gracia de 30
   min, constante configurable), solo para citas en `scheduled`/`confirmed`.
4. **Resolución manual.** El sistema nunca cambia el status de una cita vencida solo; el
   staff la resuelve con las acciones existentes (Completar / No se presentó / Cancelar).
5. **Dashboard:** sección "Vencidas" = backlog de **días anteriores**; las vencidas de
   **hoy** se quedan en "Citas de hoy" con un badge "Vencida" (no se duplican).
6. **Orden del dashboard:** Servicios activos → Citas de hoy → Próximas → Vencidas.
7. **Métricas:** 5 números — En servicio · Hoy · Listas · Por confirmar · Vencidas.

## Parte 1 — Auto-cierre transaccional

### Función de Postgres (migración)

`conclude_service_visit(p_visit_id uuid, p_ended_at timestamptz, p_notes text, p_intake_notes text)` —
`SECURITY INVOKER` (respeta RLS del usuario que llama). En una sola transacción:

1. `UPDATE service_visits SET ended_at = p_ended_at, status = 'completed' WHERE id = p_visit_id`
   (RLS garantiza tenant; si no afecta filas, la cita/servicio no es del tenant → el
   llamador lo trata como error/no encontrado).
2. `UPDATE grooming_records` — fija `notes`/`intake_notes` solo cuando el parámetro NO es
   null (null = "no cambiar"): `SET notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END`, ídem `intake_notes`.
3. Cerrar la cita ligada **solo si no queda otro servicio en curso**:
   ```sql
   UPDATE appointments a SET status = 'completed'
   WHERE a.id = (SELECT appointment_id FROM service_visits WHERE id = p_visit_id)
     AND NOT EXISTS (
       SELECT 1 FROM service_visits sv2
       WHERE sv2.appointment_id = a.id AND sv2.id <> p_visit_id AND sv2.status = 'in_progress'
     );
   ```
   (Si la visita no tiene `appointment_id`, el subquery da null → no actualiza nada.)

Como es el cuerpo de una función, las tres operaciones son atómicas: si una falla, se
revierte todo.

### Endpoint

`PATCH /api/servicios/estetica/[id]`:
- Cuando el body trae `ended_at` (caso "concluir"): invocar `supabase.rpc('conclude_service_visit', { p_visit_id, p_ended_at, p_notes, p_intake_notes })`. Si hay error → 500 (nada se commitió). Tras el RPC, re-seleccionar la visita con sus embeds para devolver la misma forma de respuesta que hoy.
- Cuando NO trae `ended_at` (editar notas / set started_at sin concluir): conservar el
  camino actual de updates directos.
- Mantener el invariante existente "la sesión ya fue concluida" (409 si `ended_at` ya
  estaba).

### Cliente

`GroomingPanel.handleConcludeSession`: **eliminar** la 2ª llamada
`PATCH /api/appointments/:id { status: 'completed' }` — el cierre lo hace el servidor.
El resto del flujo (toast, `onClose`, `onRefresh`) se mantiene.

## Parte 2 — Citas vencidas (derivadas)

### Helper

Nuevo `lib/utils/appointment-overdue.ts`:

```ts
export const OVERDUE_GRACE_MINUTES = 30

export function isOverdue(
  scheduledAt: string,
  durationMinutes: number | null | undefined,
  status: string,
  now: number = Date.now(),
): boolean {
  if (status !== 'scheduled' && status !== 'confirmed') return false
  const endMs = new Date(scheduledAt).getTime()
    + (durationMinutes ?? 0) * 60_000
    + OVERDUE_GRACE_MINUTES * 60_000
  return now > endMs
}
```

### Dashboard

- **Query de backlog** (en `app/dashboard/page.tsx`): citas con `status in ('scheduled','confirmed')`,
  `scheduled_at < todayStart` (días anteriores) y `scheduled_at >= now - 60 días` (cota
  inferior para no crecer sin límite), orden `scheduled_at` desc. Todas estas son vencidas
  por definición (día previo + gracia), así que no requieren filtro JS adicional.
- **Sección "Vencidas"** (en `DashboardHome`): se renderiza al final
  (Activos → Hoy → Próximas → **Vencidas**), con acento naranja (color de `no_show`). Si
  el backlog está vacío, no se renderiza. Cada cita usa `DashboardAppointmentCard` con la
  nueva prop `overdue` y `variant="upcoming"` (muestra fecha+hora porque son de otros días).
- **Badge en hoy:** en "Citas de hoy", las citas con `isOverdue(...)` true reciben el badge
  "Vencida". Se calcula en `DashboardHome` con `Date.now()` al render (aceptable; no es un
  contador en vivo).
- **Resolución:** click en cualquier cita (hoy vencida o backlog) abre
  `AppointmentDetailDialog` con sus transiciones (Completar / No se presentó / Cancelar);
  al resolver, `router.refresh()`.

### Tarjeta

`DashboardAppointmentCard`: nueva prop opcional `overdue?: boolean`. Cuando es true,
muestra un badge "Vencida" (naranja, mismo lenguaje que `no_show`) junto a los demás
chips, y un acento naranja sutil en el borde/stripe. No reemplaza al status pill (la cita
sigue siendo scheduled/confirmed).

### Métricas

`MetricsStrip` pasa a 5 indicadores: **En servicio · Hoy · Listas · Por confirmar ·
Vencidas**. `Vencidas` = tamaño del backlog de días anteriores (consistente con la
sección). Se calcula en `page.tsx` como `overdueBacklog.length`.

## Manejo de errores

- **Auto-cierre:** transaccional vía RPC. Si el RPC falla, el endpoint responde 500 y
  **nada** se commitió (ni el cierre del servicio ni de la cita). El cliente muestra el
  toast de error existente.
- **Query de backlog:** si falla, la sección "Vencidas" se trata como vacía (no rompe el
  dashboard); la métrica Vencidas muestra 0.

## Fuera de alcance (YAGNI)

- Auto-marcado de `no_show` por proceso programado (se decidió explícitamente NO hacerlo).
- Vencidas en la agenda/calendario (esta iteración es el dashboard; el badge derivado
  podría reutilizarse ahí después).
- Cambios al enum de status o nuevas columnas.
- Manejo de vencidas para tipos de servicio distintos a estética en el cierre (el RPC es
  genérico sobre `service_visits`, pero hoy solo estética concluye por este endpoint).

## Testing

Sin tests automatizados (preferencia del proyecto). Verificación manual:
1. Iniciar y concluir una sesión de estética **desde el modal de detalle** (lista/banda) →
   la cita ligada queda `completed` (antes se quedaba `confirmed`).
2. Concluir desde el panel de cita → sigue cerrando la cita (ahora server-side, sin la 2ª
   llamada).
3. Una cita de un día anterior en `confirmed` aparece en la sección "Vencidas" y se puede
   resolver con el diálogo de detalle; al marcarla, desaparece del backlog y la métrica baja.
4. Una cita de hoy cuya ventana + 30 min ya pasó muestra el badge "Vencida" dentro de
   "Citas de hoy".

## Archivos

**Nuevos**
- `supabase/migrations/<ts>_conclude_service_visit_fn.sql` (función RPC)
- `lib/utils/appointment-overdue.ts` (helper + constante)

**Modificados**
- `app/api/servicios/estetica/[id]/route.ts` (camino "concluir" → RPC)
- `components/appointments/panels/GroomingPanel.tsx` (quitar 2ª llamada de cierre)
- `app/dashboard/page.tsx` (query backlog vencidas + métrica)
- `components/dashboard/DashboardHome.tsx` (sección Vencidas + badge hoy + orden)
- `components/dashboard/DashboardAppointmentCard.tsx` (prop `overdue`)
- `components/dashboard/MetricsStrip.tsx` (5º indicador "Vencidas")
