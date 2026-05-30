export const APPOINTMENT_STATUS_CONFIG: Record<string, { label: string; className: string; stripe: string }> = {
  scheduled: { label: 'Programada',     className: 'bg-muted text-muted-foreground border-border',             stripe: 'bg-muted-foreground/40' },
  confirmed: { label: 'Confirmada',     className: 'bg-primary/10 text-primary border-primary/20',             stripe: 'bg-primary' },
  completed: { label: 'Completada',     className: 'bg-primary/20 text-primary border-primary/30',             stripe: 'bg-primary/60' },
  cancelled: { label: 'Cancelada',      className: 'bg-destructive/10 text-destructive border-destructive/20', stripe: 'bg-destructive' },
  no_show:   { label: 'No se presentó', className: 'bg-orange-50 text-orange-600 border-orange-200',           stripe: 'bg-orange-400' },
}
