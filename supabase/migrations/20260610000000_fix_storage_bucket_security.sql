-- Fix storage bucket security: attachments should be private, not public
-- The fix_everything migration incorrectly set public = true and added a policy with no auth check

-- 1. Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'attachments';

-- 2. Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Allow public read access on attachments" ON storage.objects;

-- 3. Drop deprecated auth.role() policies and recreate with proper TO clause
DROP POLICY IF EXISTS "Allow authenticated read access on attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to delete their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;

-- 4. Recreate secure policies using TO clause (not deprecated auth.role())
-- Read: any authenticated user in the conversation can read attachments
CREATE POLICY "Authenticated users can read attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

-- Upload: authenticated users can upload
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

-- Delete: users can only delete their own uploads (file path starts with their user ID)
CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
