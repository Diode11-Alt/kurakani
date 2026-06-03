-- Add reply_to_message_id to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(message_id, user_id, emoji)
);

-- RLS for message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Policy to read reactions (same logic as messages, you can read if you are in the conversation)
CREATE POLICY "Users can read reactions in their conversations" ON message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
    WHERE m.id = message_reactions.message_id AND cm.user_id = auth.uid()
  )
);

-- Policy to add reactions
CREATE POLICY "Users can add reactions" ON message_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
    WHERE m.id = message_reactions.message_id AND cm.user_id = auth.uid()
  )
);

-- Policy to delete reactions
CREATE POLICY "Users can delete their own reactions" ON message_reactions FOR DELETE
USING (user_id = auth.uid());
