# Dashboard como tablero operativo — Diseño

**Fecha:** 2026-06-02
**Estado:** Aprobado (diseño) — pendiente plan de implementación

## Problema

El dashboard de inicio hoy solo muestra citas (hoy + próximas) en un layout de dos
columnas, con una columna lateral de métricas y "Módulos". No refleja **lo que está
pasando en este momento en la clínica**: las mascotas que están físicamente siendo
atendidas (sesiones de estética en curso, y a futuro cirugía/hospitalización/guardería).

Además, los "Módulos" de la columna lateral duplican la navegación del sidebar global.

## Objetivo

Convertir el dashboard en un **tablero operativo** que responda primero "¿qué está
pasando ahora?", manteniendo la agenda como apoyo. El diseño debe ser **genérico sobre
`service_visits`**: hoy lo llena estética, y los demás servicios entran sin rehacer el
dashboard.

## Decisiones (del brainstorming)

1. **Servicio activo = cualquier `service_visit` con `status = 'in_progress'`** (genérico,
   no solo estética).
2. **Jerarquía:** tablero operativo — servicios activos prominentes arriba, luego citas
   de hoy, luego próximas.
3. **Tarjeta de servicio activo:** informativa; el click abre el modal de Detalle (donde
   ya se finaliza el servicio). Una sola fuente de verdad para finalizar.
4. **Layout:** a todo el ancho, apilado. Se eliminan la columna lateral y los "Módulos"
   (redundantes con el sidebar global). Las métricas pasan a una tira horizontal superior
   que incluye "En servicio".
5. **CTAs:** Nueva Cita, Nueva Consulta, Nuevo Servicio de Estética (rediseñados; crecerán
   conforme se implementen más servicios).
6. **Tratamiento visual de servicios activos:** banda "hero" (fondo sutil, borde de
   acento, punto pulsante por tarjeta). Cuando no hay activos, colapsa a una línea
   discreta y el dashboard se siente como agenda.

## Estructura de la página (orden vertical)

```
┌───────────────────────────────────────────────┐
│ Saludo (fecha + "Buenas tardes, Nombre")        │
├───────────────────────────────────────────────┤
│ CTAs:  [Nueva Cita] [Nueva Consulta] [Estética] │
├───────────────────────────────────────────────┤
│ Métricas:  En servicio · Hoy · Listas · Confirm.│
├───────────────────────────────────────────────┤
│ SERVICIOS ACTIVOS  (banda hero)                 │
│   • Firulais (Perro) · Estética · Baño, Corte   │
│     ● 23 min en curso                           │
│   • …                                           │
│   (vacío → "Sin servicios en curso")            │
├───────────────────────────────────────────────┤
│ Citas de hoy   (lista)                          │
├───────────────────────────────────────────────┤
│ Próximas citas (lista)                          │
└───────────────────────────────────────────────┘
```

Se mantiene el contenedor `max-w-5xl mx-auto` del layout.

## Componentes

Se reemplaza `DashboardTwoColumn` por `DashboardHome` (orquestador, client). Se extraen
piezas con responsabilidad única:

| Componente | Tipo | Responsabilidad |
|---|---|---|
| `DashboardHome` | client | Orquesta el layout apilado; mantiene estado de modales (cita/estética/detalle) y `router.refresh`. |
| `DashboardCTAs` | client | Fila de 3 CTAs rediseñados; dispara modales/navegación. |
| `MetricsStrip` | server-friendly | Tira horizontal de 4 métricas (datos por props). |
| `ActiveServicesBand` | client | Lista de servicios activos; cronómetro en vivo + poll; click → detalle. Colapsa cuando está vacía. |

**Tarjeta de cita:** ya existe `DashboardAppointmentCard` (reutilizable) pero hoy
`DashboardTwoColumn` usa markup inline **duplicado** para "hoy" y "próximas". Se
**consolida en `DashboardAppointmentCard`**, extendiéndolo con props opcionales para
preservar el comportamiento actual: `variant: 'today' | 'upcoming'` (hoy muestra solo
hora; próximas, fecha+hora), `isNext` (badge "Siguiente"), `dimmed` (citas en estado
terminal atenuadas) y `inService` (micro-badge "en servicio"). `DashboardHome` lo usa en
ambas listas. Esto elimina la duplicación en vez de crear un componente nuevo.

