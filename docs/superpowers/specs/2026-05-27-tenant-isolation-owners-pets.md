# VeterinaIAs — Aislamiento de Datos por Tenant: Owners y Pets

**Fecha:** 2026-05-27
**Estado:** Aprobado
**Alcance:** Corrección de arquitectura de datos — separar listas de clientes/pacientes por tenant preservando historial clínico compartido

---

## 1. Problema

El esquema actual define `owners` y `pets` como entidades de plataforma (sin `tenant_id`). Esto significa que:

- La lista de clientes de la Clínica A es visible para la Clínica B
- La lista de pacientes de la Clínica A es visible para la Clínica B
- Cualquier vet puede modificar datos de clientes que no son suyos

Lo que sí debe compartirse entre clínicas es únicamente el **historial clínico** de una mascota, para que un vet pueda consultar expedientes previos cuando atiende por primera vez a un paciente.

---

## 2. Decisión de Diseño

**`pets` permanece como entidad de plataforma (sin `tenant_id`).**
Un animal es una identidad universal: el mismo perro no debe tener IDs distintos según la clínica que lo atiende. Esto garantiza que todos los `medical_records` del animal apunten al mismo `pet_id`, y el historial completo siempre está consolidado.

**`owners` pasa a ser tenant-scoped.**
Un "cliente" es una relación comercial entre una persona y una clínica. La Clínica A y la Clínica B pueden tener como cliente a la misma persona física, pero con fichas independientes (notas, historial de citas, datos de contacto propios de cada clínica).

**`pet_registrations` es la nueva tabla que representa la lista de pacientes de cada clínica.**
Vincula un `pet` (plataforma) con un `owner` (tenant) dentro de un `tenant`. Esto reemplaza la relación directa `pets.owner_id`.

---

## 3. Modelo de Datos

### Tablas modificadas

**`owners` — ahora tenant-scoped**
```sql
ALTER TABLE owners
  ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- UNIQUE(email) global → UNIQUE(tenant_id, email)
ALTER TABLE owners DROP CONSTRAINT owners_email_key;
ALTER TABLE owners ADD CONSTRAINT owners_tenant_email_unique UNIQUE (tenant_id, email);
```

**`pets` — eliminar `owner_id`**
```sql
ALTER TABLE pets DROP COLUMN owner_id;
-- La relación pet↔owner pasa a ser tenant-específica via pet_registrations
```

### Tabla nueva

**`pet_registrations` — lista de pacientes por clínica**
```sql
CREATE TABLE pet_registrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  owner_id      UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes         TEXT,
  UNIQUE(tenant_id, pet_id)
);
```

Índices:
```sql
CREATE INDEX idx_pet_registrations_tenant_id ON pet_registrations(tenant_id);
CREATE INDEX idx_pet_registrations_pet_id    ON pet_registrations(pet_id);
CREATE INDEX idx_pet_registrations_owner_id  ON pet_registrations(owner_id);
```

Índice adicional en `owners` para soportar la búsqueda cross-tenant por teléfono:
```sql
CREATE INDEX idx_owners_phone ON owners(phone);
CREATE INDEX idx_owners_tenant_id ON owners(tenant_id);
```

### Relaciones resultantes

```
[PLATAFORMA]
pets (sin tenant_id)
  └── medical_records (tenant_id = quien lo creó; readable por cualquier vet)

[TENANT]
tenants
  └── owners (tenant_id)
  └── pet_registrations (tenant_id + pet_id + owner_id)
        ├── pet_id  → pets (plataforma)
        └── owner_id → owners (tenant)
  └── appointments (tenant_id + pet_id + owner_id — sin cambios)
```

### Sin cambios estructurales

- `medical_records` — mantiene `pet_id` (plataforma) y `tenant_id` (atribución del creador)
- `appointments` — mantiene `pet_id` y `owner_id`; el `owner_id` ahora pertenece al mismo tenant (consistente)
- `prescriptions`, `attachments`, `addendums` — sin cambios

---

## 4. Políticas RLS

### `pets` — lectura abierta para vets autenticados
```sql
-- SELECT: cualquier vet autenticado
CREATE POLICY "pets_select_authenticated" ON pets
  FOR SELECT TO authenticated USING (true);

-- INSERT: cualquier vet autenticado puede registrar una nueva mascota
CREATE POLICY "pets_insert_authenticated" ON pets
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: cualquier vet autenticado puede actualizar datos de la mascota
-- (no hay datos clínicos en pets — esos van en medical_records)
CREATE POLICY "pets_update_authenticated" ON pets
  FOR UPDATE TO authenticated USING (true);
```

