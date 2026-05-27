import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MedicalRecordCard } from '@/components/medical-records/MedicalRecordCard'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Plus, Cat, Dog, PawPrint, CalendarDays, Cpu, User, ExternalLink } from 'lucide-react'
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
    <div className="max-w-4xl mx-auto pb-10">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href={`/dashboard/owners/${owner?.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          {owner?.full_name ?? 'Dueño'}
        </Link>
        <Link
          href={`/dashboard/pets/${petId}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Editar mascota
        </Link>
      </div>

      {/* Pet profile card */}
      <div className="bg-white rounded-xl border border-border p-6 mb-8 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="w-11 h-11 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground/50 shrink-0">
            <Icon size={24} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{pet.name}</h1>
              {species?.name && (
                <span className="label-overline text-muted-foreground/50 border border-border px-2 py-0.5 rounded bg-muted/50">{species.name}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {breed?.name || 'Raza no definida'}
              {pet.sex ? ` · ${SEX_LABELS[pet.sex] ?? pet.sex}` : ''}
              {pet.color ? ` · ${pet.color}` : ''}
            </p>
          </div>
        </div>

        {/* Data grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 mt-6 pt-5 border-t border-border/60 divide-x divide-border/60">
          <div className="px-4 first:pl-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={11} className="text-muted-foreground/40" />
              <p className="label-overline text-muted-foreground/50">Edad</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{age || '—'}</p>
          </div>
          <div className="px-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Cpu size={11} className="text-muted-foreground/40" />
              <p className="label-overline text-muted-foreground/50">Microchip</p>
            </div>
            <p className="text-sm font-mono font-bold text-foreground">{pet.microchip || '—'}</p>
          </div>
          <div className="px-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <User size={11} className="text-muted-foreground/40" />
              <p className="label-overline text-muted-foreground/50">Responsable</p>
            </div>
            <Link
              href={`/dashboard/owners/${owner?.id}`}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate"
            >
              {owner?.full_name ?? '—'}
              <ExternalLink size={11} className="shrink-0 opacity-50" />
            </Link>
          </div>
          <div className="px-4 space-y-1">
            <p className="label-overline text-muted-foreground/50">Consultas</p>
            <p className="text-sm font-semibold text-foreground">{records.length}</p>
          </div>
        </div>

        {pet.notes && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="label-overline text-muted-foreground/50 mb-1.5">Notas internas</p>
            <p className="text-sm text-muted-foreground italic leading-relaxed">{pet.notes}</p>
          </div>
        )}
      </div>

      {/* History section */}
      <div className="flex items-end justify-between mb-6 pb-5 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Expediente Clínico</p>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Consultas realizadas</h2>
        </div>
        <Link
          href={`/dashboard/pets/${petId}/records/new`}
          className={buttonVariants({ size: 'sm', className: 'shadow-sm active:scale-[0.97] transition-all' })}
        >
          <Plus size={14} className="mr-1.5" />
          Nueva consulta
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
          <p className="font-bold text-foreground">Sin historial médico</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[260px] mx-auto">
            Esta mascota no tiene consultas registradas todavía.
          </p>
          <Link
            href={`/dashboard/pets/${petId}/records/new`}
            className="mt-5 inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all active:scale-[0.96]"
          >
            <Plus size={13} className="mr-1.5" />
            Registrar primera consulta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record: any, index: number) => (
            <div
              key={record.id}
              className="animate-in slide-in-from-bottom-2 duration-300 fill-mode-both"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <MedicalRecordCard record={record} petId={petId} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