Se reutilizan: `GroomingSessionDetailModal` (detalle + finalizar), `NewAppointmentModal`,
`GroomingSessionModal`, `serviceTypeConfig`, `APPOINTMENT_STATUS_CONFIG`,
`DashboardAppointmentCard`.

## Datos

### Servicios activos (nuevo)

Endpoint **`GET /api/service-visits/active`**:
- Auth + tenant scoping (igual que las demás rutas: `user_profiles.tenant_id`).
- Query: `service_visits` con `status = 'in_progress'`, `tenant_id = <tenant>`, ordenado
  por `started_at` asc.
- Embeds: `pet:pet_id(id, name, species:species_id(name))` y, para estética,
  `record:grooming_records(notes, intake_notes, services:grooming_record_services(id, service_name))`.
  Para tipos sin servicios, los campos quedan nulos/vacíos (tolerante).
- Respuesta por item: `{ id, service_type, started_at, pet, services: [{id, service_name}], intake_notes }`.

El **server component** (`app/dashboard/page.tsx`) ejecuta esta misma query para sembrar
los datos iniciales (sin esperar al cliente). El `ActiveServicesBand` recibe `initial` por
props y luego hace poll al endpoint cada ~60s; el cronómetro se actualiza cada 30s con
estado de reloj local (mismo patrón que `GroomingSessionDetailModal`, sin `setState`
síncrono en efecto ni `Date.now()` en render).

### Métricas

Derivadas en el server component:
- **En servicio:** número de `service_visits` in_progress (del query anterior).
- **Hoy:** total de citas del día (como hoy).
- **Listas:** citas `completed` hoy.
- **Por confirmar:** citas `scheduled` hoy.

### Citas

Sin cambios en el origen: misma query de `appointments` del día y próximas (5). Se
conserva el filtrado por `assigned_to` para rol `doctor` cuando aplica.

## Interacción / flujo

- **Click en tarjeta activa** → `GroomingSessionDetailModal` (hoy estética). Al finalizar,
  `onFinalized` → `router.refresh()` + re-poll, la tarjeta desaparece de la banda.
- **CTAs:** Nueva Cita (`NewAppointmentModal`) y Nuevo Servicio de Estética
  (`GroomingSessionModal`) abren modales; al éxito → `router.refresh()`. Nueva Consulta
  navega a `/dashboard/records/new`.
- **Cita con servicio en curso:** micro-badge "en servicio" en su `AppointmentRow`
  (nice-to-have; se calcula cruzando `appointment_id` de los activos). Si añade
  complejidad, se omite en la primera versión.

## Manejo de errores

- Query de activos o citas falla en el server → la sección renderiza su estado vacío /
  fallback discreto; no se rompe el dashboard.
- Poll del cliente falla → se conserva el último dato (no se vacía la banda).
- Modal de detalle: errores de red ya manejados con `toast` (existente).

## Estados vacíos

- **Sin servicios activos:** banda colapsada a una línea ("Sin servicios en curso").
- **Sin citas hoy:** estado vacío existente (ícono + "No hay citas para hoy").
- **Sin próximas:** la sección no se renderiza (como hoy).

## Fuera de alcance (YAGNI)

- Detalle/finalización de tipos de servicio distintos a estética (entran cuando se
  implementen esos servicios; la banda ya los listará genéricamente).
- Realtime por websockets (el poll ligero es suficiente).
- Reordenar/priorizar servicios activos manualmente.
- Métricas históricas o gráficas.

## Testing

Por preferencia del proyecto se omite escribir/correr tests automatizados en esta
iteración. Verificación manual: iniciar una sesión de estética desde una cita y
confirmar que aparece en la banda con cronómetro; finalizar desde el detalle y confirmar
que desaparece y que las métricas se actualizan; dashboard sin servicios activos muestra
la línea discreta.

## Archivos

**Nuevos**
- `app/api/service-visits/active/route.ts`
- `components/dashboard/DashboardHome.tsx`
- `components/dashboard/DashboardCTAs.tsx`
- `components/dashboard/MetricsStrip.tsx`
- `components/dashboard/ActiveServicesBand.tsx`

**Modificados**
- `app/dashboard/page.tsx` (query de activos + métricas; usa `DashboardHome`)
- `components/dashboard/DashboardAppointmentCard.tsx` (props `variant`/`isNext`/`dimmed`/`inService`)

**Eliminados / reemplazados**
- `components/dashboard/DashboardTwoColumn.tsx` (reemplazado por `DashboardHome`)
