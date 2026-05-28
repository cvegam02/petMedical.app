# Nueva Cita como Modal con Primera Visita

**Fecha:** 2026-05-27
**Estado:** Aprobado — listo para implementar

## Problema

El flujo actual para crear una cita navega a `/dashboard/appointments/new`, una página completa con sidebar contextual. Este flujo es innecesariamente pesado para un veterinario en turno que necesita agendar rápido.

Además, el sistema no tiene soporte para el escenario más común en el plan individual: una llamada telefónica de un cliente nuevo que quiere agendar una primera visita. El formulario actual requiere dueño + mascota registrados antes de crear la cita, lo que fuerza al veterinario a registrar todo por adelantado cuando solo tiene el nombre de la mascota.

## Solución

1. Reemplazar la página `/dashboard/appointments/new` con un **modal** accesible desde el dashboard y desde `/dashboard/appointments`.
2. El modal tiene dos modos: **"Cliente registrado"** y **"Primera visita"**.
3. En "Primera visita" se crea un expediente stub (dueño + mascota mínimos) y se capturan los datos completos durante la consulta.

---

## Cambios de UX

### Modal "Nueva cita"

El modal se abre desde dos puntos de entrada:
- Botón "Nueva cita" en el header del dashboard (`app/dashboard/page.tsx`)
- Botón "Nueva cita" en el header de `/dashboard/appointments`
- Botón "Nueva cita" en el empty state de `/dashboard/appointments`

El modal muestra un toggle al tope con dos opciones:

#### Modo "Cliente registrado"

Igual al formulario actual pero sin navegar a otra página:
1. Buscar dueño por nombre o teléfono (autocomplete debounced a `/api/owners`)
2. Al seleccionar dueño, cargar sus mascotas de `/api/pets?ownerId=`
3. Seleccionar mascota
4. Fecha y hora (datetime-local)
5. Duración (select, default 30 min)
6. Motivo (opcional)
7. Asignar a (select, si hay team)

Al guardar: POST `/api/appointments`, cerrar modal, `router.refresh()`.

#### Modo "Primera visita"

Campos mínimos:
1. Nombre de la mascota (texto libre)
2. Fecha y hora
3. Duración (select, default 30 min)
4. Motivo (opcional)
5. Asignar a (select, si hay team)

Al guardar: POST `/api/appointments/first-visit`, cerrar modal, `router.refresh()`.

El endpoint crea automáticamente:
- Dueño stub: `{ full_name: "Dueño de {petName}", phone: null, email: null, tenant_id }`
- Mascota stub: `{ name: petName, species_id: null, sex: "unknown" }`
- pet_registration: `{ tenant_id, pet_id, owner_id }`
- Appointment: `{ pet_id, owner_id, tenant_id, ... }`

### "00. Datos del Paciente" en consulta

Cuando el veterinario abre la consulta desde una cita con perfil incompleto (dueño sin teléfono y sin email), `app/dashboard/pets/[petId]/records/new/page.tsx` detecta la condición y renderiza una sección adicional al inicio del formulario:

```
00. Datos del Paciente  ← nueva sección (solo si perfil incompleto)
01. Triaje Inicial       ← ya existe
02. Evaluación Médica    ← ya existe
03. Gestión de Recetas   ← ya existe
```

La sección "00" muestra:
- Dueño: nombre completo (editable), teléfono, email
- Mascota: especie (select), sexo (select), fecha de nacimiento (opcional)

Al hacer click en "Finalizar Consulta", los datos del paciente se guardan **en paralelo** con el expediente médico:
- `PATCH /api/owners/:ownerId` con `{ full_name, phone, email }`
- `PATCH /api/pets/:petId` con `{ species_id, sex, date_of_birth }`
- `POST /api/medical-records`

Si el PATCH de paciente falla, el expediente se guarda igual y se muestra un toast de advertencia ("Datos del paciente no guardados — puedes actualizarlos en su perfil").

La sección es **no bloqueante**: el veterinario puede dejar los campos vacíos y guardar el expediente de todas formas.

### Detección de perfil incompleto

```typescript
const isIncomplete = owner !== null && !owner.phone && !owner.email
```

No se agrega ningún campo `is_stub` ni `is_first_visit`. La detección es puramente por la ausencia de teléfono y email.

---

## Cambios de Schema

Dos columnas se vuelven nullable para soportar registros stub:

| Tabla | Columna | Cambio |
|-------|---------|--------|
| `owners` | `phone` | `TEXT NOT NULL` → `TEXT` (nullable) |
| `pets` | `species_id` | `UUID NOT NULL REFERENCES species(id)` → `UUID REFERENCES species(id)` |

Una migración (`20260527000006_stub_records_nullable_fields.sql`) ejecuta ambos cambios.

---

## Archivos

