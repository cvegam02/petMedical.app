'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { HeartPulse } from 'lucide-react'
import { HospitalizationTable } from '@/components/servicios/HospitalizationTable'
import { AdmitPatientModal } from '@/components/servicios/AdmitPatientModal'
import { HospitalizationDetailModal } from '@/components/servicios/HospitalizationDetailModal'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'

export default function HospitalizacionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const fromVisitId = searchParams.get('from')
  const fromApptId = searchParams.get('fromAppt')

  const [admitOpen, setAdmitOpen] = useState(false)
  const [detailVisitId, setDetailVisitId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [followUpPetId, setFollowUpPetId] = useState<string | null>(null)

  useEffect(() => {
    if (fromVisitId || fromApptId) {
      setAdmitOpen(true)
    }
  }, [fromVisitId, fromApptId])

  function clearAdmitParams() {
    router.replace('/dashboard/servicios/hospitalizacion')
  }

  function handleAdmitted(hospVisitId: string) {
    clearAdmitParams()
    setDetailVisitId(hospVisitId)
    setDetailOpen(true)
    window.dispatchEvent(new Event('hospitalization:changed'))
  }

  function handleScheduleFollowUp(petId: string) {
    setFollowUpPetId(petId)
    setFollowUpOpen(true)
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-[1.5px] bg-secondary-foreground/20 rounded-full" />
            <p className="text-[10px] font-mono font-bold text-secondary-foreground uppercase tracking-[0.2em]">Servicios</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <HeartPulse size={22} strokeWidth={1.75} className="text-muted-foreground/60" />
            Hospitalización
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Internamiento clínico. Se inicia desde la consulta o cirugía del paciente.
          </p>
        </div>
      </div>

      <HospitalizationTable
        onSelect={id => { setDetailVisitId(id); setDetailOpen(true) }}
      />

      <AdmitPatientModal
        open={admitOpen}
        onOpenChange={v => { setAdmitOpen(v); if (!v) clearAdmitParams() }}
        visitId={fromVisitId}
        appointmentId={fromApptId}
        onAdmitted={handleAdmitted}
      />

      <HospitalizationDetailModal
        visitId={detailVisitId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={() => window.dispatchEvent(new Event('hospitalization:changed'))}
        onScheduleFollowUp={handleScheduleFollowUp}
      />

      {followUpOpen && followUpPetId && (
        <NewAppointmentModal
          isOpen={followUpOpen}
          onClose={() => setFollowUpOpen(false)}
          team={[]}
        />
      )}
    </div>
  )
}
