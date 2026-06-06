-- Add attachment encryption metadata columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_key TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_iv TEXT;
