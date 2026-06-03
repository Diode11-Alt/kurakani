-- Crypto Schema Migration for Supabase

-- ─── IDENTITY KEYS (Signal Protocol) ──────────────────────
CREATE TABLE identity_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_id INTEGER NOT NULL,
  identity_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, device_id)
);

ALTER TABLE identity_keys ENABLE ROW LEVEL SECURITY;
-- Anyone can fetch public identity keys to initiate a chat
CREATE POLICY "Users can read all identity keys" ON identity_keys FOR SELECT USING (true);
CREATE POLICY "Users can insert own identity keys" ON identity_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own identity keys" ON identity_keys FOR UPDATE USING (auth.uid() = user_id);

-- ─── SIGNED PRE-KEYS ────────────────────────────────────────
CREATE TABLE signed_pre_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_id INTEGER NOT NULL,
  key_id INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, device_id)
);

ALTER TABLE signed_pre_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all signed pre-keys" ON signed_pre_keys FOR SELECT USING (true);
CREATE POLICY "Users can insert own signed pre-keys" ON signed_pre_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own signed pre-keys" ON signed_pre_keys FOR UPDATE USING (auth.uid() = user_id);

-- ─── ONE-TIME PREKEYS ──────────────────────────────────────
CREATE TABLE one_time_pre_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_id INTEGER NOT NULL,
  key_id INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE one_time_pre_keys ENABLE ROW LEVEL SECURITY;
-- When someone queries a pre-key, we typically want them to find an unused one.
CREATE POLICY "Users can read unused one time pre-keys" ON one_time_pre_keys FOR SELECT USING (true);
CREATE POLICY "Users can insert own one time pre-keys" ON one_time_pre_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
-- The backend usually marks keys as used, but with Supabase, the client fetching the key needs to mark it as used.
CREATE POLICY "Users can update one time pre-keys (mark as used)" ON one_time_pre_keys FOR UPDATE USING (true);

-- ─── ATTACHMENTS ─────────────────────────────────────────
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  s3_key TEXT NOT NULL,
  content_type VARCHAR(50),
  size_bytes INTEGER,
  iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read attachments for their messages" ON attachments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM messages m 
  JOIN conversation_members cm ON cm.conversation_id = m.conversation_id 
  WHERE m.id = attachments.message_id AND cm.user_id = auth.uid()
));

CREATE POLICY "Users can insert own attachments" ON attachments FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