### `owners` — privado por tenant, búsqueda limitada cross-tenant
```sql
-- SELECT/INSERT/UPDATE/DELETE: solo propio tenant
CREATE POLICY "owners_tenant_isolation" ON owners
  FOR ALL USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
```

La búsqueda cross-tenant por teléfono del dueño se expone **solo** via función `SECURITY DEFINER`, no abriendo la tabla directamente.

### `pet_registrations` — privado por tenant
```sql
CREATE POLICY "pet_registrations_tenant_isolation" ON pet_registrations
  FOR ALL USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());
```

### `medical_records` — cross-tenant READ, write propio tenant
```sql
-- Cualquier vet autenticado puede leer cualquier expediente
CREATE POLICY "medical_records_select_authenticated" ON medical_records
  FOR SELECT TO authenticated USING (true);

-- Solo puede insertar el propio tenant
CREATE POLICY "medical_records_insert_own_tenant" ON medical_records
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
```

---

## 5. Búsqueda Cross-Clínica

### Función `search_pets_cross_tenant`

Función Postgres con `SECURITY DEFINER` que permite buscar mascotas y su dueño básico **sin exponer** la tabla `owners` ni sus datos privados (notas, historial de citas, etc.).

```sql
CREATE FUNCTION search_pets_cross_tenant(
  p_phone     TEXT DEFAULT NULL,
  p_pet_name  TEXT DEFAULT NULL,
  p_species_id UUID DEFAULT NULL,
  p_breed_id  UUID DEFAULT NULL
)
RETURNS TABLE (
  pet_id          UUID,
  pet_name        TEXT,
  species_name    TEXT,
  breed_name      TEXT,
  sex             pet_sex,
  date_of_birth   DATE,
  microchip       TEXT,
  owner_full_name TEXT,
  owner_phone     TEXT,
  record_count    BIGINT,
  last_visit_at   TIMESTAMPTZ,
  last_clinic     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    s.name,
    b.name,
    p.sex,
    p.date_of_birth,
    p.microchip,
    o.full_name,
    o.phone,
    COUNT(mr.id),
    MAX(mr.created_at),
    (SELECT t.name FROM tenants t
     JOIN medical_records mr2 ON mr2.tenant_id = t.id
     WHERE mr2.pet_id = p.id
     ORDER BY mr2.created_at DESC LIMIT 1)
  FROM pets p
  JOIN species s ON s.id = p.species_id
  LEFT JOIN breeds b ON b.id = p.breed_id
  LEFT JOIN pet_registrations pr ON pr.pet_id = p.id
  LEFT JOIN owners o ON o.id = pr.owner_id
  LEFT JOIN medical_records mr ON mr.pet_id = p.id
  WHERE
    (p_phone IS NULL     OR o.phone ILIKE '%' || p_phone || '%')
    AND (p_pet_name IS NULL  OR p.name ILIKE '%' || p_pet_name || '%')
    AND (p_species_id IS NULL OR p.species_id = p_species_id)
    AND (p_breed_id IS NULL  OR p.breed_id = p_breed_id)
  GROUP BY p.id, s.name, b.name, o.full_name, o.phone
  ORDER BY MAX(mr.created_at) DESC NULLS LAST;
END;
$$;
```

**Datos devueltos:** nombre de la mascota, especie, raza, sexo, fecha de nacimiento, microchip, nombre del dueño, teléfono del dueño, cantidad de expedientes, fecha de última visita, nombre de la última clínica.

**Datos NO devueltos:** email del dueño, dirección, notas internas, `tenant_id` del dueño, historial de citas en otras clínicas.

---

## 6. Flujo de Registro Cross-Clínica

Cuando un vet de la Clínica B atiende por primera vez a una mascota de la Clínica A:

1. **Búsqueda:** Vet B busca por teléfono del dueño o nombre/raza/especie de la mascota via `search_pets_cross_tenant()`
2. **Verificación:** Los resultados muestran datos básicos (nombre, teléfono del dueño, resumen del historial) para confirmar identidad
3. **Registro:** Vet B completa el formulario de registro:
   - Crea su propio registro en `owners` (datos del cliente en su clínica)
   - Crea un registro en `pet_registrations` (tenant_id = Clínica B, pet_id = existente, owner_id = nuevo)
4. **La mascota aparece en la lista de pacientes de Clínica B**
5. **Los expedientes nuevos** de Clínica B usan el mismo `pet_id` → el historial se consolida automáticamente

