import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'

export type Alert =
  | { type: 'checkout_overdue'; visitId: string; petName: string; overdueMinutes: number }
  | { type: 'urgent_unconfirmed'; appointmentId: string; petName: string; serviceType: string; minutesUntil: number }

interface Props {
  alert: Alert
}

const SERVICE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  grooming: 'Estética',
  boarding: 'Hotel',
  surgery: 'Cirugía',
  hospitalization: 'Hospitalización',
}

export function AlertBanner({ alert }: Props) {
  const { title, description, href, cta } = (() => {
    if (alert.type === 'checkout_overdue') {
      const h = Math.floor(alert.overdueMinutes / 60)
      const m = alert.overdueMinutes % 60
      const elapsed = h > 0 ? `${h}h ${m > 0 ? `${m}min` : ''}`.trim() : `${m}min`
      return {
        title: `${alert.petName} — Hotel · Salida vencida`,
        description: `Llevan ${elapsed} de retraso en la salida`,
        href: `/dashboard/servicios/hotel/stay/${alert.visitId}`,
        cta: 'Ver estancia →',
      }
    }
    return {
      title: `${alert.petName} — ${SERVICE_LABELS[alert.serviceType] ?? alert.serviceType} · Sin confirmar`,
      description: `Cita en ${alert.minutesUntil} min · Llama al dueño para confirmar`,
      href: `/dashboard/appointments`,
      cta: 'Ver agenda →',
    }
  })()

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2]">
        <TriangleAlert size={15} className="text-[#DC2626]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#DC2626] leading-none">{title}</p>
        <p className="text-xs text-[#7F1D1D] mt-0.5">{description}</p>
      </div>
      <Link
        href={href}
        className="shrink-0 rounded-lg bg-[#DC2626] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#B91C1C] transition-colors"
      >
        {cta}
      </Link>
    </div>
  )
}
