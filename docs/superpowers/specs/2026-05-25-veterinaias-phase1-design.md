# VeterinaIAs — Diseño Fase 1

**Fecha:** 2026-05-25
**Estado:** Aprobado
**Alcance:** Fase 1 — SaaS de gestion veterinaria multitenant

---

## 1. Vision General

Plataforma SaaS multitenant que permite a veterinarias individuales y hospitales veterinarios gestionar sus pacientes (animales), historiales clinicos y agenda de citas. El expediente clinico pertenece a la mascota y es accesible por cualquier veterinario registrado en la plataforma.

**Roadmap de fases:**
- **Fase 1 (este documento):** SaaS B2B — gestion interna de veterinarias y hospitales
- **Fase 2:** Marketplace publico tipo Doctoralia — directorio donde dueños buscan y contactan veterinarios
- **Fase 3:** App para dueños — recordatorios de vacunas, desparasitacion, historial de su mascota
- **Fase Futura:** Integracion WhatsApp Business para confirmaciones y recordatorios automaticos

---

## 2. Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend + API | Next.js (React) |
| Base de datos | PostgreSQL via Supabase |
| Autenticacion | Supabase Auth |
| Almacenamiento de archivos | Supabase Storage |
| Pagos | Stripe |
| Calendario externo | Google Calendar API |
| Hosting | Vercel (frontend) + Supabase (backend) |

**Razon:** Next.js + Supabase permite velocidad de desarrollo, infraestructura gestionada, Row Level Security para multitenant, y es la base ideal para el directorio publico de Fase 2 (SEO con Next.js).

---

## 3. Modelo Multitenant

Dos tipos de tenant con comportamiento distinto:

| | Plan Individual | Plan Empresa |
|---|---|---|
| Tipo de negocio | Veterinaria pequeña | Hospital o clinica con multiples doctores |
| Usuarios | Hasta 5 | Ilimitados (precio por doctor) |
| Calendario | Compartido del negocio | Individual por doctor |
| Roles disponibles | `admin`, `staff` | `admin`, `doctor`, `asistente` |
| Vista global de agenda | No aplica | Si — asistente y admin ven todos los calendarios |

**Aislamiento de datos:** Row Level Security (RLS) de Supabase. Cada tabla con `tenant_id` aplica politicas de Postgres automaticamente. Ningun tenant accede a datos de otro.

**Excepcion — Expediente clinico:** Los perfiles de `Owner`, `Pet` y `MedicalRecord` son entidades de plataforma (sin `tenant_id`). Cualquier veterinario registrado puede leer el historial de una mascota. Solo el veterinario o staff que creo el registro puede modificarlo (via adendas).

---

## 4. Modelo de Datos

```
[PLATAFORMA]
Owner (dueno de mascota)
  └── Pet (mascota) [1 dueno → muchas mascotas, 1 mascota → 1 dueno]
        └── MedicalRecord (consulta/visita) [inmutable al guardar]
              ├── Vitals (peso, temperatura, frecuencia cardiaca, etc.)
              ├── Prescriptions (medicamentos recetados)
              ├── Attachments (labs, radiografias, imagenes — URL a Supabase Storage)
              └── Addendum (correccion o nota adicional post-guardado)

[TENANT]
Tenant (veterinaria u hospital)
  └── User (miembro del equipo con rol)

[PLATAFORMA + TENANT]
Appointment (cita)
  ├── tenant_id
  ├── pet_id
  ├── owner_id
  ├── user_id (doctor o staff que atiende)
  ├── status: scheduled | confirmed | completed | cancelled | no_show
  ├── medical_record_id (generado al completar la cita)
  └── origin_record_id (opcional — si es cita de seguimiento, referencia al MedicalRecord que la origino)
```

