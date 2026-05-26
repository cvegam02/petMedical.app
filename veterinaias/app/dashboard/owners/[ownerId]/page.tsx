import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PetCard } from '@/components/pets/PetCard'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Phone, Mail, MapPin, Plus } from 'lucide-react'

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
        breed:breed_id(id, name)
      )
    `)
    .eq('id', ownerId)
    .single()

  if (error || !owner) notFound()

  const pets = (owner.pets as any[]) ?? []
  const initials = getInitials(owner.full_name)

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        href="/dashboard/owners"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Dueños
      </Link>

      {/* Owner header card */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-semibold text-primary">{initials}</span>
            </div>

            {/* Details */}
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{owner.full_name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {owner.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone size={12} className="text-muted-foreground/50" />
                    {owner.phone}
                  </span>
                )}
                {owner.email && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail size={12} className="text-muted-foreground/50" />
                    {owner.email}
                  </span>
                )}
                {owner.address && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin size={12} className="text-muted-foreground/50" />
                    {owner.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            href={`/dashboard/owners/${ownerId}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Pets section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-0.5">Pacientes</p>
          <h2 className="text-base font-semibold text-foreground">
            Mascotas
            {pets.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({pets.length})</span>
            )}
          </h2>
        </div>
        <Link
          href={`/dashboard/owners/${ownerId}/pets/new`}
          className={buttonVariants({ size: 'sm' })}
        >
          <Plus size={14} className="mr-1.5" />
          Agregar mascota
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-border">
          <p className="font-medium text-foreground mb-1">Sin mascotas registradas</p>
          <p className="text-sm text-muted-foreground">Este dueño no tiene mascotas aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pets.map((pet: any) => <PetCard key={pet.id} pet={pet} />)}
        </div>
      )}
    </div>
  )
}
