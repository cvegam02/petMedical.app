# Test Data Seed — Design

**Fecha:** 2026-05-27
**Archivo:** `supabase/seeds/seed_dev.sql`
**Método:** Ejecutar via Supabase MCP `execute_sql`

---

## Objetivo

Crear datos de prueba realistas para validar la UI de todos los tipos de usuario de VeterinaIAs.

---

## Tenants

| Tenant | Tipo | Slug |
|--------|------|------|
| Clínica San Mateo | `individual` | `clinica-san-mateo` |
| Hospital Veterinario Paws | `enterprise` | `hospital-paws` |

---

## Usuarios (contraseña: `Test1234!`)

| Email | Rol | Tenant | Super Admin |
|-------|-----|--------|-------------|
| `superadmin@test.veterinaias.dev` | — | — | ✅ |
| `admin.individual@test.veterinaias.dev` | `admin` | San Mateo | — |
| `staff@test.veterinaias.dev` | `staff` | San Mateo | — |
| `admin.empresa@test.veterinaias.dev` | `admin` | Hospital Paws | — |
| `doctor@test.veterinaias.dev` | `doctor` | Hospital Paws | — |
| `assistant@test.veterinaias.dev` | `assistant` | Hospital Paws | — |

---

## Datos Realistas

- **6 Dueños** con datos de contacto completos
- **10 Mascotas** — perros, gatos, conejos con raza, sexo, fecha de nacimiento
- **8 Expedientes clínicos** — diagnóstico, tratamiento, signos vitales; 2 con prescripciones
- **12 Citas** distribuidas: 3 `scheduled`, 3 `confirmed`, 3 `completed`, 2 `cancelled`, 1 `no_show`

Las citas de Hospital Paws tienen `assigned_to` asignado al `doctor` para validar el comportamiento enterprise.

---

## Estrategia de Idempotencia

El seed comienza con un bloque DELETE que limpia todos los registros cuyo email contiene `@test.veterinaias.dev` y los tenants con slug `clinica-san-mateo` / `hospital-paws`. Permite re-ejecutar el seed sin duplicados.

---

## Lo que se puede validar

| Usuario | Acceso esperado |
|---------|----------------|
| `superadmin` | Ruta `/super-admin`, ve todos los tenants |
| `admin.individual` | Dashboard completo + sección "Equipo" |
| `staff` | Dashboard sin sección "Equipo" |
| `admin.empresa` | Dashboard completo + sección "Equipo", ve citas asignadas a doctor |
| `doctor` | Dashboard sin sección "Equipo" |
| `assistant` | Dashboard sin sección "Equipo" |