**Reglas del modelo:**
- Un `Owner` puede tener muchas `Pets`, pero cada `Pet` tiene exactamente un `Owner`
- Un `MedicalRecord` es generado automaticamente al marcar una `Appointment` como `completed`
- Los `MedicalRecord` son inmutables una vez guardados — las correcciones se hacen via `Addendum`
- Los `Attachments` se guardan en Supabase Storage; la base de datos almacena solo la URL de referencia
- Especies y razas son catalogos configurables — no valores hardcodeados

---

## 5. Roles y Permisos

### Plan Individual

| Rol | Permisos |
|-----|---------|
| `admin` | Todo: configuracion del negocio, usuarios, citas, expedientes, billing |
| `staff` | Crear y gestionar citas, registrar expedientes, gestionar dueños y mascotas |

### Plan Empresa

| Rol | Permisos |
|-----|---------|
| `admin` | Todo: configuracion, usuarios, ver todos los calendarios y expedientes |
| `doctor` | Sus propias citas; leer expedientes de mascotas que atiende (incluye historial de otros doctores del mismo tenant) |
| `asistente` | Gestionar citas de todos los doctores del hospital; sin acceso a datos clinicos |

### Super Admin (plataforma)

Rol exclusivo del operador de la plataforma. Acceso via ruta separada y protegida.

| Funcionalidad | Descripcion |
|--------------|------------|
| Vista de tenants | Lista de todas las veterinarias y hospitales registrados |
| Detalle del tenant | Usuarios, suscripcion, historial de pagos, uso |
| Gestion de suscripcion | Activar, suspender, dar de baja manualmente |
| Dias de gracia | Configurar y extender por tenant |
| Metricas globales | Tenants activos, ingresos, mascotas registradas, citas generadas |
| Impersonation | Acceder como un tenant para soporte tecnico (con audit log) |

### Acceso al Expediente Clinico

| Actor | Leer | Escribir | Modificar |
|-------|------|---------|-----------|
| Veterinario registrado (atendiendo la mascota) | Si | Si — nuevos registros | No — solo adendas |
| Staff del tenant | Si | Si | No |
| Dueno de la mascota | Si | No | No |
| Link compartible temporal (vet externo) | Solo lectura | No | No |

---

## 6. Modulo de Agenda y Calendario

### Estados de una cita

```
scheduled → confirmed → completed
                ↘ cancelled
                ↘ no_show
```

- **`scheduled`:** Cita creada por staff, doctor o asistente
- **`confirmed`:** Staff contacto al dueno (llamada) y confirmo asistencia — cambio manual en el sistema
- **`completed`:** Consulta atendida; el sistema genera automaticamente un `MedicalRecord`
- **`cancelled`:** Cancelada por cualquiera de las partes
- **`no_show`:** El dueno no se presento

### Calendario por tipo de tenant

**Plan Individual:**
- Un calendario compartido para todo el negocio
- Cualquier usuario con rol `staff` o `admin` puede agendar, mover o cancelar citas
- Integracion opcional con Google Calendar (sincronizacion bidireccional)

**Plan Empresa:**
- Cada doctor tiene su propio calendario
- El `asistente` y el `admin` ven todos los calendarios en una vista unificada
- Integracion con Google Calendar por doctor (cada doctor conecta su propia cuenta)

### Confirmacion de citas

- **Fase 1:** Proceso 100% manual. El sistema muestra una vista de citas pendientes de confirmar. El staff llama al dueno y marca la cita como `confirmed` manualmente.
- **Configuracion por tenant (Settings):** Cuantos dias antes aparece el recordatorio interno de confirmacion (configurable: 1, 2 o 3 dias antes).

---

## 7. Modulo de Expediente Clinico

Cada visita genera un `MedicalRecord` con:

| Campo | Descripcion |
|-------|------------|
| Motivo de consulta | Razon de la visita |
| Diagnostico | Diagnostico del veterinario |
| Tratamiento | Tratamiento indicado |
| Vitals | Peso, temperatura, frecuencia cardiaca, frecuencia respiratoria |
| Prescriptions | Medicamentos: nombre, dosis, frecuencia, duracion |
| Notas del veterinario | Observaciones adicionales |
| Attachments | Archivos adjuntos: laboratorios, radiografias, imagenes |
| Veterinario | Quien creo el registro (user_id + nombre) |
| Fecha y hora | Timestamp del registro |