### Nuevos

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `veterinaias/supabase/migrations/20260527000006_stub_records_nullable_fields.sql` | SQL | Hace phone y species_id nullables |
| `veterinaias/app/api/appointments/first-visit/route.ts` | API Route | Crea owner+pet+appointment en una transacción |
| `veterinaias/components/appointments/NewAppointmentModal.tsx` | Client Component | Formulario modal con toggle de modos |
| `veterinaias/components/appointments/NewAppointmentButton.tsx` | Client Component | Botón + estado isOpen + instancia del modal |
| `veterinaias/components/medical-records/PatientDataSection.tsx` | Client Component | Sección "00. Datos del Paciente" en consulta |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `veterinaias/app/dashboard/page.tsx` | Agrega team fetch; reemplaza Link→/appointments/new con `<NewAppointmentButton team={team}>` |
| `veterinaias/app/dashboard/appointments/page.tsx` | Agrega team fetch; reemplaza ambos Link→/appointments/new con `<NewAppointmentButton team={team}>` |
| `veterinaias/app/dashboard/pets/[petId]/records/new/page.tsx` | Detecta perfil incompleto; pasa `incompletePatient` a `MedicalRecordForm` |
| `veterinaias/components/medical-records/MedicalRecordForm.tsx` | Acepta prop `incompletePatient`; renderiza `PatientDataSection`; incluye PATCH en onSubmit |
| `veterinaias/lib/validations/appointment.ts` | Agrega `firstVisitSchema` |

### Eliminados

| Archivo | Razón |
|---------|-------|
| `veterinaias/app/dashboard/appointments/new/page.tsx` | Reemplazado por el modal |
| `veterinaias/components/appointments/AppointmentForm.tsx` | Solo era usado por la página eliminada |

---

## Contratos de API

### POST `/api/appointments/first-visit`

**Request:**
```typescript
{
  pet_name: string          // min 1 char
  scheduled_at: string      // ISO 8601
  duration_minutes: number  // 15-180
  reason?: string
  notes?: string
  assigned_to?: string      // UUID
}
```

**Response 201:**
```typescript
{
  data: {
    id: string          // appointment id
    pet_id: string
    owner_id: string
  }
}
```

**Lógica interna (secuencial):**
1. Crear owner: `INSERT INTO owners (full_name, phone, email, tenant_id) VALUES ('Dueño de {petName}', null, null, tenantId)`
2. Crear pet: `INSERT INTO pets (name, sex) VALUES (petName, 'unknown')` — `species_id` es null (nullable tras la migración)
3. Crear pet_registration: `INSERT INTO pet_registrations (tenant_id, pet_id, owner_id) VALUES (...)`
4. Crear appointment: `INSERT INTO appointments (pet_id, owner_id, tenant_id, scheduled_at, duration_minutes, ...)`
5. Return `{ id, pet_id, owner_id }`

Si cualquier paso falla, hace rollback manual en orden inverso (delete appointment → delete reg → delete pet → delete owner) y retorna 500.

### `PATCH /api/owners/:id` y `PATCH /api/pets/:id`

Ambos endpoints **ya existen** y soportan actualizaciones parciales. No requieren cambios.

---

## Componentes — Especificaciones Detalladas

### `NewAppointmentButton`

```typescript
interface NewAppointmentButtonProps {
  team: { id: string; full_name: string }[]
  label?: string  // default "Nueva cita"
}
```

- Client Component
- Estado local: `isOpen: boolean`
- Renderiza un `<Button>` con `<Plus>` icon + label
- Renderiza `<NewAppointmentModal isOpen={isOpen} onClose={() => setIsOpen(false)} team={team} />`

### `NewAppointmentModal`

```typescript
interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  team: { id: string; full_name: string }[]
}

type Mode = 'registered' | 'first_visit'
```

- Client Component
- Estado local: `mode: Mode` (default `'registered'`)
- Overlay con `role="dialog"`, `aria-modal="true"`, cierra con Escape y click fuera
- Toggle al tope: dos botones pill — "Cliente registrado" / "Primera visita"
- Ambos modos comparten: fecha/hora, duración, motivo, asignar a
- Modo `registered`: incluye búsqueda de dueño + select de mascota (lógica copiada de `AppointmentForm`)
- Modo `first_visit`: solo campo de texto para nombre de mascota
- Al submit exitoso: llama `onClose()` + `router.refresh()`
- Botón "Cancelar" también llama `onClose()`

### `PatientDataSection`

```typescript
interface PatientDataSectionProps {
  initialOwner: { id: string; full_name: string; phone: string | null; email: string | null }
  initialPet: { id: string; species_id: string | null; sex: string; date_of_birth: string | null }
  onChange: (values: PatientDataValues) => void
}

interface PatientDataValues {
  owner: { id: string; full_name: string; phone: string; email: string }
  pet: { id: string; species_id: string; sex: string; date_of_birth: string }
}
```

