'use client'
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface FreeTextComboboxProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
}

export function FreeTextCombobox({ value, onChange, options, placeholder, disabled }: FreeTextComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputValue = value ?? ''

  const filtered = inputValue.trim().length > 0
    ? options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputValue}
        onChange={e => { onChange(e.target.value || undefined); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onMouseDown={e => {
                e.preventDefault()
                onChange(opt)
                setOpen(false)
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