**Reglas:**
- El registro queda bloqueado al guardarse — no se puede editar
- Correcciones y notas adicionales se agregan como `Addendum` (referencia al registro original, autor, fecha)
- El historial completo de una mascota es la suma cronologica de todos sus `MedicalRecord` de todos los tenants

### Compartir expediente

Cualquier veterinario o staff del tenant puede generar un **link temporal de solo lectura** con el historial de una mascota:
- Expira en 7 dias por defecto (configurable en Settings del tenant)
- No requiere cuenta en la plataforma para visualizarlo
- Util para consultas externas o emergencias

**Como llega el link al dueño:** El staff/doctor tiene un boton "Enviar historial al dueño" — el sistema genera el link y lo envia automaticamente al email registrado del dueño. El dueño no necesita cuenta en la plataforma.

> Fase 3: cuando exista la App para dueños, podran generar y compartir el link directamente desde su perfil.

---

## 8. Billing y Planes

| | Plan Individual | Plan Empresa |
|---|---|---|
| Para | Veterinarias pequeñas | Hospitales y clinicas |
| Usuarios | Hasta 5 miembros del equipo | Ilimitados |
| Precio | Fijo mensual (a definir) | Base mensual + tarifa por doctor activo (a definir) |
| Periodo de prueba | 14 dias gratis, sin tarjeta requerida | 14 dias gratis, sin tarjeta requerida |

**Procesador:** Stripe — suscripciones recurrentes, facturas automaticas, cambios de plan.

**Politica de impago:**
- Dias de gracia: acceso de solo lectura (cantidad configurable por Super Admin)
- Vencido el periodo de gracia: acceso bloqueado hasta regularizar
- Los datos nunca se eliminan automaticamente

---

## 9. Modulos del Sistema — Fase 1

| Modulo | Nivel | Descripcion |
|--------|-------|------------|
| Super Admin Panel | Plataforma | Gestion de tenants, suscripciones, metricas globales |
| Auth & Tenants | Plataforma / Tenant | Registro, login, onboarding del negocio |
| Usuarios & Roles | Tenant | Invitar equipo, asignar roles, gestionar permisos |
| Dueños & Mascotas | Plataforma | Perfiles de dueños, registro de mascotas con especie y raza |
| Agenda | Tenant | Calendario por negocio o por doctor, integracion Google Calendar |
| Expediente Clinico | Plataforma | Consultas, signos vitales, medicamentos, adjuntos, adendas |
| Confirmacion de Citas | Tenant | Vista de citas pendientes, confirmacion manual por staff |
| Compartir Expediente | Plataforma | Links temporales de solo lectura para vets externos o duenos |
| Settings | Tenant | Configuracion del negocio: anticipacion de recordatorios, integraciones |
| Billing | Plataforma / Tenant | Suscripcion mensual via Stripe, gestion de planes |

---

## 10. Decisiones de Arquitectura

| Decision | Razon |
|----------|-------|
| Expediente a nivel plataforma (sin tenant_id) | El historial pertenece a la mascota, no a la clinica. Cualquier vet puede atenderla con contexto completo. |
| MedicalRecord inmutable | Integridad clinica y legal. Las correcciones son Addendum con autor y fecha. |
| RLS de Supabase para multitenant | Aislamiento de datos garantizado a nivel base de datos, sin logica de filtrado en la aplicacion. |
| Confirmacion manual Fase 1 | Cada negocio tiene su propio flujo. Fase futura: automatizacion via WhatsApp Business API. |
| Stripe para billing | Estandar SaaS, maneja suscripciones recurrentes y cambios de plan sin logica custom. |
| Next.js para frontend | SEO nativo para Fase 2 (directorio publico), responsivo por defecto, full-stack en un solo repositorio. |
