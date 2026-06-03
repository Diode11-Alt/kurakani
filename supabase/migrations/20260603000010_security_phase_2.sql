-- #014 Input Length Validation
ALTER TABLE messages ADD CONSTRAINT msg_length_check CHECK (char_length(content) <= 4000);
ALTER TABLE posts ADD CONSTRAINT post_length_check CHECK (char_length(content) <= 2000);

-- #020 Supabase Anon Key Exposed in Client Bundle (RLS Audit)
DROP POLICY IF EXISTS "Users can read all profiles" ON users;
CREATE POLICY "Users can read all profiles" ON users FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
CREATE POLICY "Anyone can read posts" ON posts FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read likes" ON likes;
CREATE POLICY "Anyone can read likes" ON likes FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read follows" ON follows;
CREATE POLICY "Anyone can read follows" ON follows FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read all identity keys" ON identity_keys;
CREATE POLICY "Users can read all identity keys" ON identity_keys FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read all signed pre-keys" ON signed_pre_keys;
CREATE POLICY "Users can read all signed pre-keys" ON signed_pre_keys FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read unused one time pre-keys" ON one_time_pre_keys;
CREATE POLICY "Users can read unused one time pre-keys" ON one_time_pre_keys FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read shares" ON post_shares;
CREATE POLICY "Anyone can read shares" ON post_shares FOR SELECT USING (auth.uid() IS NOT NULL);

-- #007 Public S3/Supabase Storage Buckets (chat-media)
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

DROP POLICY IF EXISTS "Allow public read access on chat-media" ON storage.objects;
CREATE POLICY "Allow authenticated read access on chat-media" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media' AND auth.role() = 'authenticated');
