-- Bucket para archivos adjuntos de expedientes clínicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-attachments',
  'medical-attachments',
  false,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/dicom']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: solo usuarios autenticados pueden subir
CREATE POLICY "authenticated_upload_attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-attachments');

-- RLS: solo usuarios autenticados pueden leer
CREATE POLICY "authenticated_read_attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-attachments');

-- RLS: el creador puede eliminar (path empieza con su user_id)
CREATE POLICY "creator_delete_attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medical-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
