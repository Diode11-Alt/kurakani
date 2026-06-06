-- Fix conversation insert policy - the original policy name was "Users can create conversations"
-- Our fix migration already dropped and recreated it, but let's be explicit

-- Drop ALL insert policies on conversations to be safe
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'conversations' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON conversations', pol.policyname);
  END LOOP;
END $$;

-- Create a clean insert policy
CREATE POLICY "Authenticated users can create conversations" ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix: the conversations SELECT policy uses a subquery on conversation_members,
-- but when we JUST created the conversation, the member hasn't been added yet.
-- We need to also allow the creator to see their conversation.
DROP POLICY IF EXISTS "Users can read their conversations" ON conversations;
CREATE POLICY "Users can read their conversations" ON conversations FOR SELECT
USING (
  created_by = auth.uid() OR
  auth.uid() IN (SELECT user_id FROM conversation_members WHERE conversation_id = conversations.id)
);
