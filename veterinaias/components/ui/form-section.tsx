import { cn } from "@/lib/utils"

interface FormSectionProps {
  title: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={cn("px-5 py-5", className)}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-primary/70 whitespace-nowrap">
          {title}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  )
}
