import { BedDouble } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/utils/time-slots'
import { ActiveBoardingStays } from '@/components/servicios/ActiveBoardingStays'
import { BoardingHistoryTable } from '@/components/servicios/BoardingHistoryTable'
import { HotelUpcomingReservations } from '@/components/servicios/HotelUpcomingReservations'
import { NewHotelReservationButton } from '@/components/servicios/NewHotelReservationButton'

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
    <div className="max-w-5xl mx-auto pb-10">
      <div className="space-y-1 mb-8">
        <div className="flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-primary/30 rounded-full" />
          <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Servicios</p>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BedDouble size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Hotel
          </h1>
          <NewHotelReservationButton team={team ?? []} businessHours={businessHours} />
        </div>
      </div>
      <ActiveBoardingStays />
      <HotelUpcomingReservations />
      <BoardingHistoryTable />
    </div>
  )
}
