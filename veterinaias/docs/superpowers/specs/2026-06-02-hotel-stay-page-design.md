# Hotel — página de estancia + pulido de salidas — Diseño

**Fecha:** 2026-06-02
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Reemplaza:** `2026-06-02-hotel-checkout-polish-design.md` (fusionado aquí).

## Objetivo

1. **Página de estancia** dedicada (`/dashboard/servicios/hotel/[id]`) con vista de **línea de
   tiempo día por día** de la estancia y **bitácora editable por día**, en vez del modal
   pequeño (para la tabla de Hotel).
2. **Pulido de salidas**: salida esperada visible en la banda de activos, **check-out vencido**
   señalizado, y un **chip "Hotel"** en el dashboard con salidas de hoy/vencidas.

## Decisiones (del brainstorming)

- Vista de la página: **línea de tiempo día por día** (una fila por día de la estancia).
- Bitácora: **una entrada por día, editable (upsert)** — `UNIQUE(visit_id, log_date)`.
- Días editables: **solo hasta hoy** (pasados + hoy editables; futuros visibles pero deshabilitados).
- Navegación: **la tabla de Hotel navega a la página**; la **banda del dashboard conserva el
  modal** (`BoardingStayDetailModal`) como vista rápida.
- Conteos de Hotel: **chip propio** en el dashboard (no en la tira de métricas).
- "Salida vencida" y "salida de hoy" son **derivadas** (no almacenadas).

## Datos

- `boarding_daily_logs` gana **`UNIQUE(visit_id, log_date)`** (migración; dedup previo
  conservando la entrada más reciente por día si hubiera duplicados).
- `boarding_records.expected_check_out` ya es `timestamptz` (existe). El "día" de la bitácora
  es `log_date` (date).

## Helper

Nuevo `lib/utils/boarding.ts`:

```ts
export function isCheckoutOverdue(
  expectedCheckOut: string | null, startedAt: string | null, endedAt: string | null,
  now: number = Date.now(),
): boolean {
  if (endedAt || !startedAt || !expectedCheckOut) return false
  return now > new Date(expectedCheckOut).getTime()
}

export function isCheckoutToday(expectedCheckOut: string | null, now: number = Date.now()): boolean {
  if (!expectedCheckOut) return false
  const d = new Date(expectedCheckOut); const n = new Date(now)
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

/** Fechas (YYYY-MM-DD) de la estancia, de la entrada al fin del rango, inclusivo. */
export function stayDays(startedAt: string | null, endDateMs: number): string[] {
  if (!startedAt) return []
  const start = new Date(startedAt); start.setHours(0, 0, 0, 0)
  const end = new Date(endDateMs); end.setHours(0, 0, 0, 0)
  const out: string[] = []
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const d = new Date(t)
    const pad = (n: number) => String(n).padStart(2, '0')
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }
  return out
}
```

## API

- `app/api/servicios/hotel/[id]/daily-logs/route.ts`:
  - `POST` pasa a **upsert** por `(visit_id, log_date)` (`.upsert(row, { onConflict: 'visit_id,log_date' })`).
    Body: `log_date` (requerido para upsert determinista; si falta, hoy), `notes`, `fed`, `walked`.
  - `GET` sin cambios (lista por visit_id).
- `app/api/servicios/hotel/[id]/route.ts` (GET single) sin cambios (ya devuelve la estancia completa).
- `app/api/service-visits/active/route.ts` y la query de activos en `app/dashboard/page.tsx`:
  agregar embed `boarding:boarding_records(expected_check_out)` y mapear `expected_check_out`
  en el item (null para no-boarding).

## UI

