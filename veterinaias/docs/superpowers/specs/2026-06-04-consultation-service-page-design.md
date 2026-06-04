# Página de Consultas — Diseño

**Fecha:** 2026-06-04
**Estado:** Aprobado — pendiente plan de implementación

---

## Objetivo

Agregar `/dashboard/servicios/consulta` al sidebar de Servicios para que el staff pueda listar, filtrar y acceder rápidamente a las consultas médicas del tenant, y lanzar nuevas consultas walk-in desde un punto central.

---

## Decisiones

1. **Solo lista + acceso al expediente existente.** Sin modal de detalle nuevo — click en fila navega a `/dashboard/pets/[petId]/records/[recordId]` (página ya construida). El `recordId` es el `service_visit.id`.
2. **Filtros client-side controlados:** dropdown de veterinario + rango de fecha. Al cambiar → re-fetch al API con query params.
3. **Límite 100 registros, sin paginación en v1** (YAGNI).
4. **CTA "Nueva consulta"** → link a `/dashboard/records/new` (walk-in existente, no hay que construir nada nuevo).
5. **Sidebar:** ícono `Stethoscope`, label `"Consultas"`, ruta `/dashboard/servicios/consulta`.
6. **Server + client híbrido:** el page server component carga el team (para el dropdown) y lo pasa como prop; `ConsultationList` es client y maneja filtros + fetch de la lista.

---

## API

### `GET /api/servicios/consulta`

**Auth:** mismo patrón que todos los servicios — user → profile → tenant_id.

**Query params opcionales:**
- `vet=<userId>` — filtrar por veterinario que atendió (campo `attended_by` en `consultation_records`)
- `from=<YYYY-MM-DD>` — desde esta fecha (inclusive), filtrado por `service_visits.created_at`
- `to=<YYYY-MM-DD>` — hasta esta fecha (inclusive)

**Query base:**
```
service_visits
  WHERE tenant_id = <tenant>
  AND   service_type = 'consultation'
  ORDER BY created_at DESC
  LIMIT 100
```

**Embeds:**
```
pet:pet_id(id, name, species:species_id(name))
owner:owner_id(id, full_name)
record:consultation_records(attended_by, reason, diagnosis, vet_profile:attended_by(id, full_name))
```

**Respuesta mapeada por fila:**
```
{
  id,           -- service_visit.id (= recordId para navegación)
  created_at,
  pet: { id, name, species: { name } },
  owner: { id, full_name },
  reason,       -- consultation_records.reason
  diagnosis,    -- consultation_records.diagnosis
  attended_by_name  -- full_name del veterinario (de vet_profile)
}
```

**Filtro de vet:** se aplica en el servidor tras el fetch (no en la query Supabase) — dado el límite de 100 filas es suficientemente eficiente para v1.

---

## UI

### `app/dashboard/servicios/consulta/page.tsx` (server)

Carga el team (`user_profiles` del tenant, rol ≠ `assistant`, ordenado por `full_name`) y renderiza:

```tsx
<ConsultationList team={team} />
```

Encabezado de página estándar: ícono `Stethoscope`, título "Consultas", descripción "Historial de consultas médicas del tenant", botón "Nueva consulta" → link a `/dashboard/records/new`.

### `components/servicios/ConsultationList.tsx` (client)

**Props:** `team: { id: string; full_name: string }[]`

**Estado:**
- `selectedVet: string` ('' = todos)
- `fromDate: string`, `toDate: string`
- `rows: ConsultationRow[]`
- `loading: boolean`

**Filtros (encima de la tabla):**
- Select de veterinario (opciones: "Todos los veterinarios" + team)
- Input `date` "Desde" y "Desde" "Hasta"
- Cambio en cualquier filtro → `load()` con los params actuales

**Tabla:**
| Fecha | Mascota | Especie | Dueño | Motivo | Veterinario |
|-------|---------|---------|-------|--------|-------------|

Click en fila → `router.push('/dashboard/pets/${row.pet.id}/records/${row.id}')`.

**Estado vacío:** `Stethoscope` icon + "No hay consultas registradas" + link "Registrar consulta".

### Sidebar

En `components/dashboard/SidebarNav.tsx`, agregar a `SERVICES_NAV_ITEMS`:

```typescript
{ href: '/dashboard/servicios/consulta', icon: Stethoscope, label: 'Consultas' }
```

`Stethoscope` ya está importado (se usa en `service-type.ts`).

---

## Manejo de errores

- Error en el fetch de lista → la tabla muestra estado vacío con mensaje genérico; no rompe la página.
- El filtro de fecha "hasta" incluye el día completo (añadir T23:59:59 al query).

---

## Fuera de alcance (YAGNI)

- Paginación (límite 100 es suficiente para v1).
- Búsqueda por nombre de mascota.
- Exportar a CSV / PDF.
- Crear consulta con cita desde esta página (ya existe el flujo de agenda + ConsultationPanel).

---

## Testing

Sin tests automatizados (preferencia del proyecto). Verificación manual:
1. Sidebar muestra "Consultas" con ícono correcto.
2. La página lista las consultas del tenant ordenadas por fecha.
3. Filtrar por vet → tabla se actualiza.
4. Filtrar por rango de fechas → tabla se actualiza.
5. Click en fila → navega al expediente correcto del paciente.
6. Botón "Nueva consulta" → abre `/dashboard/records/new`.

---

## Archivos

**Nuevos**
- `app/api/servicios/consulta/route.ts`
- `app/dashboard/servicios/consulta/page.tsx`
- `components/servicios/ConsultationList.tsx`

**Modificados**
- `components/dashboard/SidebarNav.tsx` (+Consultas)
