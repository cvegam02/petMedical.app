# Historiales Médicos — Design Spec

**Fecha:** 2026-05-28
**Estado:** Aprobado

---

## Objetivo

Sección dedicada `/dashboard/historiales` donde el staff de una clínica busca una mascota (limitada al tenant actual) y accede a su historial médico completo en orden cronológico, con capacidad de exportar ese historial como PDF con branding de la clínica.

---

## Arquitectura

Flujo de dos páginas + un API route de PDF:

```
/dashboard/historiales              → búsqueda de mascota
/dashboard/historiales/[petId]      → timeline completo + botón PDF
/api/historiales/[petId]/pdf        → genera y entrega el PDF
```

Se añade "Historiales" al `SidebarNav` existente con ícono `ClipboardList` de lucide-react.

---

## Páginas

### `/dashboard/historiales` — Búsqueda

**Server component** con un client component `PetSearchHistorial` embebido.

- Input de búsqueda debounced (300ms, mínimo 2 caracteres)
- Fetcha `/api/pets?q=...` — endpoint existente, scoped al tenant autenticado
- Muestra cards de resultado: nombre de mascota, especie, raza, nombre del dueño
- Cada card tiene botón "Ver historial" → `/dashboard/historiales/[petId]`
- Estado vacío: "Busca una mascota por nombre para ver su historial"
- Sin resultados: "No se encontraron mascotas con ese nombre en esta clínica"

### `/dashboard/historiales/[petId]` — Timeline

**Server component** que fetcha en paralelo:

1. Mascota con especie, raza, dueño (nombre + teléfono)
2. Todos los `medical_records` del pet ordenados por `created_at DESC`, con:
   - `prescriptions` (medicamentos)
   - `addendums` (correcciones)
   - `attachments` (archivos adjuntos — nombre + storage_path)
   - `created_by → user_profiles(full_name)` (quién registró)

**Layout:**
- Header: datos del paciente (nombre, especie, raza, edad, microchip) + datos del dueño + botón "Descargar PDF"
- Body: componente `MedicalTimeline` con las entradas en orden cronológico

**Seguridad:** verifica que la mascota esté registrada en el tenant del usuario autenticado (`pet_registrations.tenant_id`). Si no, retorna 404.

---

## Componentes

### `PetSearchHistorial` (`components/historiales/PetSearchHistorial.tsx`)
Client component. Debounced search con AbortController (cancelar inflight). Muestra lista de resultados o estados vacío/sin-resultados.

### `MedicalTimeline` (`components/historiales/MedicalTimeline.tsx`)
Client component que recibe los records ya cargados. Renderiza una lista vertical de `TimelineEntry`, separados visualmente por línea temporal.

### `TimelineEntry` (`components/historiales/TimelineEntry.tsx`)
Card individual por consulta. Muestra:
- **Encabezado:** fecha formateada, nombre del veterinario que registró
- **Motivo:** campo `reason`
- **Diagnóstico:** campo `diagnosis` (si existe)
- **Tratamiento:** campo `treatment` (procedimientos incluidos aquí)
- **Notas:** campo `notes` (si existe)
- **Signos vitales:** peso, temperatura, FC, FR — solo si tienen valor
- **Medicamentos:** lista de `prescriptions` (nombre, dosis, frecuencia, duración, notas)
- **Addendums:** sección colapsable marcada visualmente como "Corrección posterior" con fecha y autor
- **Adjuntos:** links a archivos (nombre del archivo, abre en nueva tab)

### `PdfDownloadButton` (`components/historiales/PdfDownloadButton.tsx`)
Client component simple. `<a href="/api/historiales/[petId]/pdf" download>` envuelto en un Button. Sin estado complejo.

---

## API Route — PDF

### `GET /api/historiales/[petId]/pdf`

**Auth:** verifica sesión con `createClient()`. Verifica que `pet_registrations` tenga el `pet_id` con el `tenant_id` del usuario.

**Datos fetching:** misma query que la página del timeline (mascota + dueño + records completos). También fetcha `tenants.name` y `tenants.settings` para el logo y nombre de la clínica.

**Generación:** `@react-pdf/renderer` — documento React PDF con:

```
[Header]
  Logo del tenant (tenant.settings.logo_url) o nombre de clínica si no hay logo
  Nombre de la clínica
  Fecha de generación: DD/MM/YYYY

[Datos del Paciente]
  Nombre | Especie | Raza | Sexo
  Fecha de nacimiento | Edad calculada | Color | Microchip

[Dueño]
  Nombre | Teléfono

[Historial — por cada consulta, orden cronológico]
  Fecha — Registrado por: Nombre Vet
  Motivo: ...
  Diagnóstico: ...
  Tratamiento: ...
  Notas: ...
  Signos vitales: (si existen)
  Medicamentos: tabla con columnas Medicamento / Dosis / Frecuencia / Duración
  Addendums: (si existen) con fecha y autor

[Footer en cada página]
  "Historial generado el DD/MM/YYYY | petMedical.app"    Página X de Y
```

**Response:** `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="historial-[nombre-mascota]-[fecha].pdf"`

**Librería:** `@react-pdf/renderer` (npm). Corre en Node.js sin dependencias nativas. Compatible con Next.js App Router API routes.

---

## Archivos a crear / modificar

| Acción | Archivo |
|--------|---------|
| Crear | `app/dashboard/historiales/page.tsx` |
| Crear | `app/dashboard/historiales/[petId]/page.tsx` |
| Crear | `app/api/historiales/[petId]/pdf/route.ts` |
| Crear | `components/historiales/PetSearchHistorial.tsx` |
| Crear | `components/historiales/MedicalTimeline.tsx` |
| Crear | `components/historiales/TimelineEntry.tsx` |
| Crear | `components/historiales/PdfDownloadButton.tsx` |
| Crear | `lib/pdf/medicalHistoryDocument.tsx` |
| Modificar | `components/dashboard/SidebarNav.tsx` |

---

## Dependencias nuevas

- `@react-pdf/renderer` — generación de PDF en servidor

---

## Restricciones y reglas de negocio

- Búsqueda **tenant-scoped**: solo mascotas en `pet_registrations` del tenant del usuario autenticado
- La página del timeline verifica `pet_registrations` antes de mostrar datos (no exponer mascotas de otros tenants)
- Los `medical_records` son de plataforma (sin `tenant_id`), pero accesibles porque el pet está registrado en el tenant
- El PDF incluye todos los records sin filtro de tenant — la mascota puede haber sido atendida en varias clínicas; el historial es del paciente, no del tenant
- Sin paginación en el timeline (historial completo siempre visible)
- Attachments en el PDF: solo nombre del archivo, no el binario embebido
