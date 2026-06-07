-- Phase 1 Security Fixes: Stop Active Data Leakage

-- 1. Rename messages.content to messages.ciphertext_plaintext_legacy
ALTER TABLE messages RENAME COLUMN content TO ciphertext_plaintext_legacy;

-- 2. Fix audit_logs INSERT policy
DROP POLICY IF EXISTS "Admins insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role inserts audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 3. Fix storage.objects policy for attachments
DROP POLICY IF EXISTS "Authenticated users can read attachments" ON storage.objects;
CREATE POLICY "Only conversation members can read attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'attachments' AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.media_url = name
        AND cm.user_id = auth.uid()
    )
  );

-- 4. Fix one_time_pre_keys SELECT policy
DROP POLICY IF EXISTS "Users can read unused one time pre-keys" ON one_time_pre_keys;
-- We do not add a replacement SELECT policy for authenticated users, 
-- as they must use the fetch_otpk RPC to get keys securely.
