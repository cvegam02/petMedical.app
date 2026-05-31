'use client'
import { useState } from 'react'
import { format, parse, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateInputProps {
  value?: string          // stored as YYYY-MM-DD
  onChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
  fromYear?: number
  toYear?: number
}

export function DateInput({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  disabled,
  className,
  fromYear = 1990,
  toYear = new Date().getFullYear(),
}: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [inputText, setInputText] = useState(() =>
    value ? format(new Date(value + 'T12:00:00'), 'dd/MM/yyyy') : ''
  )

  const selected = value ? new Date(value + 'T12:00:00') : undefined

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d/]/g, '')

    // Auto-insert slashes as user types
    if (raw.length === 2 && inputText.length === 1) raw = raw + '/'
    if (raw.length === 5 && inputText.length === 4) raw = raw + '/'

    setInputText(raw)

    if (raw === '') { onChange(undefined); return }

    const parsed = parse(raw, 'dd/MM/yyyy', new Date())
    if (isValid(parsed) && raw.length === 10) {
      onChange(format(parsed, 'yyyy-MM-dd'))
    }
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (date) {
      setInputText(format(date, 'dd/MM/yyyy'))
      onChange(format(date, 'yyyy-MM-dd'))
    } else {
      setInputText('')
      onChange(undefined)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <Input
          value={inputText}
          onChange={handleInputChange}
          placeholder={placeholder}
          maxLength={10}
          className="pr-8"
        />
        <PopoverTrigger className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          <CalendarIcon size={14} />
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleCalendarSelect}
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
          disabled={disabled}
          locale={es}
          defaultMonth={selected ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}
