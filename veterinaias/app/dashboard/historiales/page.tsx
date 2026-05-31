import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  PetSearchHistorial,
  type HistorialMetric,
  type RecentConsultation,
} from '@/components/historiales/PetSearchHistorial'

export default async function HistorialesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single() as any

  const tenantId = profile?.tenant_id as string | null

  let metrics: HistorialMetric[] = [
    { label: 'Consultas esta semana', value: 0 },
    { label: 'Consultas este mes', value: 0 },
    { label: 'Total de expedientes', value: 0 },
  ]
  let recent: RecentConsultation[] = []

  if (tenantId) {
    const now = new Date()
    const startOfWeek = new Date(now)
    const dayOffset = (now.getDay() + 6) % 7 // lunes como inicio de semana
    startOfWeek.setDate(now.getDate() - dayOffset)
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [weekRes, monthRes, totalRes, recentRes] = await Promise.all([
      (supabase.from('medical_records') as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfWeek.toISOString()),
      (supabase.from('medical_records') as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfMonth.toISOString()),
      (supabase.from('medical_records') as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      (supabase.from('medical_records') as any)
        .select('id, reason, created_at, pet:pet_id(id, name, species:species_id(name)), created_by_profile:created_by(full_name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    metrics = [
      { label: 'Consultas esta semana', value: weekRes.count ?? 0 },
      { label: 'Consultas este mes', value: monthRes.count ?? 0 },
      { label: 'Total de expedientes', value: totalRes.count ?? 0 },
    ]

    recent = ((recentRes.data ?? []) as any[]).map(r => ({
      id: r.id,
      reason: r.reason,
      created_at: r.created_at,
      petId: r.pet?.id ?? null,
      petName: r.pet?.name ?? '—',
      speciesName: r.pet?.species?.name ?? null,
      doctor: r.created_by_profile?.full_name ?? null,
    }))
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Expediente</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Historiales médicos</h1>
        <p className="text-sm text-muted-foreground">
          Busca el expediente completo de cualquier paciente o retoma una consulta reciente.
        </p>
      </div>
      <PetSearchHistorial metrics={metrics} recent={recent} />
    </div>
  )
}
