interface MetricsStripProps {
  inService: number
  hotelActive: number
  total: number
  pendingConfirm: number
  alerts: number
}

export function MetricsStrip({ inService, hotelActive, total, pendingConfirm, alerts }: MetricsStripProps) {
  const base = [
    { value: inService, label: 'En servicio' },
    { value: hotelActive, label: 'Hotel activo' },
    { value: total, label: 'Citas hoy' },
    { value: pendingConfirm, label: 'Por confirmar' },
  ]

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${base.length + (alerts > 0 ? 1 : 0)}, minmax(0, 1fr))` }}>
      {base.map(it => (
        <div key={it.label} className="rounded-xl border border-[#E7EBEF] bg-[#F3F5F7] p-3 text-center">
          <p className="text-2xl font-extrabold tabular-nums text-[#161D24]">{it.value}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#73808C] mt-1">{it.label}</p>
        </div>
      ))}
      {alerts > 0 && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-center">
          <p className="text-2xl font-extrabold tabular-nums text-[#DC2626]">{alerts}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#B91C1C] mt-1">⚠ Alerta{alerts !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}
