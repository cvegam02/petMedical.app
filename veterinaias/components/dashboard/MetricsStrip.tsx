interface MetricsStripProps {
  inService: number
  total: number
  completed: number
  pendingConfirm: number
  overdue: number
}

export function MetricsStrip({ inService, total, completed, pendingConfirm, overdue }: MetricsStripProps) {
  const items = [
    { value: inService, label: 'En servicio', valueClass: 'text-amber-700', boxClass: 'bg-amber-50 border-amber-100' },
    { value: total, label: 'Hoy', valueClass: 'text-foreground', boxClass: 'bg-card border-border' },
    { value: completed, label: 'Listas', valueClass: 'text-green-700', boxClass: 'bg-green-50 border-green-100' },
    { value: pendingConfirm, label: 'Por confirmar', valueClass: 'text-amber-700', boxClass: 'bg-amber-50 border-amber-100' },
    { value: overdue, label: 'Vencidas', valueClass: 'text-orange-600', boxClass: 'bg-orange-50 border-orange-100' },
  ]
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map(it => (
        <div key={it.label} className={`rounded-xl border p-3 text-center ${it.boxClass}`}>
          <p className={`text-xl font-bold tabular-nums ${it.valueClass}`}>{it.value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{it.label}</p>
        </div>
      ))}
    </div>
  )
}
