# Pulido de Hotel — salidas y check-out vencido — Diseño

**Fecha:** 2026-06-02
**Estado:** SUPERSEDED — fusionado en `2026-06-02-hotel-stay-page-design.md` (página de estancia + pulido). No implementar desde aquí.

## Objetivo

Mejorar la visibilidad operativa de las estancias de Hotel (boarding) en curso:
1. **Salida esperada en la banda de activos** del dashboard.
2. **Check-out vencido**: marcar estancias en curso cuya salida esperada ya pasó.
3. **Salidas de hoy**: cuántas estancias deben hacer check-out hoy.

Fuera de alcance: render multi-día en el calendario (decidido).

## Decisiones (del brainstorming)

- Los conteos de Hotel van en un **chip/mini-sección propio** en el dashboard (no en la tira de métricas general).
- "Salida vencida" es **derivada** (no almacenada): estancia `in_progress` (con `started_at`, sin `ended_at`) cuya `expected_check_out` < ahora.
- "Salidas de hoy" = estancias `in_progress` con `expected_check_out` en la fecha de hoy.

## Base: `expected_check_out` en los servicios activos

Hoy `GET /api/service-visits/active` y la query de activos en `app/dashboard/page.tsx`
embeben solo `record:grooming_records(...)`. Se agrega un segundo embed
`boarding:boarding_records(expected_check_out)` y se mapea `expected_check_out` en el item.
(PostgREST resuelve ambos embeds; para visitas no-boarding queda `null`.)

- `ActiveServiceItem` (en `ActiveServicesBand`) gana `expected_check_out: string | null`.

## Helper

Nuevo `lib/utils/boarding.ts`:

```ts
export function isCheckoutOverdue(
  expectedCheckOut: string | null,
  startedAt: string | null,
  endedAt: string | null,
  now: number = Date.now(),
): boolean {
  if (endedAt || !startedAt || !expectedCheckOut) return false
  return now > new Date(expectedCheckOut).getTime()
}

export function isCheckoutToday(
  expectedCheckOut: string | null,
  now: number = Date.now(),
): boolean {
  if (!expectedCheckOut) return false
  const d = new Date(expectedCheckOut)
  const n = new Date(now)
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}
```

## UI

### Banda de servicios activos (`ActiveServicesBand`)
- Tarjetas de Hotel: la etiqueta pasa de **"Día N"** a **"Día N · sale {fecha corta}"**
  (`expected_check_out`). Si no hay `expected_check_out`, solo "Día N".
- **Salida vencida:** si `isCheckoutOverdue(item.expected_check_out, item.started_at, item.ended_at, now)`
  (usa el estado `now` en vivo que ya tiene la banda), la etiqueta se muestra en **naranja**
  con texto "Salida vencida" (en vez del amber "Día N · sale…").

### Chip "Hotel" en el dashboard (`DashboardHome`)
- Una línea compacta **arriba de la banda de activos**: `🛏 {N} salen hoy · {M} salida(s) vencida(s)`
  (con ícono `BedDouble`). Se **oculta** si `N === 0 && M === 0`.
- Conteos calculados **server-side** en `page.tsx` (evita `Date.now()` en el render del cliente):
  - `checkoutsToday` = activos boarding con `isCheckoutToday`.
  - `lateCheckouts` = activos boarding con `isCheckoutOverdue`.
  - Se pasan como prop `hotelCounts: { checkoutsToday: number; lateCheckouts: number }`.
- Texto adaptativo: si solo hay uno de los dos, muestra solo ese segmento; singular/plural simple.

### Tabla (`BoardingStaysTable`) y detalle (`BoardingStayDetailModal`)
- En estancias **en curso** con salida vencida: badge naranja **"Salida vencida"** junto al
  estado (tabla) y junto al "Día N de M" (detalle). Usa `isCheckoutOverdue` (con `Date.now()`,
  patrón ya usado en esos componentes client).

## Manejo de errores / estados

- Si `expected_check_out` es `null` (estancia sin salida planeada): no se marca vencida ni
  cuenta en "salen hoy"; la banda muestra solo "Día N".
- El chip y los badges son derivados; no hay escritura ni migración.

## Fuera de alcance (YAGNI)

- Render multi-día en el calendario.
- Auto-acciones sobre check-outs vencidos (solo señalización; el check-out sigue siendo manual).
- Tarifa por noche / facturación.

## Testing

Sin tests automatizados. Verificación manual:
1. Crear reserva de Hotel con salida hoy → check-in → la banda muestra "Día 1 · sale {hoy}"; el
   chip muestra "1 sale hoy".
2. Crear/forzar una estancia con `expected_check_out` en el pasado → la banda, la tabla y el
   detalle muestran "Salida vencida"; el chip muestra "1 salida vencida".
3. Sin estancias con salida hoy/vencida → el chip no aparece.

## Archivos

**Nuevos**
- `lib/utils/boarding.ts`

**Modificados**
- `app/api/service-visits/active/route.ts` (embed boarding_records + map `expected_check_out`)
- `app/dashboard/page.tsx` (embed + map en initialActiveServices; calcular `hotelCounts`; pasar prop)
- `components/dashboard/ActiveServicesBand.tsx` (`ActiveServiceItem.expected_check_out`; etiqueta "sale {fecha}" + salida vencida)
- `components/dashboard/DashboardHome.tsx` (prop `hotelCounts` + chip Hotel)
- `components/servicios/BoardingStaysTable.tsx` (badge salida vencida)
- `components/servicios/BoardingStayDetailModal.tsx` (badge salida vencida)
