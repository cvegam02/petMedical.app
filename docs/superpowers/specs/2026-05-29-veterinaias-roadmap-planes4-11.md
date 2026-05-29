# VeterinaIAs — Roadmap Planes 4–11

**Fecha:** 2026-05-29
**Estado:** Aprobado
**Alcance:** Roadmap de features clínicas, catálogos, servicios e impresión de recetas

---

## Contexto

El sistema tiene implementados los Planes 1–3 (fundación, dueños/mascotas/expedientes, agenda y calendario) y features adicionales de Settings/WhatsApp e historiales médicos. Este documento define los planes siguientes priorizados a partir de retroalimentación con un veterinario usuario.

**Criterio de organización:** Opción B — agrupar por valor entregado, respetando dependencias técnicas entre planes.

---

## Roadmap General

| Plan | Nombre | Estado |
|------|--------|--------|
| Plan 4 | Perfil de Mascota Extendido + Catálogos | Listo para ejecutar |
| Plan 5 | Vacunas y Desparasitación | Listo para ejecutar |
| Plan 6 | Recetas Mejoradas | Listo para ejecutar |
| Plan 7 | Impresión de Recetas | Diseño de alto nivel — spec detallada pendiente |
| Plan 8 | Estética | TBD — spec se define en su momento |
| Plan 9 | Estadía | TBD — spec se define en su momento |
| Plan 10 | Cirugía | TBD — spec se define en su momento |
| Plan 11 | Hospitalización | TBD — spec se define en su momento |

**Dependencias críticas:**
- Plan 5 depende de Plan 4 (catálogos deben existir antes de usarlos en consulta)
- Plan 6 depende de Plan 4 (catálogo de medicamentos)
- Plan 7 depende de Plan 6 (recetas mejoradas alimentan la impresión)
- Planes 8–11 son independientes entre sí y de los anteriores

---

## Plan 4 — Perfil de Mascota Extendido + Catálogos

### Alcance

- Nuevos campos en el perfil de mascota
- Catálogo de vacunas (con inventario y alertas)
- Catálogo de medicamentos (con reglas de dosificación)
- Nueva sección "Catálogos" en Configuraciones

### 4.1 Nuevos campos en la tabla `pets`

| Campo | Tipo | Notas |
|-------|------|-------|
| `sterilized` | `BOOLEAN DEFAULT false` | |
| `habitat` | `TEXT` | texto libre — valores comunes: `'interior'`, `'exterior'`, `'campestre'` |
| `feeding` | `TEXT` | texto libre — valores comunes: `'croquetas'`, `'comida_blanda'`, `'humanos'` |
| `cohabitation` | `BOOLEAN DEFAULT false` | |
| `cohabitation_details` | `TEXT NULLABLE` | solo aplica cuando `cohabitation = true` |

**UI — Formulario de registro/edición de mascota:**
- `Esterilizado` → checkbox
- `Dónde vive` → combobox: al enfocar muestra opciones predefinidas, filtra al escribir, acepta texto libre. Opciones predefinidas: Interior, Exterior, Terreno campestre. No hay campo adicional — el texto ingresado se guarda directamente.
- `Alimentación` → mismo patrón combobox. Opciones predefinidas: Croquetas, Comida blanda, Comida para humanos.
- `Convive con otras mascotas` → toggle; al activarse aparece un textbox para describir con quién y bajo qué circunstancias.

**Perfil de mascota (vista detalle):** nueva sección "Información de vida" que muestra estos 4 campos en modo lectura.

### 4.2 Catálogo de Vacunas

**Nueva tabla `vaccine_catalog`** (nivel tenant):

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | aislamiento RLS |
| `name` | TEXT NOT NULL | ej. "Rabia", "Parvovirus" |
| `manufacturer` | TEXT | laboratorio fabricante |
| `lot_number` | TEXT | número de lote del frasco actual |
| `stock_quantity` | INTEGER DEFAULT 0 | unidades disponibles |
| `low_stock_threshold` | INTEGER DEFAULT 5 | umbral de alerta configurable por vacuna |
| `active` | BOOLEAN DEFAULT true | archivar sin borrar |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**UI — Settings › Catálogos › Vacunas:**
- Lista con columnas: nombre, laboratorio, lote, stock (badge rojo/ámbar si stock ≤ threshold), estado activo
- Botón "Agregar vacuna" → modal con formulario
- Editar / archivar inline por fila
- Alerta de stock bajo: badge en la fila + badge en el tab "Vacunas" + badge en el ícono de Configuraciones en el sidebar

### 4.3 Catálogo de Medicamentos

