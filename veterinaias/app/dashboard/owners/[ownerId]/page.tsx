import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PetCard } from '@/components/pets/PetCard'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Phone, Mail, MapPin, Plus, User, Info, ArrowRight, Cat, Dog, PawPrint, CalendarDays, Cpu, ExternalLink } from 'lucide-react'

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default async function OwnerDetailPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner, error } = await (supabase.from('owners') as any)
    .select(`
      id, full_name, email, phone, address, created_at,
      pets(
        id, name, sex, date_of_birth, color, microchip,
        species:species_id(id, name),
        breed:breed_id(id, name),
        medical_records(created_at)
      )
    `)
    .eq('id', ownerId)
    .single()

  if (error || !owner) notFound()

  const pets = (owner.pets as any[]) ?? []
  const initials = getInitials(owner.full_name)

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* ... (Navigation Header and Profile Card remain same) ... */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard/owners"
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
            <ChevronLeft size={14} />
          </div>
          <span>Regresar al <span className="font-semibold text-zinc-900">Directorio</span></span>
        </Link>
        <Link
          href={`/dashboard/owners/${ownerId}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'rounded-xl active:scale-[0.97]' })}
        >
          Editar Perfil
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-8 bg-white rounded-3xl border border-border shadow-xl shadow-primary/[0.03] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-24 h-24 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 shadow-inner">
              <span className="text-3xl font-bold text-primary tracking-tighter">{initials}</span>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{owner.full_name}</h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground/60 border border-border/50 uppercase">Responsable</span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground/60 mt-2 uppercase tracking-[0.2em]">
                Cliente ID: <span className="text-primary/60">{owner.id.split('-')[0]}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-8 border-t border-zinc-50">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Phone size={10} className="text-primary/60" /> Teléfono
                  </p>
                  <p className="text-sm font-mono font-bold text-zinc-900 tracking-tight tabular-nums">{owner.phone || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Mail size={10} className="text-primary/60" /> Correo Electrónico
                  </p>
                  <p className="text-sm font-medium text-zinc-600 truncate">{owner.email || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary/5 rounded-3xl border border-primary/10 p-8 flex flex-col items-center justify-center text-center">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] mb-4">Pacientes Activos</h4>
            <div className="text-5xl font-bold text-primary tracking-tighter mb-2">{pets.length}</div>
            <p className="text-xs text-primary/60 font-medium uppercase tracking-widest">Registrados</p>
          </div>
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-primary/60" />
                <h4 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">Nota Técnica</h4>
             </div>
             <p className="text-xs text-zinc-500 leading-relaxed italic">
               Miembro desde {new Date(owner.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })}.
             </p>
          </div>
        </div>
      </div>

      {/* Patients Section */}
      <div className="flex items-end justify-between mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Pacientes</p>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Expedientes del Cliente</h2>
        </div>
        <Link
          href={`/dashboard/owners/${ownerId}/pets/new`}
          className={buttonVariants({ size: 'sm', className: 'rounded-xl shadow-lg shadow-primary/10 active:scale-[0.97]' })}
        >
          <Plus size={14} className="mr-1.5" />
          Nueva Mascota
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="font-bold text-foreground text-lg tracking-tight">Sin pacientes asociados</p>
          <p className="text-sm text-muted-foreground mt-1">Este dueño no tiene mascotas registradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pets.map((pet: any, index: number) => {
            const lastVisit = pet.medical_records?.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]?.created_at

            return (
              <div 
                key={pet.id} 
                className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                style={{ animationDelay: `${index * 80}ms` }}
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

function PetPatientCard({ pet, lastVisit }: { pet: any, lastVisit?: string }) {
  const Icon = pet.species?.name?.toLowerCase().includes('fel') ? Cat : pet.species?.name?.toLowerCase().includes('can') ? Dog : PawPrint
  const lastVisitDate = lastVisit ? new Date(lastVisit).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : 'Sin visitas'

  return (
    <Link 
      href={`/dashboard/pets/${pet.id}`}
      className="group flex flex-col p-6 bg-white rounded-[2rem] border border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md active:scale-[0.98] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.03] rounded-full -mr-8 -mt-8 group-hover:bg-primary/[0.06] transition-colors" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors border border-border/50">
          <Icon size={24} strokeWidth={1.5} />
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">Última Visita</p>
          <p className="text-[11px] font-mono font-bold text-zinc-600 mt-1 uppercase group-hover:text-primary transition-colors">{lastVisitDate}</p>
        </div>
      </div>

      <div className="mt-6 relative z-10">
        <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{pet.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {pet.breed?.name || 'Raza no definida'} · {pet.sex === 'male' ? 'Macho' : pet.sex === 'female' ? 'Hembra' : '—'}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-50 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Expediente Clínico</p>
        </div>
        <ArrowRight size={14} className="text-zinc-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  )
}
