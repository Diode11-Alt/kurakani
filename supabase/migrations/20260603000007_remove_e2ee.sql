-- Remove E2EE requirements and add standard messaging columns
ALTER TABLE messages
  ALTER COLUMN ciphertext DROP NOT NULL,
  ALTER COLUMN ciphertext_type DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT;
