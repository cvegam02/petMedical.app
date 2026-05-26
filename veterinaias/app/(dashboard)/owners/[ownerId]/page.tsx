import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PetCard } from '@/components/pets/PetCard'
import { Button } from '@/components/ui/button'

export default async function OwnerDetailPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  const supabase = await createClient()

  const { data: owner, error } = await supabase
    .from('owners')
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/dashboard/owners" className="text-sm text-slate-500 hover:text-slate-700 mb-2 block">← Dueños</Link>
          <h1 className="text-2xl font-bold text-slate-900">{owner.full_name}</h1>
          <p className="text-slate-500">{owner.phone}{owner.email ? ` · ${owner.email}` : ''}</p>
          {owner.address && <p className="text-slate-500 text-sm">{owner.address}</p>}
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/owners/${ownerId}/edit`}>Editar</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-800">Mascotas</h2>
        <Button asChild size="sm">
          <Link href={`/dashboard/owners/${ownerId}/pets/new`}>+ Agregar mascota</Link>
        </Button>
      </div>

      {(owner.pets as any[]).length === 0 ? (
        <p className="text-slate-500 text-sm">Este dueño no tiene mascotas registradas.</p>
      ) : (
        <div className="space-y-2">
          {(owner.pets as any[]).map((pet: any) => <PetCard key={pet.id} pet={pet} />)}
        </div>
      )}
    </div>
  )
}
