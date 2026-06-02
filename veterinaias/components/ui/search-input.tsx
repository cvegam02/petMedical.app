'use client'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  containerClassName?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  containerClassName = ""
}: SearchInputProps) {
  return (
    <div className={`relative group ${containerClassName}`}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary/50 transition-colors pointer-events-none">
        <Search size={18} strokeWidth={2.5} />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full pl-12 pr-12 py-3.5 text-[15px] font-medium bg-card border border-border rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/[0.04] focus:border-primary/40 transition-all placeholder:text-muted-foreground/40 ${className}`}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60 transition-all"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
