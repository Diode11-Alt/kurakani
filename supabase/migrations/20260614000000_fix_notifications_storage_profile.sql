-- ═══════════════════════════════════════════════════════════════
-- Migration: Fix notifications RLS, storage buckets, profile columns
-- ═══════════════════════════════════════════════════════════════

-- ─── 0. FIX NOTIFICATION TRIGGERS (CRITICAL — RLS block) ────────
-- The trigger functions insert into `notifications` in the user's
-- auth context, but there is no INSERT policy.  Making them
-- SECURITY DEFINER lets the triggers bypass RLS for system-generated
-- notifications while keeping user-facing RLS intact.

CREATE OR REPLACE FUNCTION handle_new_like()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author UUID;
  comment_author UUID;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
    IF post_author IS NOT NULL AND post_author != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, entity_id)
      VALUES (post_author, NEW.user_id, 'like', NEW.post_id);
    END IF;
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT author_id INTO comment_author FROM comments WHERE id = NEW.comment_id;
    IF comment_author IS NOT NULL AND comment_author != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, entity_id)
      VALUES (comment_author, NEW.user_id, 'like', NEW.comment_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_comment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author UUID;
BEGIN
  SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author != NEW.author_id THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (post_author, NEW.author_id, 'comment', NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_follow()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.following_id != NEW.follower_id THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (NEW.following_id, NEW.follower_id, 'follow', NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. STORAGE BUCKETS ─────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─── 2. STORAGE POLICIES — AVATARS ─────────────────────────────

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;

CREATE POLICY "Avatar public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── 3. STORAGE POLICIES — POSTS ────────────────────────────────

DROP POLICY IF EXISTS "Post media public read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post media" ON storage.objects;

CREATE POLICY "Post media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload post media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own post media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'posts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── 4. STORAGE POLICIES — STORIES ──────────────────────────────

DROP POLICY IF EXISTS "Stories public read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own stories" ON storage.objects;

CREATE POLICY "Stories public read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload stories"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own stories"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── 5. USERS TABLE — missing columns ───────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_connection_requests BOOLEAN DEFAULT false;

-- ─── 6. USER_SETTINGS TABLE — missing notification columns ───────

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_preview BOOLEAN DEFAULT false;
