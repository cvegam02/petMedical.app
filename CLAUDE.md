# VeterinaIAs — CLAUDE.md

## Que es este proyecto

SaaS multitenant para gestion veterinaria. Permite a veterinarias individuales y hospitales veterinarios gestionar pacientes (animales), historiales clinicos y agenda de citas.

**Spec completa:** `docs/superpowers/specs/2026-05-25-veterinaias-phase1-design.md`

---

## Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend + API | Next.js 14 (App Router) |
| Base de datos | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Storage (archivos) | Supabase Storage |
| Pagos | Stripe |
| Calendario externo | Google Calendar API |
| Hosting | Vercel |
| Tests | Vitest + @testing-library/react |
| UI | Tailwind CSS + shadcn/ui |
| Validacion | Zod + React Hook Form |

---

## Arquitectura Multitenant

Dos tipos de tenant con comportamiento distinto:

| | Plan Individual | Plan Empresa |
|---|---|---|
| Usuarios | Hasta 5 | Ilimitados |
| Calendario | Compartido | Por doctor |
| Roles | `admin`, `staff` | `admin`, `doctor`, `assistant` |

**Aislamiento:** Row Level Security (RLS) de Supabase via `tenant_id`.

**Identidad del paciente compartida, historial clínico AISLADO:** `pets` es identidad de plataforma — la misma mascota puede estar registrada en varias clínicas (`pet_registrations`). PERO el **historial clínico es privado por tenant**: `medical_records` (y `prescriptions`, `attachments`, `addendums`, `pet_vaccinations`, `pet_dewormings`) tienen `tenant_id` y su política RLS de `SELECT` está restringida a `tenant_id = auth_tenant_id()`. Cada clínica ve únicamente lo que ella creó; **no hay lectura cruzada de historiales entre clínicas**. El intercambio entre clínicas/dueño se hace explícitamente (exportar PDF o compartir por WhatsApp/correo). `owners` son tenant-scoped.

**Super Admin:** flag `is_super_admin` en `user_profiles`. Ruta `/super-admin`, completamente separada de los tenants.

---

## Reglas de Negocio Criticas

- `medical_records` son **inmutables** una vez guardados — correcciones via `addendums`
- Una mascota tiene **un solo dueno**, un dueno puede tener muchas mascotas
- Estados de cita: `scheduled` → `confirmed` → `completed` / `cancelled` / `no_show`
- Confirmacion de citas: proceso **manual** — staff llama al dueno y confirma en el sistema
- El dueno recibe el historial via email (boton "Enviar historial al dueno" — genera link temporal)
- Links compartibles expiran en **7 dias** por defecto (configurable en Settings del tenant)

---

## Estructura de Archivos (cuando exista el codigo)

```
veterinaias/
├── CLAUDE.md                          # Este archivo
├── PRODUCT.md                         # Identidad de producto (para impeccable)
├── DESIGN.md                          # Sistema de diseno (para impeccable)
├── middleware.ts                      # Proteccion de rutas
├── supabase/migrations/               # Migraciones SQL
├── lib/
│   ├── supabase/client.ts             # Cliente browser
│   ├── supabase/server.ts             # Cliente server (SSR)
│   ├── supabase/admin.ts              # Cliente service role (super admin only)
│   ├── types/database.ts             # Tipos TypeScript de todas las tablas
│   └── validations/                   # Schemas Zod
├── app/
│   ├── (auth)/                        # Login, register, accept-invite
│   ├── (dashboard)/                   # App principal (requiere auth + tenant)
│   ├── onboarding/                    # Setup del tenant tras registro
│   ├── super-admin/                   # Panel super admin
│   └── api/                           # API routes
├── components/
└── __tests__/                         # Tests con Vitest
```

---

## Plans de Implementacion

| Plan | Archivo | Estado |
|------|---------|--------|
| Plan 1: Foundation | `docs/superpowers/plans/2026-05-25-plan1-foundation.md` | Listo para ejecutar |
| Plan 2: Dueños, Mascotas y Expediente | Pendiente | - |
| Plan 3: Agenda y Calendario | Pendiente | - |
| Plan 4: Super Admin y Billing | Pendiente | - |
| Plan 5: Settings y Compartir Expediente | Pendiente | - |

---

## Skills Disponibles en este Proyecto

### Locales (solo este proyecto — `.agents/skills/`)
- `the-architect` — consultor de arquitectura: entrevista, diseña y genera blueprints auto-contenidos para sub-proyectos o features nuevas
- `openspec-proposal` — crea una propuesta de cambio con proposal.md, tasks.md y delta specs antes de implementar
- `openspec-apply` — implementa una propuesta aprobada siguiendo sus tasks.md y delta specs fase por fase
- `openspec-archive` — cierra un cambio: fusiona los delta specs al spec principal y archiva el historial
- `impeccable` — diseño y polish de UI (requiere PRODUCT.md y DESIGN.md)
- `taste-design` — genera DESIGN.md con el sistema de diseno del proyecto
- `web-design-guidelines` — audita UI contra Web Interface Guidelines de Vercel
- `agent-browser` — verificacion visual en browser, QA, dogfooding
- `frontend-design` — construccion de componentes UI production-grade
- `find-skills` — buscar e instalar nuevos skills

