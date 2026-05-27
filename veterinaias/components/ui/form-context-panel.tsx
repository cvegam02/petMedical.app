import { cn } from "@/lib/utils"

interface FormContextPanelProps {
  children: React.ReactNode
  className?: string
}

export function FormContextPanel({ children, className }: FormContextPanelProps) {
  return (
    <aside className={cn("space-y-4", className)}>
      {children}
    </aside>
  )
}

interface ContextCardProps {
  children: React.ReactNode
  className?: string
}

export function ContextCard({ children, className }: ContextCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-4 space-y-3 text-sm", className)}>
      {children}
    </div>
  )
}
