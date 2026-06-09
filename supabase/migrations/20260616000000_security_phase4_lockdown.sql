-- Phase 4: Database Lockdown
-- Permanently enforce E2EE by dropping server-side plaintexts/keys.

-- 1. Drop existing view to allow schema changes
DROP VIEW IF EXISTS public.conversation_summaries;

-- 2. Drop the plaintext and decryption key columns from messages
ALTER TABLE public.messages
  DROP COLUMN IF EXISTS ciphertext_plaintext_legacy,
  DROP COLUMN IF EXISTS attachment_key,
  DROP COLUMN IF EXISTS attachment_iv;

-- 3. Recreate the conversation_summaries view without the plaintext content column
CREATE VIEW public.conversation_summaries AS
SELECT 
  c.id AS conversation_id,
  c.type AS conversation_type,
  c.name AS conversation_name,
  c.avatar_url AS conversation_avatar_url,
  c.created_at AS conversation_created_at,
  c.updated_at AS conversation_updated_at,
  m.id AS last_message_id,
  m.media_url AS last_message_media_url,
  m.sent_at AS last_message_sent_at,
  m.sender_id AS last_message_sender_id,
  m.read_at AS last_message_read_at
FROM public.conversations c
LEFT JOIN LATERAL (
  SELECT id, media_url, sent_at, sender_id, read_at
  FROM public.messages
  WHERE conversation_id = c.id
  ORDER BY sent_at DESC
  LIMIT 1
) m ON true;

GRANT SELECT ON public.conversation_summaries TO authenticated;

-- 4. Apply Rate Limiting to Messages Table (Max 60 per minute per user)
CREATE OR REPLACE FUNCTION enforce_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM messages
  WHERE sender_id = NEW.sender_id
    AND sent_at > (now() - interval '1 minute');

  IF recent_count > 60 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Please wait before sending more messages.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_message_rate_limit ON messages;
CREATE TRIGGER check_message_rate_limit
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_message_rate_limit();
