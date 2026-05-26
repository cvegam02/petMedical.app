import { PetForm } from '@/components/pets/PetForm'

export default async function NewPetPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nueva mascota</h1>
      <PetForm ownerId={ownerId} />
    </div>
  )
}
