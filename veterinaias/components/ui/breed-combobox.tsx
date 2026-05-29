'use client'
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface BreedComboboxProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  suggestions: string[]
  placeholder?: string
  disabled?: boolean
}

export function BreedCombobox({ value, onChange, suggestions, placeholder = 'Ej. Labrador, Persa...', disabled }: BreedComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const inputValue = value ?? ''

  const filtered = inputValue.trim().length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()))
    : suggestions

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
          {filtered.map(breed => (
            <button
              key={breed}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onMouseDown={e => {
                e.preventDefault()
                onChange(breed)
                setOpen(false)
              }}
            >
              {breed}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