**Nueva tabla `medication_catalog`** (nivel tenant, sin inventario):

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | |
| `name` | TEXT NOT NULL | nombre comercial, ej. "Amoxil" |
| `active_ingredient` | TEXT NULLABLE | principio activo, ej. "Amoxicilina trihidratada" — requerido en receta por NOM-064-ZOO-2000 |
| `description` | TEXT | presentación, indicaciones generales |
| `dose_per_kg` | NUMERIC NULLABLE | ej. `100` para 100mg/kg — opcional, no todos los medicamentos tienen regla de dosis |
| `dose_unit` | TEXT | `'mg'`, `'ml'`, `'UI'`, etc. |
| `concentration` | TEXT | ej. `'500mg/ml'` — ayuda a convertir dosis a volumen |
| `default_route` | TEXT NULLABLE | vía de administración por defecto: `'oral'`, `'IV'`, `'IM'`, `'SC'`, `'tópica'`, etc. — pre-llena la receta, editable por el vet |
| `active` | BOOLEAN DEFAULT true | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Lógica de sugerencia de dosis** (implementada en Plan 6, definida aquí):
```
dosis_sugerida = peso_mascota_kg × dose_per_kg  [dose_unit]
```
Si tiene `concentration`, la UI también sugiere el volumen equivalente.

**UI — Settings › Catálogos › Medicamentos:**
- Lista con: nombre, descripción, regla de dosis (ej. `100 mg/kg` o "—" si no aplica), estado activo
- Botón "Agregar medicamento" → modal con formulario
- `dose_per_kg` es opcional

**Estructura Settings › Catálogos:**
- Nueva sección en el menú de Configuraciones: "Catálogos"
- Dos tabs: **Vacunas** | **Medicamentos**

---

## Plan 5 — Vacunas y Desparasitación

### Alcance

- Nuevas tablas `pet_vaccinations` y `pet_dewormings`
- Sección en el formulario de consulta para registrar aplicaciones
- Modales independientes en el perfil de mascota (cartilla)
- Decremento automático de inventario de vacunas con alerta de stock bajo

### 5.1 Modelo de datos

**Nueva tabla `pet_vaccinations`:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `pet_id` | UUID FK → pets | |
| `tenant_id` | UUID FK → tenants | para RLS |
| `applied_by` | UUID FK → user_profiles | quién la aplicó |
| `medical_record_id` | UUID FK NULLABLE → medical_records | null si se agrega manualmente a la cartilla |
| `vaccine_catalog_id` | UUID FK NULLABLE → vaccine_catalog | null si se agrega sin seleccionar del catálogo |
| `vaccine_name` | TEXT NOT NULL | desnormalizado al momento de aplicar |
| `lot_number` | TEXT | desnormalizado del catálogo al momento de aplicar |
| `application_date` | DATE NOT NULL | |
| `next_due_date` | DATE NULLABLE | próxima fecha de refuerzo |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

**Nueva tabla `pet_dewormings`:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID PK | |
| `pet_id` | UUID FK → pets | |
| `tenant_id` | UUID FK → tenants | |
| `applied_by` | UUID FK → user_profiles | |
| `medical_record_id` | UUID FK NULLABLE → medical_records | |
| `product_name` | TEXT NOT NULL | combobox — texto libre, puede coincidir con medication_catalog |
| `application_date` | DATE NOT NULL | |
| `next_due_date` | DATE NULLABLE | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

**Lógica de inventario al registrar una vacuna del catálogo:**
```
stock_quantity = stock_quantity - 1
si stock_quantity <= low_stock_threshold → mostrar alerta en UI
```

### 5.2 UI durante la consulta

Nueva sección **"Vacunas y Desparasitación"** en el formulario de consulta, ubicada **después de diagnóstico y tratamiento**.

**Agregar vacuna:**
- Combobox que busca en `vaccine_catalog` del tenant
- Al seleccionar: pre-llena `vaccine_name` y `lot_number` (ambos editables)
- Campos: fecha de aplicación (default: hoy), próxima fecha (opcional), notas
- Al guardar la consulta: crea registro en `pet_vaccinations` + decrementa `stock_quantity`
- Se pueden agregar múltiples vacunas en la misma consulta

**Agregar desparasitación:**
- Combobox de texto libre (sin catálogo propio obligatorio)
- Campos: fecha de aplicación (default: hoy), próxima fecha (opcional), notas
- Se pueden agregar múltiples desparasitaciones en la misma consulta

### 5.3 Cartilla en el perfil de mascota

**En el hero del perfil de mascota** — dos secciones independientes con sus propios modales:

