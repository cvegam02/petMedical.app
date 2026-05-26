import { OwnerForm } from '@/components/owners/OwnerForm'

export default function NewOwnerPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nuevo dueño</h1>
      <OwnerForm />
    </div>
  )
}
