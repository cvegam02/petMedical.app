# VeterinaIAs — Vista de Calendario en Citas

**Fecha:** 2026-05-28
**Alcance:** Plan Individual únicamente (Plan Empresa con columnas por doctor queda fuera de scope)

---

## Resumen

Agregar una vista de calendario (semana y mes) a la página de citas existente (`/dashboard/appointments`). La vista de lista actual se conserva. Un toggle Lista/Calendario permite cambiar entre ambas. El calendario es de solo lectura — la creación de citas sigue siendo siempre desde el botón "Nueva cita".

---

## Contexto

La página `/dashboard/appointments` ya tiene:
- Vista de lista con tabs: Hoy / Próximas / Por confirmar
- Modal "Nueva cita" (botón en header)
- Cards de cita con link al detalle

Lo que se agrega en este diseño es una segunda vista (Calendario) que convive con la lista mediante un toggle en la URL.

---

## 1. Estructura de la página y toggle

El toggle vive como query param: `?vista=lista` (default) y `?vista=calendario`. Esto hace la URL compartible y el estado sobrevive un refresh.

- `?vista=lista` → comportamiento actual sin cambios (tabs + lista de cards)
- `?vista=calendario` → muestra `CalendarView`, oculta los tabs

El toggle se renderiza como dos botones icon+label (`☰ Lista` / `□ Calendario`) en el header de la página, a la izquierda del botón "Nueva cita". Son links `<Link href="...?vista=...">` (sin estado client, el Server Component ya sabe qué renderizar).

Cuando `vista=calendario` los tabs (Hoy / Próximas / Por confirmar) se ocultan — no tienen sentido en la vista de calendario.

---

## 2. API — soporte de rango de fechas

**Archivo:** `app/api/appointments/route.ts`

Se agregan dos query params opcionales al `GET`:

```
GET /api/appointments?from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z
```

Regla: si `from` y `to` están presentes, se ignora `tab` y se filtra por ese rango. La lógica de tabs existente no cambia.

```typescript
const from = req.nextUrl.searchParams.get('from')
const to = req.nextUrl.searchParams.get('to')

if (from && to) {
  query = query
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)
} else {
  // lógica de tab existente sin cambios
}
```

Sin cambios en el esquema de base de datos ni en RLS.

---

## 3. CalendarView — componente principal

**Archivo:** `components/appointments/CalendarView.tsx`
**Tipo:** Client Component (`'use client'`)
**Librería:** `react-big-calendar` con adaptador `date-fns`

### Props

```typescript
interface CalendarViewProps {
  businessHours: BusinessHoursConfig // { start: string, end: string, slot_interval: number, days: number[] }
}
// BusinessHoursConfig viene de lib/utils/time-slots.ts
// start y end son strings "HH:mm" (e.g. "09:00", "18:00")
```

`businessHours` lo pasa el Server Component desde `tenant.settings.business_hours` (ya disponible en `page.tsx`).

### Comportamiento

1. **Estado inicial:** vista de semana (`week`), semana actual
2. **Vistas disponibles:** `week` y `month` — el usuario puede alternar con los controles nativos de react-big-calendar
3. **Fetch de datos:** al montar y en cada `onRangeChange` (navegación entre semanas/meses), llama a `GET /api/appointments?from=&to=` con el rango visible. Resultado guardado en `useState`
4. **Horario visible (vista semana):** de `businessHours.start` a `businessHours.end` — se parsea el string "HH:mm" a un objeto `Date` para pasarlo a react-big-calendar como `min` y `max`
5. **Locale:** español (usando `date-fns/locale/es` + `localizer` de react-big-calendar)
6. **Slots vacíos:** no hacen nada al clic (`selectable={false}`)

### Renderizado de eventos

Componente propio para cada evento:

```
[● Firulais · Perro]      ← nombre mascota + especie, punto de color por status
```

Colores por status (alineados con los que usa `AppointmentCard`):
- `scheduled` → muted (gris)
- `confirmed` → primary (verde/azul del tenant)
- `completed` → primary oscuro
- `cancelled` → destructive (rojo)
- `no_show` → naranja

### Clic en evento

Abre `AppointmentPopover` anclado al elemento del evento. El popover recibe el objeto de la cita como prop.

---

## 4. AppointmentPopover

**Archivo:** `components/appointments/AppointmentPopover.tsx`
**Tipo:** Client Component
**Librería:** Base UI Popover — ya disponible en `components/ui/popover.tsx` (`@base-ui/react/popover`)

### Contenido

```
[Nombre mascota]  [especie]          [badge status]
Dueño: [nombre]
[fecha larga]  ·  [hora] · [duración]min
[motivo si existe]

[Botón "Ver detalle" → /dashboard/appointments/${id}]
```

El popover se cierra al hacer clic fuera o al presionar Escape.

---

## 5. Mapa de archivos

### Nuevos
```
components/appointments/CalendarView.tsx
components/appointments/AppointmentPopover.tsx
```

### Modificados
```
app/api/appointments/route.ts          # Agregar soporte ?from= & ?to=
app/dashboard/appointments/page.tsx   # Toggle + render condicional + pasar businessHours
```

### Dependencias nuevas
```
react-big-calendar
@types/react-big-calendar
date-fns                               # ya instalado (v4.3.0)
```

---

## 6. Flujo de datos

```
page.tsx (Server)
  └─ lee ?vista del searchParam
  └─ si vista=lista → renderiza tabs + lista (comportamiento actual)
  └─ si vista=calendario →
       └─ lee tenant.settings.business_hours
       └─ renderiza CalendarView con businessHours
            └─ monta → fetch /api/appointments?from=&to= (rango de semana actual)
            └─ usuario navega → onRangeChange → nuevo fetch
            └─ clic en evento → AppointmentPopover
                 └─ "Ver detalle" → /dashboard/appointments/[id]
```

---

## 7. Lo que no incluye este diseño

- Creación de citas desde slots del calendario (YAGNI — siempre desde "Nueva cita")
- Columnas por doctor (Plan Empresa — fuera de scope)
- Integración con Google Calendar (Plan futuro)
- Drag & drop para re-agendar citas
- Vista de día (`day`) — solo semana y mes
