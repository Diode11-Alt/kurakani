-- Phase 5.6: Sender Decryption Fix

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sender_ciphertext TEXT,
ADD COLUMN IF NOT EXISTS sender_ciphertext_type INTEGER;
