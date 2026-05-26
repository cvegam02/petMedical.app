-- Bucket para archivos adjuntos de expedientes clínicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-attachments',
  'medical-attachments',
  false,
  52428800, -- 50 MB: suficiente para imágenes DICOM, radiografías y PDFs
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom']
)
ON CONFLICT (id) DO NOTHING;

-- Limpiar políticas previas para idempotencia
DROP POLICY IF EXISTS "storage_upload_medical_attachments" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_medical_attachments" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_medical_attachments" ON storage.objects;
-- Nombres anteriores (por si acaso)
DROP POLICY IF EXISTS "authenticated_upload_attachments" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_read_attachments" ON storage.objects;
DROP POLICY IF EXISTS "creator_delete_attachments" ON storage.objects;

-- RLS: solo usuarios autenticados pueden subir
CREATE POLICY "storage_upload_medical_attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-attachments');

-- RLS: solo usuarios autenticados pueden leer
CREATE POLICY "storage_read_medical_attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-attachments');

-- RLS: el creador puede eliminar
-- IMPORTANTE: los archivos deben subirse con path: {user_id}/{record_id}/{filename}
CREATE POLICY "storage_delete_medical_attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medical-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