Si el dueño ya existe en la clínica B (búsqueda por teléfono dentro del propio tenant), se reutiliza el `owner_id` existente y solo se crea el `pet_registrations`.

---

## 7. Estrategia de Migración

Las migraciones se aplican en este orden exacto para no romper constraints ni datos existentes.

### Migración 1 — Crear `pet_registrations`
```sql
CREATE TABLE pet_registrations (...);
CREATE INDEX ...;
```

### Migración 2 — Poblar `pet_registrations` desde datos existentes
```sql
-- Derivar relaciones tenant↔pet↔owner desde appointments (fuente de verdad más directa)
INSERT INTO pet_registrations (tenant_id, pet_id, owner_id, registered_at)
SELECT DISTINCT ON (tenant_id, pet_id)
  tenant_id,
  pet_id,
  owner_id,
  MIN(scheduled_at)
FROM appointments
GROUP BY tenant_id, pet_id, owner_id
ON CONFLICT (tenant_id, pet_id) DO NOTHING;

-- Mascotas con owner_id directo pero sin appointment: usar el tenant del primer tenant disponible
-- (aplica solo al entorno de desarrollo — en producción no habrá owners huérfanos)
INSERT INTO pet_registrations (tenant_id, pet_id, owner_id)
SELECT
  (SELECT id FROM tenants ORDER BY created_at LIMIT 1),
  p.id,
  p.owner_id
FROM pets p
WHERE NOT EXISTS (
  SELECT 1 FROM pet_registrations pr WHERE pr.pet_id = p.id
);
```

### Migración 3 — Agregar `tenant_id` a `owners`
```sql
ALTER TABLE owners ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Asignar tenant desde appointments
UPDATE owners o
SET tenant_id = (
  SELECT a.tenant_id FROM appointments a
  WHERE a.owner_id = o.id
  ORDER BY a.created_at ASC LIMIT 1
);

-- Fallback: owners sin appointment → primer tenant (solo dev/seed)
UPDATE owners
SET tenant_id = (SELECT id FROM tenants ORDER BY created_at LIMIT 1)
WHERE tenant_id IS NULL;

ALTER TABLE owners ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE owners ADD CONSTRAINT fk_owners_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
```

### Migración 4 — Actualizar UNIQUE constraint de `owners`
```sql
ALTER TABLE owners DROP CONSTRAINT IF EXISTS owners_email_key;
ALTER TABLE owners ADD CONSTRAINT owners_tenant_email_unique UNIQUE (tenant_id, email);
```

### Migración 5 — Eliminar `pets.owner_id`
```sql
ALTER TABLE pets DROP COLUMN owner_id;
```

### Migración 6 — Actualizar políticas RLS
Reemplazar las políticas existentes de `pets`, `owners`, `medical_records` con las definidas en la Sección 4. Agregar políticas para `pet_registrations`.

### Migración 7 — Crear función `search_pets_cross_tenant`
Crear la función definida en la Sección 5.

---

## 8. Impacto en Código de la App

### Archivos que requieren actualización

| Archivo | Cambio |
|---------|--------|
| `app/dashboard/pets/` | Lista de pacientes filtra por `pet_registrations` en lugar de `pets` directo |
| `app/dashboard/owners/` | Formulario de owner ahora incluye `tenant_id` implícito |
| `app/dashboard/appointments/` | Sin cambios en la UI; queries ajustan JOINs |
| `components/` relacionados con pets/owners | Ajustar queries a nueva estructura |
| `lib/types/database.ts` | Agregar tipo `PetRegistration`; actualizar `Owner` y `Pet` |
| `supabase/migrations/` | 7 nuevas migraciones en orden |

### Nuevo flujo de UI necesario

- **Búsqueda cross-clínica:** Componente de búsqueda que llama a `search_pets_cross_tenant()` y muestra resultados con opción de "Registrar como mi paciente"
- **Formulario de registro de mascota:** Dos caminos: (a) mascota nueva en la plataforma, (b) mascota existente encontrada via búsqueda cross-clínica
- **Vista de expedientes:** Sin cambio — ya accede a `medical_records` por `pet_id`

---

## 9. Lo Que NO Cambia

- `medical_records` es inmutable una vez guardado (correcciones via `addendums`)
- `appointments` mantiene su estructura; `pet_id` y `owner_id` son compatibles
- El flujo de creación de expedientes clínicos no cambia
- El super-admin mantiene acceso global a todo
- `prescriptions`, `attachments`, `addendums` sin cambios