**Modal "Vacunas":**
- Tabla con: vacuna, fecha de aplicación, próxima fecha (badge: verde = vigente / ámbar = vence en ≤30 días / rojo = vencida), lote, quién aplicó, clínica
- Botón "Agregar manualmente" — para vacunas previas al sistema (sin `medical_record_id`)
- Las entradas de consultas aparecen aquí automáticamente

**Modal "Desparasitaciones":**
- Mismo diseño que el modal de vacunas, sin columna de lote
- Botón "Agregar manualmente"
- Las entradas de consultas aparecen aquí automáticamente

---

## Plan 6 — Recetas Mejoradas

### Alcance

- Vincular recetas al catálogo de medicamentos
- Sugerencia automática de dosis basada en peso de la mascota
- Campo de medicamento se convierte en combobox (retrocompatible)

### 6.1 Cambios en la tabla `prescriptions`

Dos columnas nuevas, todo lo existente sin cambios:

| Campo nuevo | Tipo | Notas |
|-------------|------|-------|
| `medication_catalog_id` | UUID FK NULLABLE → medication_catalog | null en recetas existentes o entrada libre |
| `suggested_dose` | TEXT NULLABLE | dosis calculada, guardada como referencia histórica |
| `route_of_administration` | TEXT NULLABLE | vía de administración — pre-llenada desde `default_route` del catálogo, editable; requerida en receta por NOM-064-ZOO-2000 |

### 6.2 UI en el formulario de consulta

El campo "Nombre del medicamento" se convierte en **combobox** que busca en `medication_catalog`. El vet puede seleccionar del catálogo o escribir texto libre.

**Cuando se selecciona un medicamento con `dose_per_kg` y la mascota tiene peso registrado** (se usa el `weight_kg` más reciente entre todos sus expedientes):**
```
Dosis sugerida: 250 mg  (basado en 2.5 kg × 100 mg/kg)
Si tiene concentración: = 0.5 ml  (500 mg/ml)
```
- El texto de ayuda aparece debajo del campo de dosis
- El vet puede aceptar la sugerencia o escribir lo que considere
- El campo de dosis es siempre editable

**Si no hay `dose_per_kg` o no hay peso registrado:** el campo se comporta igual que hoy (texto libre sin sugerencia).

---

## Plan 7 — Impresión de Recetas

### Alcance (diseño de alto nivel — spec detallada pendiente)

Este plan incluye actualización del perfil del veterinario y configuración del template de receta. El diseño detallado, layout y generación de PDF se especifican en el brainstorming del Plan 7.

### 7.1 Cambios en `user_profiles`

| Campo nuevo | Tipo | Notas |
|-------------|------|-------|
| `professional_license` | TEXT | cédula profesional |
| `signature_url` | TEXT | URL a imagen de firma en Supabase Storage |
| `professional_address` | TEXT | dirección del consultorio (puede diferir de la clínica) |

### 7.2 Settings › Configuración de Recetas

Template configurable con campos requeridos por **NOM-064-ZOO-2000 (SENASICA)**:

| Bloque | Datos |
|--------|-------|
| **Clínica** | Nombre, dirección completa, teléfono |
| **Veterinario** | Nombre completo, cédula profesional, firma |
| **Paciente** | Nombre, especie, peso, sexo, edad (jalados del perfil de la mascota) |
| **Propietario** | Nombre y domicilio (del perfil del dueño) |
| **Medicamentos** | Nombre, principio activo, dosis, vía de administración, frecuencia, duración |
| **Pie de página** | Leyenda obligatoria: "Reservado al tratamiento de animales" · Fecha de emisión |

**Nota regulatoria:** Medicamentos controlados (Grupo I — NOM-064-ZOO-2000) requieren receta cuantificada con folio autorizado por SENASICA. Este caso especial se define en detalle en el brainstorming del Plan 7.

### 7.3 Impresión

- Botón "Imprimir receta" en la vista de consulta/expediente
- Vista optimizada para impresión (`@media print`) y/o generación de PDF
- Layout y herramienta de PDF (css, jsPDF, Puppeteer, etc.) se decide en el brainstorming del Plan 7

---

## Planes 8–11 — Servicios

Nueva sección **"Servicios"** en el menú principal del dashboard. Cada servicio es un plan independiente con su propio brainstorming y spec.

| Plan | Servicio | Estado |
|------|----------|--------|
| Plan 8 | Estética | TBD |
| Plan 9 | Estadía | TBD |
| Plan 10 | Cirugía | TBD |
| Plan 11 | Hospitalización | TBD |

El contenido, flujos y modelo de datos de cada servicio se definen cuando se llegue a ese plan.
