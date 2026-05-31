import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { MedicalRecordCard } from '@/components/medical-records/MedicalRecordCard'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Plus, Cat, Dog, PawPrint, CalendarDays, Cpu, User, ExternalLink, Home, Utensils, ShieldCheck, Users, StickyNote } from 'lucide-react'
import Link from 'next/link'
import { PetCartillaButtons } from '@/components/pets/PetCartillaButtons'
import { PdfDownloadButton } from '@/components/historiales/PdfDownloadButton'
import { PetStatusControl } from '@/components/pets/PetStatusControl'
import type { PetRegistrationStatus } from '@/lib/types/database'

const SEX_LABELS: Record<string, string> = { male: 'Macho', female: 'Hembra', unknown: 'Desconocido' }

function calcAge(dob: string) {
  const months = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'Recién nacido'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years} año${years > 1 ? 's' : ''} y ${rem} mes${rem > 1 ? 'es' : ''}` : `${years} año${years > 1 ? 's' : ''}`
}

function LifeChip({
  icon: Icon,
  label,
  value,
  tone,
  className = '',
}: {
  icon: typeof Home
  label: string
  value: string
  tone?: 'good' | 'warn'
  className?: string
}) {
  const valueTone = tone === 'good' ? 'text-green-600' : tone === 'warn' ? 'text-amber-600' : 'text-foreground'
  return (
    <div className={`rounded-lg border border-border/60 bg-muted/20 p-3 ${className}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} className="text-muted-foreground/50 shrink-0" strokeWidth={1.75} />
        <p className="label-overline text-muted-foreground/50">{label}</p>
      </div>
      <p className={`text-sm font-semibold leading-snug ${valueTone}`}>{value}</p>
    </div>
  )
}

export default async function PetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { redirect('/login'); return null }

  const [petResult, regResult] = await Promise.all([
    (supabase.from('pets') as any)
      .select(`
        id, name, sex, date_of_birth, color, microchip, notes, created_at, sterilized, habitat, feeding, cohabitation, cohabitation_details,
        species:species_id(name),
        breed,
        medical_records(
          id, reason, diagnosis, weight_kg, created_at,
          created_by_profile:attended_by(full_name),
          prescriptions(id),
          attachments(id),
          addendums(id)
        )
      `)
      .eq('id', petId)
      .order('created_at', { referencedTable: 'medical_records', ascending: false })
      .single(),
    (supabase as any).from('pet_registrations')
      .select('status, date_of_death, owner:owner_id(id, full_name, email, phone)')
      .eq('pet_id', petId)
      .maybeSingle(),
  ])

  if (petResult.error?.code === 'PGRST116' || !petResult.data) notFound()
  if (petResult.error) throw petResult.error

  const pet = petResult.data
  const owner = regResult?.data?.owner ?? null
  const petStatus = (regResult?.data?.status ?? 'active') as PetRegistrationStatus
  const dateOfDeath = (regResult?.data?.date_of_death ?? null) as string | null
  const species = pet.species as any
  const breed = pet.breed as string | null
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
        <div className="flex items-center gap-2">
          <PdfDownloadButton petId={petId} />
          <Link
            href={`/dashboard/pets/${petId}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Editar mascota
          </Link>
        </div>
      </div>

      {/* Pet profile card */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="w-11 h-11 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground/50 shrink-0">
            <Icon size={24} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{pet.name}</h1>
              {species?.name && (
                <span className="label-overline text-muted-foreground/50 border border-border px-2 py-0.5 rounded bg-muted/50">{species.name}</span>
              )}
              {petStatus === 'inactive' && (
                <span className="label-overline text-muted-foreground border border-border px-2 py-0.5 rounded bg-muted">Inactivo</span>
              )}
              {petStatus === 'deceased' && (
                <span className="label-overline text-muted-foreground border border-border px-2 py-0.5 rounded bg-muted">
                  Fallecido{dateOfDeath ? ` · ${new Date(dateOfDeath + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {breed || 'Raza no definida'}
              {pet.sex ? ` · ${SEX_LABELS[pet.sex] ?? pet.sex}` : ''}
              {pet.color ? ` · ${pet.color}` : ''}
            </p>
          </div>
          <PetStatusControl petId={petId} initialStatus={petStatus} initialDateOfDeath={dateOfDeath} />
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

        {/* Cartilla */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <p className="label-overline text-muted-foreground/50 mb-2">Cartilla</p>
          <PetCartillaButtons petId={petId} petName={pet.name} />
        </div>

        {pet.notes && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <div className="flex items-center gap-1.5 mb-2">
              <StickyNote size={13} className="text-amber-500/70 shrink-0" strokeWidth={1.75} />
              <p className="label-overline text-muted-foreground/50">Notas internas</p>
            </div>
            <div className="relative rounded-lg border border-amber-200/70 bg-amber-50/50 pl-4 pr-3.5 py-3 overflow-hidden">
              <span className="absolute left-0 inset-y-0 w-1 bg-amber-300/70" aria-hidden />
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{pet.notes}</p>
            </div>
          </div>
        )}

        {(pet.sterilized != null || pet.habitat || pet.feeding || (pet.cohabitation && pet.cohabitation_details)) && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="label-overline text-muted-foreground/50 mb-3">Información de vida</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pet.habitat && <LifeChip icon={Home} label="Dónde vive" value={pet.habitat} />}
              {pet.feeding && <LifeChip icon={Utensils} label="Alimentación" value={pet.feeding} />}
              {pet.sterilized != null && (
                <LifeChip
                  icon={ShieldCheck}
                  label="Esterilizado"
                  value={pet.sterilized ? 'Sí' : 'No'}
                  tone={pet.sterilized ? 'good' : 'warn'}
                />
              )}
              {pet.cohabitation && pet.cohabitation_details && (
                <LifeChip icon={Users} label="Convive con" value={pet.cohabitation_details} className="col-span-2 sm:col-span-3" />
              )}
            </div>
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
          <h2 className="text-lg font-bold font-heading text-foreground">Consultas realizadas</h2>
        </div>
        <Link
          href={`/dashboard/pets/${petId}/records/new`}
          className={buttonVariants({ size: 'sm' })}
        >
          <Plus size={14} />
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
            className={buttonVariants({ size: 'sm', className: 'mt-5' })}
          >
            <Plus size={13} />
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
