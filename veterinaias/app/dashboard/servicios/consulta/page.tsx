import { Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ConsultationList } from '@/components/servicios/ConsultationList'

export default async function ConsultaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single() as any

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .neq('role', 'assistant')
    .order('full_name') as { data: { id: string; full_name: string }[] | null }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">Servicios</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Stethoscope size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Consultas
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Historial de consultas médicas registradas en la clínica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/records/new"
            className={buttonVariants({})}
          >
            + Nueva consulta
          </Link>
        </div>
      </div>
      <ConsultationList team={team ?? []} />
    </div>
  )
}