### Página `/dashboard/servicios/hotel/[id]`
- `app/dashboard/servicios/hotel/[id]/page.tsx` (server) → renderiza `BoardingStayDetail` (client) con `visitId={id}`.
- `components/servicios/BoardingStayDetail.tsx` (client): al montar carga la estancia
  (`GET /api/servicios/hotel/[id]`) y la bitácora (`GET .../daily-logs`).
  - **Header:** nombre + especie, estado, "Día N de M" (con `expected_check_out`), badge
    **"Salida vencida"** si `isCheckoutOverdue`, y link "← Hotel".
  - **Recepción:** salida esperada (fecha+hora), alimentación, pertenencias, cuidados.
  - **Línea de tiempo:** `stayDays(started_at, endMs)` donde `endMs` = fecha de `ended_at` si
    existe; si no, `max(expected_check_out, hoy)`; si no hay expected, hoy. Una fila por día:
    fecha + día de semana, **hoy resaltado**. Para días `<= hoy`: bitácora **editable** (notas
    + alimentó + paseó) con botón Guardar (upsert vía POST con ese `log_date`). Días futuros:
    se muestran deshabilitados. La fila precarga el log existente de ese día (si lo hay).
  - **Check-out** (si en curso): notas finales + botón (PATCH `/api/servicios/hotel/[id]`).
- La página vive dentro del layout del dashboard (sidebar/topbar). Contenedor `max-w-3xl`.

### Tabla de Hotel (`BoardingStaysTable`)
- Las filas **navegan** a `/dashboard/servicios/hotel/[id]` (Link / router) en vez de abrir el
  modal. Se elimina el uso del modal aquí (y su estado en este componente).
- Badge **"Salida vencida"** (naranja) en filas en curso con `isCheckoutOverdue`.

### Banda de activos (`ActiveServicesBand`) — conserva su modal
- `ActiveServiceItem` gana `expected_check_out: string | null`.
- Tarjetas de Hotel: etiqueta **"Día N · sale {fecha}"**; si `isCheckoutOverdue` (usando el
  `now` en vivo) → **naranja "Salida vencida"**.
- El click sigue abriendo `BoardingStayDetailModal` (vista rápida); se le agrega el badge
  "Salida vencida" para consistencia.

### Chip "Hotel" en el dashboard (`DashboardHome`)
- Línea compacta arriba de la banda: `🛏 {N} salen hoy · {M} salida(s) vencida(s)` (ícono
  `BedDouble`); se oculta si ambos son 0. Conteos calculados **server-side** en `page.tsx`
  (`isCheckoutToday` / `isCheckoutOverdue` sobre los activos boarding) y pasados como
  `hotelCounts: { checkoutsToday: number; lateCheckouts: number }`.

## Manejo de errores / estados

- `expected_check_out` null: no se marca vencida ni cuenta en "salen hoy"; el rango de la
  línea de tiempo llega hasta hoy.
- Upsert de bitácora: si falla → toast de error; la fila conserva lo editado.
- Cargas que fallan en la página → estado de error/vacío, no rompe.

## Fuera de alcance (YAGNI)

- Render multi-día en el calendario general (agenda).
- Tarifa por noche / facturación.
- Quitar el modal de la banda (se conserva a propósito).

## Testing

Sin tests automatizados. Verificación manual:
1. Tabla de Hotel → click en una estancia → navega a la página; se ve la línea de tiempo de
   días (hoy resaltado) y la recepción.
2. Llenar la bitácora de hoy (notas + alimentó/paseó) → Guardar → persiste; recargar la
   página mantiene el dato; un día futuro está deshabilitado.
3. Estancia con salida en el pasado → badge "Salida vencida" en la página, la tabla y la
   banda; el chip del dashboard la cuenta.
4. Estancia con salida hoy → chip "1 sale hoy"; banda muestra "Día N · sale hoy".
5. Check-out desde la página → estancia finalizada.

## Archivos

**Nuevos**
- `supabase/migrations/<ts>_boarding_daily_log_unique.sql`
- `lib/utils/boarding.ts`
- `app/dashboard/servicios/hotel/[id]/page.tsx`
- `components/servicios/BoardingStayDetail.tsx`

**Modificados**
- `app/api/servicios/hotel/[id]/daily-logs/route.ts` (POST → upsert)
- `app/api/service-visits/active/route.ts` (embed boarding_records + map)
- `app/dashboard/page.tsx` (map `expected_check_out` en activos + `hotelCounts`)
- `components/dashboard/ActiveServicesBand.tsx` (tipo + etiqueta "sale {fecha}" + salida vencida)
- `components/dashboard/DashboardHome.tsx` (chip Hotel + prop `hotelCounts`)
- `components/servicios/BoardingStaysTable.tsx` (navegar a página + badge salida vencida)
- `components/servicios/BoardingStayDetailModal.tsx` (badge salida vencida; sigue usándose en la banda)