### Flujo de desarrollo (superpowers plugin)
- `superpowers:subagent-driven-development` — ejecutar planes tarea por tarea con subagentes
- `superpowers:writing-plans` — crear nuevos planes de implementacion
- `superpowers:executing-plans` — ejecutar planes en sesion actual con checkpoints
- `superpowers:brainstorming` — explorar ideas antes de implementar
- `superpowers:verification-before-completion` — verificar que el trabajo funciona antes de cerrarlo
- `superpowers:systematic-debugging` — debugging estructurado
- `superpowers:dispatching-parallel-agents` — tareas independientes en paralelo
- `superpowers:finishing-a-development-branch` — completar rama, merge o PR

### Base de datos y backend
- `supabase:supabase` — referencia completa de Supabase
- `supabase:supabase-postgres-best-practices` — best practices de Postgres en Supabase
- `postgres-patterns` — patrones avanzados de PostgreSQL
- `database-migrations` — gestion de migraciones de schema
- `backend-patterns` — patrones de backend
- `api-design` — diseño de APIs REST

### Frontend
- `frontend-patterns` — patrones de frontend
- `nextjs-turbopack` — optimizaciones especificas de Next.js con Turbopack

### Testing y calidad
- `tdd-workflow` — flujo TDD estricto: red → green → refactor
- `e2e-testing` — tests end-to-end
- `verification-loop` — loop de verificacion automatico
- `coding-standards` — estandares de codigo

### Seguridad
- `security-review` — revision de vulnerabilidades OWASP
- `security-scan` — escaneo de seguridad automatizado

### Infraestructura
- `deployment-patterns` — patrones de deployment a Vercel
- `docker-patterns` — Docker para entorno de desarrollo

### Investigacion
- `deep-research` — investigacion profunda antes de implementar
- `exa-search` — busqueda web avanzada
- `documentation-lookup` — buscar en documentacion oficial

---

## Cuando usar skills pesados vs ligeros

**Regla principal: el peso del proceso debe ser proporcional a la complejidad del cambio.**

### Cambios de logica, negocio o flujos
Cualquier cambio que afecte comportamiento, datos, APIs, reglas de negocio o arquitectura requiere el flujo completo:

```
1. superpowers:brainstorming               → explorar opciones antes de tocar codigo
2. superpowers:writing-plans              → plan de implementacion con tareas
3. superpowers:subagent-driven-development → ejecutar el plan tarea por tarea
4. security-review                        → antes de commit con datos sensibles
5. superpowers:verification-before-completion → verificar que todo funciona
```

### Cambios solo de UI / UX
Cambios visuales que no modifican logica (estilos, layouts, componentes, animaciones, copy):

```
1. taste-design          → si el sistema de diseno del proyecto aun no existe o necesita actualizarse
2. ui-ux-pro-max         → para diseno de experiencia, flujo de pantallas o decisiones de UX complejas
3. emil-design-eng       → para construir o refinar componentes UI de alta calidad
4. frontend-design       → construccion de componentes UI production-grade
5. impeccable            → polish final: criterio de diseno, micro-interacciones, consistencia visual
6. web-design-guidelines → auditar accesibilidad y guidelines de Vercel
7. agent-browser         → verificar en browser
```
No todos los pasos son obligatorios — usar solo los que aplican al cambio. Para un retoque de color basta `impeccable` + `agent-browser`. Para una pantalla nueva completa usar el flujo completo.

No usar subagentes de revision por codigo, no usar writing-plans, no usar brainstorming salvo que el cambio de UI implique decision de producto no trivial.

### Cambios triviales (una sola linea, typo, rename, config)
Hacer el cambio directamente. Sin skills, sin agentes.

---

## Flujo de Trabajo Standard

```
1. superpowers:subagent-driven-development  → implementar tareas del plan
2. impeccable                               → pulir UI despues de construirla
3. web-design-guidelines                    → auditar accesibilidad
4. agent-browser                            → verificar en browser
5. security-review                          → antes de commit con datos sensibles
6. superpowers:verification-before-completion → verificar que todo funciona
```

---

## Convenciones de Codigo

- **Inmutabilidad:** siempre crear nuevos objetos, nunca mutar existentes
- **Archivos:** max 800 lineas, tipicamente 200-400
- **Funciones:** max 50 lineas
- **Sin comentarios** salvo que el WHY sea no-obvio
- **Sin console.log** en codigo commiteado
- **Errores:** manejar explicitamente en cada nivel, nunca silenciar
- **Validacion:** siempre en boundaries del sistema (inputs de usuario, respuestas de API)
- **Tests:** minimo 80% de cobertura, siempre escribir el test antes que el codigo (TDD)

---

## Variables de Entorno Requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Ver `.env.example` para la lista completa.

---

## Roadmap

- **Fase 1 (actual):** SaaS B2B — gestion interna de veterinarias y hospitales
- **Fase 2:** Marketplace tipo Doctoralia — directorio publico donde dueños buscan vets
- **Fase 3:** App para dueños — recordatorios de vacunas, desparasitacion, historial
- **Fase Futura:** WhatsApp Business API para confirmaciones automaticas de citas
