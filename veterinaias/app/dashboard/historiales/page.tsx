import { PetSearchHistorial } from '@/components/historiales/PetSearchHistorial'

export default function HistorialesPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Expediente</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Historiales médicos</h1>
      </div>
      <PetSearchHistorial />
    </div>
  )
}
