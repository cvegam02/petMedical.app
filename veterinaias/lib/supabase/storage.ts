import { createClient } from '@/lib/supabase/client'

const BUCKET = 'medical-attachments'

export async function uploadAttachment(
  file: File,
  userId: string,
  recordId: string
): Promise<{ path: string }> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${recordId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) throw new Error(error.message)
  return { path }
}

export async function getAttachmentUrl(path: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60)

  if (error) throw new Error(error.message)
  if (!data?.signedUrl) throw new Error('No se pudo generar la URL del archivo')
  return data.signedUrl
}
