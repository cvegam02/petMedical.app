# Consulta Walk-In: Nueva consulta sin mascota registrada

**Fecha:** 2026-05-28  
**Estado:** Aprobado — listo para implementar

---

## Problema

La ruta actual `/dashboard/pets/[petId]/records/new` requiere un `petId` existente. Si un paciente llega sin cita y no está registrado en el sistema, el veterinario no tiene forma de iniciar una consulta sin primero salir a registrar al dueño y la mascota por separado.

---

## Solución

Nueva ruta `/dashboard/records/new` que funciona en dos modos según si detecta un `petId`:

- **Con `petId`** → comportamiento actual (PetBanner + formulario de consulta)
- **Sin `petId`** → modo walk-in: el vet captura los datos de la mascota y la consulta en la misma pantalla; el dueño se asocia al momento de guardar

---

## Flujo completo (modo walk-in)

### Paso 1 — Datos de la mascota (inline)

La página muestra un formulario de nueva mascota directamente en el cuerpo de la página. No hay redirección ni modal.

**Campos:**
- Nombre — requerido
- Especie — requerido (select con opciones de `/api/species`)
- Raza — opcional (select dependiente de especie)
- Sexo — opcional (macho / hembra / desconocido)
- Fecha de nacimiento — opcional

**Comportamiento:** todo queda en estado local del cliente (`useState`). Nada se persiste en la DB hasta el paso 4.

---

### Paso 2 — Formulario de consulta

Una vez que el vet completa nombre y especie (campos mínimos), el formulario clínico aparece debajo — sin recarga ni navegación.

Muestra los mismos campos que `MedicalRecordForm` pero sin lógica de submisión propia — los datos quedan en estado local de `WalkInConsultationPage`. Para esto se extrae un componente `MedicalRecordFields` con solo los campos (motivo, diagnóstico, tratamiento, signos vitales, recetas), reutilizable tanto aquí como en el `MedicalRecordForm` existente.

---

### Paso 3 — Modal al guardar

Al hacer click en "Finalizar consulta" se abre un modal: *¿A quién le pertenece esta mascota?*

**Opciones dentro del modal:**

**A — Buscar dueño existente**
- Campo de búsqueda por nombre o teléfono
- Llama a `/api/owners?q=` (endpoint existente)
- Muestra hasta 5 resultados
- Click en resultado → dueño seleccionado

**B — Crear nuevo dueño**
- Formulario inline dentro del modal
- Nombre — requerido
- Teléfono — opcional
- Email — opcional

**C — Guardar sin dueño**
- Link/botón secundario: "Guardar sin dueño por ahora"
- Permite casos urgentes donde no hay tiempo o información disponible
- Se crea igualmente un `pet_registration` con un dueño placeholder (nombre "Sin registrar") para que la mascota aparezca en la lista del tenant; el dueño puede actualizarse después desde el perfil de la mascota
- Alternativa considerada y descartada: dejar la mascota sin `pet_registration` — causa que no aparezca en la lista del tenant por RLS

---

### Paso 4 — Guardado transaccional

Una sola llamada a `POST /api/consultations/walk-in` crea todo en orden:

1. `pets` — inserta nueva mascota con los datos del paso 1
2. `owners` — inserta nuevo dueño si no se seleccionó uno existente (solo si hay dueño)
3. `pet_registrations` — vincula pet + owner + tenant_id (solo si hay dueño)
4. `medical_records` — inserta la consulta con `pet_id` recién creado

Si cualquier paso falla, ningún registro se persiste (transacción SQL).

Al completar, redirige a `/dashboard/pets/[petId]/records/[recordId]` — el detalle del expediente recién creado.

---

## Arquitectura

### Nueva ruta

```
app/dashboard/records/new/page.tsx
```

Server component que detecta si hay `petId` en searchParams:
- Con `petId` → delega a lógica existente (misma experiencia que hoy)
- Sin `petId` → renderiza `<WalkInConsultationPage />`

### Nuevo client component

```
components/medical-records/WalkInConsultationPage.tsx
```

Gestiona el estado local completo:
- `petForm` — datos de la mascota (nombre, especie, raza, sexo, dob)
- `recordForm` — datos de la consulta (motivo, diagnóstico, etc.)
- `ownerModalOpen` — controla si el modal de dueño está abierto
- `selectedOwner` — dueño seleccionado o datos del nuevo

Muestra `WalkInPetForm` primero. Una vez que `nombre` y `especie_id` tienen valor, el formulario clínico aparece automáticamente debajo sin botón de "Continuar" intermedio — la transición es fluida por scroll.

### Componente extraído

```
components/medical-records/MedicalRecordFields.tsx
```

Solo los campos del formulario clínico (motivo, diagnóstico, tratamiento, signos vitales, recetas) sin lógica de submisión. `MedicalRecordForm` lo usa internamente; `WalkInConsultationPage` también lo usa para capturar datos en estado local.

### Nuevo formulario inline

```
components/medical-records/WalkInPetForm.tsx
```

Formulario de mascota siguiendo el patrón `FormSection` (igual que `PetForm`). Campos: nombre, especie, raza, sexo, fecha de nacimiento.

### Modal de dueño

```
components/medical-records/OwnerResolutionModal.tsx
```

Modal con tres modos: buscar existente / crear nuevo / omitir. Reutiliza la lógica de búsqueda de dueños del `NewAppointmentModal` (debounce, preload).

### Nuevo API endpoint

```
app/api/consultations/walk-in/route.ts   POST
```

Body:
```ts
{
  pet: { name, species_id, breed_id?, sex?, date_of_birth? }
  record: { reason, diagnosis?, treatment?, notes?, weight_kg?, temperature_celsius?, heart_rate_bpm?, respiratory_rate_bpm?, prescriptions? }
  owner?: { id? } | { full_name, phone?, email? }  // null = sin dueño
}
```

Respuesta:
```ts
{ petId: string; recordId: string }
```

La lógica corre en una transacción Supabase (RPC o inserción secuencial con rollback manual si algún paso falla).

---

## Lo que NO cambia

- `/dashboard/pets/[petId]/records/new` — sin modificaciones
- `MedicalRecordForm` — se reutiliza sin cambios
- `PetBanner` — se reutiliza sin cambios
- `PatientDataSection` — sigue funcionando para perfiles incompletos de citas agendadas

---

## Entrada al flujo

El botón "Consulta sin cita" del dashboard (`DashboardTwoColumn`) actualmente apunta a `/dashboard/pets`. Se actualiza para apuntar a `/dashboard/records/new`.

---

## Manejo de errores

- Fallo al crear pet: muestra error en modal, no cierra
- Fallo al crear owner: muestra error, permite reintentar o guardar sin dueño
- Fallo al crear record: muestra toast de error, los datos del formulario se preservan (no se pierde lo que escribió el vet)

---

## Criterios de éxito

- El vet puede iniciar y guardar una consulta completa para un paciente nuevo sin salir de `/dashboard/records/new`
- La mascota y el dueño quedan correctamente vinculados en `pet_registrations`
- Si el dueño ya existía, no se crea un duplicado
- Si el vet elige "sin dueño", la mascota queda registrada y la consulta guardada; el dueño puede vincularse después desde el perfil de la mascota
- Todos los registros se crean o ninguno (transacción atómica)
