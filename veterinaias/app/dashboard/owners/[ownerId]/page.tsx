import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PetCard } from '@/components/pets/PetCard'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Phone, Mail, MapPin, Plus, Cat, Dog, PawPrint, CalendarDays, Stethoscope } from 'lucide-react'

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
        medical_records(created_at)
      )
    `)
    .eq('owner_id', ownerId)

  const pets = (registrations ?? []).map((reg: any) => reg.pet).filter(Boolean)
  const initials = getInitials(owner.full_name)

  const allRecords = pets.flatMap((p: any) => p.medical_records ?? [])
  const totalConsultas = allRecords.length
  const lastVisitTs = allRecords.length
    ? Math.max(...allRecords.map((r: any) => new Date(r.created_at).getTime()))
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
              <span className="label-overline text-muted-foreground/30 ml-auto font-mono">{owner.id.split('-')[0]}</span>
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
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Pacientes</p>
          </div>
          <h2 className="text-lg font-bold font-heading text-foreground">Mascotas registradas</h2>
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
            const lastVisit = pet.medical_records?.sort((a: any, b: any) =>
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

function PetPatientCard({ pet, lastVisit }: { pet: any; lastVisit?: string }) {
  const speciesName = pet.species?.name?.toLowerCase() || ''
  const Icon = speciesName.includes('fel') ? Cat : speciesName.includes('can') || speciesName.includes('perr') ? Dog : PawPrint
  const lastVisitDate = lastVisit
    ? new Date(lastVisit).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    : 'Sin visitas'

  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="group flex items-center gap-4 bg-card p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 border border-border/50">
        <Icon size={20} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-none">{pet.name}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {pet.breed || 'Raza no definida'} · {pet.sex === 'male' ? 'Macho' : pet.sex === 'female' ? 'Hembra' : '—'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="label-overline text-muted-foreground/40">Última visita</p>
        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{lastVisitDate}</p>
      </div>
      <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
    </Link>
  )
}
