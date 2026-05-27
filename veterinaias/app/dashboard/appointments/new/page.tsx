import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'

export default async function NewAppointmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name')

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft size={14} />
        Citas
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
        <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Agenda</p>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-6">Nueva cita</h1>

      <AppointmentForm team={(team as any[]) ?? []} />
    </div>
  )
}
