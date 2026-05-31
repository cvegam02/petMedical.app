import type { UserRole } from '@/lib/types/database'

// Los asistentes no ejercen como veterinarios, por lo que no requieren cédula
// profesional. Cualquier otro rol con tenant (admin, staff, doctor) sí la
// requiere: aparece en las recetas y es obligatoria para registrar a un
// veterinario que pueda atender consultas.
export function roleRequiresLicense(role: UserRole | null | undefined): boolean {
  return role != null && role !== 'assistant'
}

// Roles que pueden figurar como "veterinario que atiende" una consulta.
export function roleCanAttend(role: UserRole | null | undefined): boolean {
  return roleRequiresLicense(role)
}
