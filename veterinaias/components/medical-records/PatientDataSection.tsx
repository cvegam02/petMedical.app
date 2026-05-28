'use client'
import { useState, useEffect } from 'react'
import { UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Species { id: string; name: string }

export interface PatientDataValues {
  owner: { id: string; full_name: string; phone: string; email: string }
  pet: { id: string; species_id: string; sex: string; date_of_birth: string }
}

interface PatientDataSectionProps {
  initialOwner: { id: string; full_name: string; phone: string | null; email: string | null }
  initialPet: { id: string; species_id: string | null; sex: string; date_of_birth: string | null }
  onChange: (values: PatientDataValues) => void
}

export function PatientDataSection({ initialOwner, initialPet, onChange }: PatientDataSectionProps) {
  const [species, setSpecies] = useState<Species[]>([])
  const [ownerName, setOwnerName] = useState(initialOwner.full_name)
  const [ownerPhone, setOwnerPhone] = useState(initialOwner.phone ?? '')
  const [ownerEmail, setOwnerEmail] = useState(initialOwner.email ?? '')
  const [speciesId, setSpeciesId] = useState(initialPet.species_id ?? '')
  const [sex, setSex] = useState(initialPet.sex ?? 'unknown')
  const [dateOfBirth, setDateOfBirth] = useState(initialPet.date_of_birth ?? '')

  useEffect(() => {
    fetch('/api/species')
      .then(r => r.json())
      .then(json => setSpecies(json.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    onChange({
      owner: { id: initialOwner.id, full_name: ownerName, phone: ownerPhone, email: ownerEmail },
      pet: { id: initialPet.id, species_id: speciesId, sex, date_of_birth: dateOfBirth },
    })
  }, [ownerName, ownerPhone, ownerEmail, speciesId, sex, dateOfBirth]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm">
          <UserRound size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 tracking-tight">00. Datos del Paciente</h3>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
            Perfil incompleto — completa antes de finalizar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Owner fields */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Dueño</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="patient_owner_name" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Nombre completo
              </Label>
              <Input
                id="patient_owner_name"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="Nombre del dueño"
                className="bg-white border-zinc-200 rounded-2xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="patient_owner_phone" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Teléfono
              </Label>
              <Input
                id="patient_owner_phone"
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value)}
                placeholder="55-1234-5678"
                className="bg-white border-zinc-200 rounded-2xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="patient_owner_email" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Email
              </Label>
              <Input
                id="patient_owner_email"
                type="email"
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="bg-white border-zinc-200 rounded-2xl"
              />
            </div>
          </div>
        </div>

        {/* Pet fields */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Mascota</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Especie
              </Label>
              <Select value={speciesId} onValueChange={v => setSpeciesId(v ?? '')}>
                <SelectTrigger className="bg-white border-zinc-200 rounded-2xl">
                  <SelectValue placeholder="Seleccionar especie" />
                </SelectTrigger>
                <SelectContent>
                  {species.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Sexo
              </Label>
              <Select value={sex} onValueChange={v => setSex(v ?? 'unknown')}>
                <SelectTrigger className="bg-white border-zinc-200 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Macho</SelectItem>
                  <SelectItem value="female">Hembra</SelectItem>
                  <SelectItem value="unknown">Desconocido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="patient_pet_dob" className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Fecha de nacimiento
              </Label>
              <Input
                id="patient_pet_dob"
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="bg-white border-zinc-200 rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
