-- ============================================================
-- Phase 4 Core Messaging Performance Fixes
-- ============================================================

-- Create a View that pre-computes the latest message for every conversation.
-- This solves the N+1 query problem on the frontend conversation list.
CREATE OR REPLACE VIEW public.conversation_summaries AS
SELECT 
  c.id AS conversation_id,
  c.type AS conversation_type,
  c.name AS conversation_name,
  c.avatar_url AS conversation_avatar_url,
  c.created_at AS conversation_created_at,
  c.updated_at AS conversation_updated_at,
  m.id AS last_message_id,
  m.content AS last_message_content,
  m.media_url AS last_message_media_url,
  m.sent_at AS last_message_sent_at,
  m.sender_id AS last_message_sender_id,
  m.read_at AS last_message_read_at
FROM public.conversations c
LEFT JOIN LATERAL (
  SELECT id, content, media_url, sent_at, sender_id, read_at
  FROM public.messages
  WHERE conversation_id = c.id
  ORDER BY sent_at DESC
  LIMIT 1
) m ON true;

-- Grant permissions for authenticated users to access this view
GRANT SELECT ON public.conversation_summaries TO authenticated;