- Client Component
- Fetches species on mount de `/api/species`
- Llama `onChange` cada vez que cambia cualquier field
- Campos del dueño: nombre completo (text), teléfono (text), email (text)
- Campos de la mascota: especie (select de species), sexo (select: Macho/Hembra/Desconocido), fecha de nacimiento (date, opcional)
- Estilo igual al resto del formulario de consulta (sección numerada con icono)

### `MedicalRecordForm` (modificado)

```typescript
interface IncompletePatient {
  owner: { id: string; full_name: string; phone: string | null; email: string | null }
  pet: { id: string; species_id: string | null; sex: string; date_of_birth: string | null }
}

// Prop adicional
interface MedicalRecordFormProps {
  petId: string
  appointmentId?: string
  incompletePatient?: IncompletePatient  // ← nuevo
}
```

- Si `incompletePatient` está presente: renderiza `<PatientDataSection>` antes de "01. Triaje Inicial"
- Guarda los valores del paciente en `useRef<PatientDataValues | null>(null)` (actualizado por `onChange` del section)
- En `onSubmit`:
  - Si `incompletePatient` existe y `patientDataRef.current` tiene valores:
    - Llama `patchOwner(patientDataRef.current.owner)` y `patchPet(patientDataRef.current.pet)` en paralelo
    - Si alguno falla: `toast.warning('Datos del paciente no actualizados...')`
    - Continúa con `createMedicalRecord` independientemente

---

## `records/new/page.tsx` — Lógica de Detección

```typescript
// Datos adicionales cuando hay appointmentId
let incompletePatient: IncompletePatient | null = null

if (appointmentId) {
  const { data: appointment } = await (supabase.from('appointments') as any)
    .select('owner_id')
    .eq('id', appointmentId)
    .maybeSingle()

  if (appointment?.owner_id) {
    const [ownerResult, petResult] = await Promise.all([
      (supabase.from('owners') as any)
        .select('id, full_name, email, phone')
        .eq('id', appointment.owner_id)
        .single(),
      (supabase.from('pets') as any)
        .select('id, species_id, sex, date_of_birth')
        .eq('id', petId)
        .single(),
    ])

    const owner = ownerResult.data
    if (owner && !owner.phone && !owner.email) {
      incompletePatient = { owner, pet: petResult.data }
    }
  }
}
```

---

## Validaciones

### `firstVisitSchema` (nuevo en `lib/validations/appointment.ts`)

```typescript
export const firstVisitSchema = z.object({
  pet_name: z.string().min(1, 'Nombre de mascota requerido'),
  scheduled_at: z.string().datetime('Fecha y hora inválidas'),
  duration_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined) ? undefined : Number(v),
    z.number().int().min(15).max(180)
  ),
  reason: z.string().optional(),
  notes: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})

export type FirstVisitValues = z.infer<typeof firstVisitSchema>
```

---

## Flujo Completo — Primera Visita

```
1. Vet abre modal → selecciona "Primera visita"
2. Ingresa: nombre de mascota "Luna", fecha/hora, duración
3. Click "Crear cita"
4. POST /api/appointments/first-visit
   → crea owner "Dueño de Luna" (phone=null, email=null)
   → crea pet "Luna" (species_id=null, sex='unknown')
   → crea pet_registration
   → crea appointment
   → retorna { id, pet_id, owner_id }
5. Modal se cierra, página se refresca

--- más tarde ---

6. Vet hace click en "Iniciar consulta" desde el dashboard
   → navega a /dashboard/pets/{petId}/records/new?appointmentId={id}
7. Página detecta: owner.phone=null AND owner.email=null → isIncomplete = true
8. Renderiza formulario con sección "00. Datos del Paciente"
9. Vet llena: nombre del dueño, teléfono; especie de Luna, sexo
10. Vet llena expediente clínico
11. Click "Finalizar Consulta"
    → Promise.all:
       - PATCH /api/owners/{ownerId} { full_name: "María García", phone: "55-1234-5678" }
       - PATCH /api/pets/{petId} { species_id: "...", sex: "female" }
       - POST /api/medical-records { ... }
12. Navega a /dashboard/pets/{petId}/records/{recordId}
```

---

## Scope Explícito (Sin Cambios)

- `AppointmentCard.tsx` — sin cambios
- `StatusActions.tsx` — sin cambios
- `app/dashboard/appointments/[appointmentId]/page.tsx` — sin cambios
- `AppointmentQuickModal.tsx` — sin cambios
- RLS policies — sin cambios (owners sigue siendo tenant-scoped via tenant_id)
- No se agrega campo `is_stub` ni `is_first_visit` a ninguna tabla
