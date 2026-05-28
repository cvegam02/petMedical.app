# Date/Time Picker — NewAppointmentModal

**Fecha:** 2026-05-27
**Estado:** Aprobado, listo para plan de implementación

---

## Problema

El campo actual `<input type="datetime-local" />` tiene tres problemas simultáneos:

1. **Visual** — el widget nativo del browser rompe el diseño de la app (no usa colores ni tipografía de shadcn/ui).
2. **UX** — la navegación del calendario nativo es incómoda, especialmente en móvil.
3. **Lógica de negocio** — no hay restricción de días/horarios de atención ni bloqueo de fechas pasadas.

---

## Solución

Reemplazar el `datetime-local` con dos campos separados:

- **Fecha** — botón que abre un Popover con el componente `Calendar` de shadcn/ui (basado en react-day-picker, ya en el ecosistema del proyecto).
- **Hora** — `Select` de shadcn/ui con los slots disponibles del día seleccionado.

El campo de **Duración** se elimina del modal. La duración queda implícita en el intervalo de slots configurado del tenant.

---

## Campos en el modal

### Fecha

- Muestra un botón con la fecha seleccionada formateada (ej. "Martes 27 may 2026") o un placeholder "Selecciona una fecha".
- Al hacer click abre un Popover con el componente `Calendar`.
- Restricciones del calendario:
  - Deshabilita fechas pasadas (`disabled={{ before: today }}`).
  - Deshabilita días que no están en `business_hours.days` del tenant.

### Hora

- `Select` de shadcn/ui, habilitado solo cuando hay una fecha seleccionada.
- Las opciones son los slots del día: `["09:00", "09:30", "10:00"… "17:30"]`.
- Si la fecha seleccionada es hoy, filtra los slots cuya hora ya pasó.
- Placeholder: "Selecciona una hora" (deshabilitado hasta tener fecha).

### Layout

Los dos campos ocupan el `grid grid-cols-2` existente — Fecha en la celda izquierda, Hora en la derecha. El campo de Duración se elimina de esa fila.

---

## Configuración de horario del tenant

El horario de atención de la clínica se guarda en `tenant_settings` como columna JSONB:

```json
{
  "business_hours": {
    "days": [1, 2, 3, 4, 5, 6],
    "start": "09:00",
    "end": "18:00",
    "slot_interval": 30
  }
}
```

- `days`: array de números (0 = domingo, 6 = sábado).
- `start` / `end`: hora de apertura y cierre en formato `HH:mm`.
- `slot_interval`: minutos entre cada slot (15, 30, 45 o 60).

**Defaults:** si el tenant aún no tiene `business_hours` configurado, se usan los valores del ejemplo arriba (Lun–Sáb, 09:00–18:00, cada 30 min).

La UI de Settings para editar esta config queda pendiente para Phase 5.

---

## Generación de slots

Una función pura en `lib/utils/time-slots.ts`:

```ts
generateTimeSlots(config: BusinessHoursConfig, date: Date): string[]
```

- Itera desde `config.start` hasta `config.end` en pasos de `config.slot_interval` minutos.
- Si `date` es hoy, excluye los slots cuyo timestamp ya pasó.
- Retorna arreglo de strings `"HH:mm"`.

---

## Cómo llega la config al modal

El dashboard ya tiene acceso al tenant activo. Se pasa `businessHours` como prop a `NewAppointmentModal` — el mismo patrón que ya usa `team: TeamMember[]`.

El `duration_minutes` enviado a la API es `config.slot_interval` directamente; el staff ya no lo elige.

---

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `lib/utils/time-slots.ts` | Nuevo — función `generateTimeSlots` + tipos |
| `components/appointments/NewAppointmentModal.tsx` | Reemplaza `datetime-local` con DatePicker + Select; elimina campo Duración |
| `supabase/migrations/XXXXXX_add_business_hours.sql` | Agrega columna `business_hours` JSONB a `tenant_settings` con default |
| `app/api/appointments/route.ts` | `duration_minutes` viene de config, no del body |
| `app/api/appointments/first-visit/route.ts` | Ídem |

---

## Fuera de alcance

- UI de Settings para editar `business_hours` (Phase 5).
- Visualización de slots ya ocupados (futura feature de calendario).
- Soporte por-doctor de horarios distintos (Phase 3 — Plan Individual vs Empresa).
