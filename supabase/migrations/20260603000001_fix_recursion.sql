-- Security definer function to avoid infinite recursion
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Recreate policies for conversation_members
DROP POLICY IF EXISTS "Users can see members of their conversations" ON conversation_members;
CREATE POLICY "Users can see members of their conversations" ON conversation_members FOR SELECT
USING (
  user_id = auth.uid() OR
  is_conversation_member(conversation_id)
);

DROP POLICY IF EXISTS "Members can add other members to their conversations" ON conversation_members;
CREATE POLICY "Members can add other members to their conversations"
  ON conversation_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    is_conversation_member(conversation_id) OR
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_members.conversation_id
        AND c.created_by = auth.uid()
    )
  );
