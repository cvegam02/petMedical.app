'use client'
import { useRef, useState } from 'react'
import { uploadAttachment } from '@/lib/supabase/storage'
import { Button } from '@/components/ui/button'

interface AttachmentUploaderProps {
  recordId: string
  userId: string
  onUploaded: (attachment: { id: string; file_name: string; file_type: string; storage_path: string }) => void
}

export function AttachmentUploader({ recordId, userId, onUploaded }: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const { path } = await uploadAttachment(file, userId, recordId)
      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: path,
          file_name: file.name,
          file_type: file.type,
          medical_record_id: recordId,
        }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error); return }
      onUploaded(json.data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir el archivo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Subiendo...' : '+ Adjuntar archivo'}
      </Button>
    </div>
  )
}
