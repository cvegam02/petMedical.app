'use client'
import { useState } from 'react'
import { AddendumForm } from './AddendumForm'
import { AttachmentUploader } from './AttachmentUploader'
import { getAttachmentUrl } from '@/lib/supabase/storage'

interface Attachment { id: string; file_name: string; file_type: string; storage_path: string; created_at: string }
interface Addendum { id: string; content: string; created_at: string; created_by_profile: { full_name: string } | null }

interface RecordDetailClientProps {
  recordId: string
  petId: string
  userId: string
  initialAttachments: Attachment[]
  initialAddendums: Addendum[]
}

export function RecordDetailClient({ recordId, petId, userId, initialAttachments, initialAddendums }: RecordDetailClientProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)
  const [addendums, setAddendums] = useState<Addendum[]>(initialAddendums)

  const openAttachment = async (path: string) => {
    try {
      const url = await getAttachmentUrl(path)
      window.open(url, '_blank')
    } catch {
      alert('No se pudo abrir el archivo')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Adjuntos ({attachments.length})</h2>
          <AttachmentUploader
            recordId={recordId}
            userId={userId}
            onUploaded={a => setAttachments(prev => [...prev, a as Attachment])}
          />
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-slate-400">Sin archivos adjuntos.</p>
        ) : (
          <div className="space-y-1">
            {attachments.map(a => (
              <button
                key={a.id}
                onClick={() => openAttachment(a.storage_path)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <span>📎</span> {a.file_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Adendas ({addendums.length})</h2>
          <AddendumForm
            recordId={recordId}
            onAdded={a => setAddendums(prev => [...prev, a as Addendum])}
          />
        </div>
        {addendums.length === 0 ? (
          <p className="text-sm text-slate-400">Sin adendas.</p>
        ) : (
          <div className="space-y-3">
            {addendums.map(a => (
              <div key={a.id} className="border-l-2 border-amber-400 pl-3">
                <p className="text-sm text-slate-700">{a.content}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(a.created_at).toLocaleDateString('es-MX')} · {a.created_by_profile?.full_name ?? 'Veterinario'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
