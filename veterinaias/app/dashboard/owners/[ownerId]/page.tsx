import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PetCard } from '@/components/pets/PetCard'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Phone, Mail, MapPin, Plus, PawPrint, CalendarDays, Stethoscope } from 'lucide-react'
import { getSpeciesIcon } from '@/lib/utils/species-icon'

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default async function OwnerDetailPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner, error } = await (supabase.from('owners') as any)
    .select('id, full_name, email, phone, address, created_at')
    .eq('id', ownerId)
    .single()

  if (error || !owner) notFound()

  const { data: registrations } = await (supabase.from('pet_registrations') as any)
    .select(`
      pet:pet_id(
        id, name, sex, date_of_birth, color, microchip,
        species:species_id(id, name),
        breed,
        service_visits(created_at)
      )
    `)
    .eq('owner_id', ownerId)
    .eq('pet.service_visits.service_type', 'consultation')

  const pets = (registrations ?? []).map((reg: any) => reg.pet).filter(Boolean)
  const initials = getInitials(owner.full_name)

  const allVisits = pets.flatMap((p: any) => p.service_visits ?? [])
  const totalConsultas = allVisits.length
  const lastVisitTs = allVisits.length
    ? Math.max(...allVisits.map((v: any) => new Date(v.created_at).getTime()))
    : null
  const lastVisitStr = lastVisitTs
    ? new Date(lastVisitTs).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const clienteDesde = new Date(owner.created_at).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard/owners"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          Directorio
        </Link>
        <Link
          href={`/dashboard/owners/${ownerId}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Editar perfil
        </Link>
      </div>

      {/* Profile card */}
      <div className="bg-card rounded-xl border border-border mb-8 shadow-sm overflow-hidden">
        <div className="flex items-start gap-5 p-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
            <span className="text-base font-bold text-primary/80">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{owner.full_name}</h1>
              <span className="label-overline text-muted-foreground/50 border border-border px-2 py-0.5 rounded bg-muted/50">Responsable</span>
            </div>
            {(owner.phone || owner.email || owner.address) ? (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm text-muted-foreground">
                {owner.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={12} className="text-muted-foreground/40 shrink-0" />
                    {owner.phone}
                  </span>
                )}
                {owner.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={12} className="text-muted-foreground/40 shrink-0" />
                    {owner.email}
                  </span>
                )}
                {owner.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-muted-foreground/40 shrink-0" />
                    {owner.address}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground/50 italic">Sin datos de contacto</p>
            )}
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border divide-x divide-border bg-muted/20">
          <Metric icon={PawPrint} label="Mascotas" value={String(pets.length)} />
          <Metric icon={Stethoscope} label="Consultas" value={String(totalConsultas)} />
          <Metric icon={CalendarDays} label="Última visita" value={lastVisitStr} />
          <Metric icon={CalendarDays} label="Cliente desde" value={clienteDesde} />
        </div>
      </div>

      {/* Patients section */}
      <div className="flex items-end justify-between mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">Pacientes</p>
          </div>
          <h2 className="text-lg font-bold text-foreground">Mascotas registradas</h2>
        </div>
        <Link
          href={`/dashboard/owners/${ownerId}/pets/new`}
          className={buttonVariants({ size: 'sm' })}
        >
          <Plus size={14} />
          Nueva mascota
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="font-bold text-foreground">Sin mascotas registradas</p>
          <p className="text-sm text-muted-foreground mt-1">Este dueño no tiene mascotas en el sistema.</p>
          <Link
            href={`/dashboard/owners/${ownerId}/pets/new`}
            className={buttonVariants({ size: 'sm', className: 'mt-5' })}
          >
            Registrar primera mascota
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pets.map((pet: any, index: number) => {
            const lastVisit = pet.service_visits?.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]?.created_at

            return (
              <div
                key={pet.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-both"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <PetPatientCard pet={pet} lastVisit={lastVisit} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof PawPrint; label: string; value: string }) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-muted-foreground/40 shrink-0" strokeWidth={1.75} />
        <p className="label-overline text-muted-foreground/50">{label}</p>
      </div>
      <p className="text-sm font-bold text-foreground mt-1 truncate">{value}</p>
    </div>
  )
}

function calcAge(dob?: string) {
  if (!dob) return null
  const ms = Date.now() - new Date(dob).getTime()
  const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25))
  if (years < 1) {
    const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44))
    return `${months} ${months === 1 ? 'mes' : 'meses'}`
  }
  return `${years} año${years !== 1 ? 's' : ''}`
}

function PetPatientCard({ pet, lastVisit }: { pet: any; lastVisit?: string }) {
  const Icon = getSpeciesIcon(pet.species?.name)
  const age = calcAge(pet.date_of_birth)
  const sex = pet.sex === 'male' ? 'Macho' : pet.sex === 'female' ? 'Hembra' : null
  const consultas = pet.service_visits?.length ?? 0
  const meta = [pet.species?.name, pet.breed, age, sex].filter(Boolean).join(' · ')
  const lastVisitDate = lastVisit
    ? new Date(lastVisit).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Sin visitas'

  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="group flex flex-col bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all overflow-hidden"
    >
      <div className="flex items-center gap-4 p-4">
        <div className="w-11 h-11 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 border border-border/50">
          <Icon size={22} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-none">{pet.name}</p>
          <p className="text-xs text-muted-foreground mt-1.5 truncate">{meta || 'Sin datos del paciente'}</p>
        </div>
        <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/20">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Stethoscope size={12} className="text-muted-foreground/40 shrink-0" />
          {consultas} {consultas === 1 ? 'consulta' : 'consultas'}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays size={12} className="text-muted-foreground/40 shrink-0" />
          {lastVisitDate}
        </span>
      </div>
    </Link>
  )
}
