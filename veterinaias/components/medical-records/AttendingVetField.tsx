'use client'

import { Stethoscope } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface TenantVet {
  id: string
  full_name: string | null
}

interface AttendingVetFieldProps {
  vets: TenantVet[]
  value: string
  onChange: (vetId: string) => void
  currentVetId: string
}

const ROLE_HINT = (id: string, currentVetId: string) => (id === currentVetId ? ' (tú)' : '')

export function AttendingVetField({ vets, value, onChange, currentVetId }: AttendingVetFieldProps) {
  const items = Object.fromEntries(
    vets.map((v) => [v.id, `${v.full_name ?? 'Sin nombre'}${ROLE_HINT(v.id, currentVetId)}`]),
  )
  const selected = vets.find((v) => v.id === value)

  return (
    <div className="space-y-1.5">
      <Label htmlFor="attended_by" className="text-[13px] font-bold flex items-center gap-1.5">
        <Stethoscope size={13} className="text-muted-foreground/50" />
        Veterinario que atiende
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? '')} items={items}>
        <SelectTrigger id="attended_by">
          <SelectValue placeholder="Seleccionar veterinario">
            {selected ? `${selected.full_name ?? 'Sin nombre'}${ROLE_HINT(selected.id, currentVetId)}` : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {vets.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.full_name ?? 'Sin nombre'}
              {ROLE_HINT(v.id, currentVetId)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground/70">
        Quien realmente atendió la consulta y firma la receta, aunque la sesión esté abierta con otro usuario.
      </p>
    </div>
  )
}
