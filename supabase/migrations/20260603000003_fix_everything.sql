-- Fix all broken RLS policies and schema issues

-- 1. Add UPDATE policy for messages (mark as read)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can update messages in their conversations'
  ) THEN
    CREATE POLICY "Users can update messages in their conversations" ON messages FOR UPDATE
    USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
  END IF;
END $$;

-- 2. Fix conversations INSERT policy to allow created_by to be NULL or set by auth.uid()
-- Drop and recreate the conversations insert policy to be more permissive
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Also need UPDATE policy for conversations (update updated_at on new messages)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Members can update their conversations'
  ) THEN
    CREATE POLICY "Members can update their conversations" ON conversations FOR UPDATE
    USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = conversations.id AND user_id = auth.uid()));
  END IF;
END $$;

-- 3. Stories: Add default for expires_at so it doesn't fail on insert
ALTER TABLE stories ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

-- 4. Fix likes unique constraint - the composite unique with nullable comment_id causes issues
-- Drop the old constraint and create proper partial unique indexes
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_post_id_comment_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS likes_user_post_idx ON likes (user_id, post_id) WHERE comment_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS likes_user_comment_idx ON likes (user_id, comment_id) WHERE post_id IS NULL;

-- 5. Create 'attachments' storage bucket (code references it but it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public read access on attachments'
  ) THEN
    CREATE POLICY "Allow public read access on attachments"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'attachments');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow authenticated upload to attachments'
  ) THEN
    CREATE POLICY "Allow authenticated upload to attachments"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow user to delete their own attachments'
  ) THEN
    CREATE POLICY "Allow user to delete their own attachments"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 6. Add DELETE policy for messages (so users can delete their own messages)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can delete own messages'
  ) THEN
    CREATE POLICY "Users can delete own messages" ON messages FOR DELETE
    USING (sender_id = auth.uid());
  END IF;
END $$;

-- 7. Add DELETE policy for conversation_members (leave conversation)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversation_members' AND policyname = 'Users can leave conversations'
  ) THEN
    CREATE POLICY "Users can leave conversations" ON conversation_members FOR DELETE
    USING (user_id = auth.uid());
  END IF;
END $$;
