'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Search, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WalkInOwnerValue } from '@/lib/validations/medical-record'

interface Owner { id: string; full_name: string; phone: string | null }

interface OwnerResolutionModalProps {
  isOpen: boolean
  onConfirm: (owner: WalkInOwnerValue) => void
  onClose: () => void
  isSubmitting: boolean
}

export function OwnerResolutionModal({ isOpen, onConfirm, onClose, isSubmitting }: OwnerResolutionModalProps) {
  const [mode, setMode] = useState<'search' | 'new'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Owner[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [nameError, setNameError] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const preloadedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      setQuery(''); setResults([]); setMode('search')
      setNewName(''); setNewPhone(''); setNewEmail(''); setNameError('')
      preloadedRef.current = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || query.length < 1) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setIsSearching(true)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/owners?q=${encodeURIComponent(query)}&limit=5`)
        .then(r => r.json())
        .then(json => setResults(json.data ?? []))
        .catch(() => {})
        .finally(() => setIsSearching(false))
    }, 150)
  }, [query, isOpen])

  function preload() {
    if (preloadedRef.current || query.length > 0) return
    preloadedRef.current = true
    fetch('/api/owners?limit=5')
      .then(r => r.json())
      .then(json => setResults(json.data ?? []))
      .catch(() => {})
  }

  function handleNewSubmit() {
    if (!newName.trim()) { setNameError('Nombre es requerido'); return }
    setNameError('')
    onConfirm({ full_name: newName.trim(), phone: newPhone || undefined, email: newEmail || undefined })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">Finalizar consulta</p>
            <h2 className="text-lg font-semibold text-foreground mt-0.5">¿A quién le pertenece?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border mx-6">
          <button
            type="button"
            onClick={() => setMode('search')}
            className={`flex-1 pb-2 text-xs font-medium transition-colors ${mode === 'search' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            Buscar existente
          </button>
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`flex-1 pb-2 text-xs font-medium transition-colors ${mode === 'new' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            Registrar nuevo
          </button>
        </div>

        <div className="px-6 py-5">
          {mode === 'search' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={preload}
                  placeholder="Nombre o teléfono..."
                  className="pl-9"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {results.map(owner => (
                  <button
                    key={owner.id}
                    type="button"
                    onClick={() => onConfirm({ id: owner.id })}
                    disabled={isSubmitting}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{owner.full_name}</p>
                    {owner.phone && <p className="text-xs text-muted-foreground">{owner.phone}</p>}
                  </button>
                ))}
                {results.length === 0 && !isSearching && query.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Sin resultados</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMode('new')}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline w-full justify-center"
              >
                <UserPlus size={12} />
                No está en la lista — registrar nuevo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="new_owner_name">Nombre <span className="text-destructive">*</span></Label>
                <Input
                  id="new_owner_name"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setNameError('') }}
                  placeholder="Nombre completo del dueño"
                  autoFocus
                />
                {nameError && <p className="text-destructive text-xs">{nameError}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="new_owner_phone">Teléfono</Label>
                <Input
                  id="new_owner_phone"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="55-1234-5678"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new_owner_email">Email</Label>
                <Input
                  id="new_owner_email"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <Button
                className="w-full mt-1"
                onClick={handleNewSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar y finalizar'}
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-center">
          <button
            type="button"
            onClick={() => onConfirm(null)}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            Guardar sin dueño por ahora
          </button>
        </div>
      </div>
    </div>
  )
}
