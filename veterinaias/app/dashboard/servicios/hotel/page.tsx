import { BedDouble } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { ActiveBoardingStays } from '@/components/servicios/ActiveBoardingStays'
import { BoardingHistoryTable } from '@/components/servicios/BoardingHistoryTable'
import { HotelUpcomingReservations } from '@/components/servicios/HotelUpcomingReservations'
import { NewAppointmentButton } from '@/components/appointments/NewAppointmentButton'

export default async function HotelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(settings)')
    .eq('id', user!.id)
    .single() as any

  const businessHours = (profile?.tenants as any)?.settings?.business_hours ?? DEFAULT_BUSINESS_HOURS

  const { data: team } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('tenant_id', profile?.tenant_id ?? '')
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
            <BedDouble size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Hotel
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Hospedaje y cuidado de mascotas durante su estadía en la clínica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NewAppointmentButton
            team={team ?? []}
            businessHours={businessHours}
            initialAppointmentType="boarding"
            label="Nueva reserva"
          />
        </div>
      </div>
      <ActiveBoardingStays />
      <HotelUpcomingReservations />
      <BoardingHistoryTable />
    </div>
  )
}
