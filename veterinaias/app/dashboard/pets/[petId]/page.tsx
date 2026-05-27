import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MedicalRecordCard } from '@/components/medical-records/MedicalRecordCard'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Plus, Cpu, Cat, Dog, PawPrint, CalendarDays, User, ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

function calcAge(dob: string) {
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'Recién nacido'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years} año${years > 1 ? 's' : ''} y ${rem} mes${rem > 1 ? 'es' : ''}` : `${years} año${years > 1 ? 's' : ''}`
}

export default async function PetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()

  const { data: pet, error } = await (supabase.from('pets') as any)
    .select(`
      id, name, sex, date_of_birth, color, microchip, notes, created_at,
      owner:owner_id(id, full_name),
      species:species_id(name),
      breed:breed_id(name),
      medical_records(
        id, reason, diagnosis, weight_kg, created_at,
        created_by_profile:created_by(full_name),
        prescriptions(id),
        attachments(id),
        addendums(id)
      )
    `)
    .eq('id', petId)
    .order('created_at', { referencedTable: 'medical_records', ascending: false })
    .single()

  if (error || !pet) notFound()

  const owner = pet.owner as any
  const species = pet.species as any
  const breed = pet.breed as any
  const records = (pet.medical_records as any[]) ?? []
  const age = pet.date_of_birth ? calcAge(pet.date_of_birth) : null
  
  const speciesName = species?.name?.toLowerCase() || ''
  const Icon = speciesName.includes('fel') ? Cat : speciesName.includes('can') || speciesName.includes('perr') ? Dog : PawPrint

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href={`/dashboard/owners/${owner?.id}`}
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
            <ChevronLeft size={14} />
          </div>
          <span>Regresar a <span className="font-semibold text-zinc-900">{owner?.full_name}</span></span>
        </Link>
        <Link
          href={`/dashboard/pets/${petId}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'rounded-xl active:scale-[0.97]' })}
        >
          Editar Mascota
        </Link>
      </div>

      {/* Pet Hero Card - Asymmetric Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        {/* Main Info (Pasaporte) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-border shadow-xl shadow-primary/5 p-8 flex flex-col md:flex-row gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
          
          {/* Avatar Area */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-muted/30 border border-border flex items-center justify-center text-primary shadow-inner">
              <Icon size={44} strokeWidth={1.5} />
            </div>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary tracking-widest uppercase`}>
              {species?.name || 'Mascota'}
            </span>
          </div>

          {/* Details Area */}
          <div className="relative z-10 flex-1 space-y-6">
            <header>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{pet.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="font-semibold text-zinc-900">{breed?.name || 'Raza no definida'}</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {SEX_LABELS[pet.sex] || pet.sex}
                </div>
                {pet.color && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                    <div className="text-sm text-muted-foreground">{pet.color}</div>
                  </>
                )}
              </div>
            </header>

            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-50">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                  <CalendarDays size={13} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Edad</span>
                </div>
                <p className="text-sm font-semibold text-zinc-900">{age || '—'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                  <Cpu size={13} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Microchip</span>
                </div>
                <p className="text-sm font-mono font-bold text-primary tracking-tight">{pet.microchip || 'SIN REGISTRO'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info (Duenio / Notas) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User size={14} className="text-primary" />
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Responsable</h4>
            </div>
            <Link 
              href={`/dashboard/owners/${owner?.id}`}
              className="group flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-950 truncate">{owner?.full_name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-mono tracking-tighter">Dueño Principal</p>
              </div>
              <ExternalLink size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </Link>
          </div>

          <div className="bg-primary/5 rounded-3xl border border-primary/10 p-6">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Notas Internas</h4>
            <p className="text-xs text-zinc-600 leading-relaxed italic">
              {pet.notes || 'No hay notas adicionales registradas para este paciente.'}
            </p>
          </div>
        </div>
      </div>

      {/* History Section Header */}
      <div className="flex items-end justify-between mb-8 border-b border-zinc-100 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Expediente Clínico</p>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Consultas Realizadas</h2>
        </div>
        <Link
          href={`/dashboard/pets/${petId}/records/new`}
          className={buttonVariants({ size: 'sm', className: 'rounded-xl shadow-lg shadow-primary/10 active:scale-[0.97] transition-all' })}
        >
          <Plus size={14} className="mr-1.5" />
          Nueva consulta
        </Link>
      </div>

      {/* History List */}
      {records.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border-2 border-dashed border-border/60 bg-muted/10">
          <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center mx-auto mb-4">
            <Plus size={20} className="text-muted-foreground/30" />
          </div>
          <p className="font-bold text-foreground text-lg tracking-tight">Sin historial médico</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[280px] mx-auto">
            Esta mascota no tiene consultas registradas todavía. Comienza su expediente ahora.
          </p>
          <Link 
            href={`/dashboard/pets/${petId}/records/new`} 
            className="mt-6 inline-flex items-center text-sm font-bold text-primary hover:underline"
          >
            Registrar primera consulta <ArrowRight size={14} className="ml-1" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record: any, index: number) => (
            <div 
              key={record.id}
              className="animate-in slide-in-from-bottom-2 duration-300 fill-mode-both"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <MedicalRecordCard record={record} petId={petId} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
