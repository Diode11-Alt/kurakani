-- ============================================================
-- Phase 5 Core Features
-- ============================================================

-- Add tsvector column for full-text search on messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create a function to update the search_vector
CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
BEGIN
  -- We use coalesce to handle null content
  NEW.search_vector := to_tsvector('english', coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_vector on insert or update
DROP TRIGGER IF EXISTS trg_messages_search_vector_update ON public.messages;
CREATE TRIGGER trg_messages_search_vector_update
  BEFORE INSERT OR UPDATE OF content
  ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION messages_search_vector_update();

-- Create a GIN index on the search vector for blazing fast searches
CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON public.messages USING GIN(search_vector);

-- Backfill existing messages
UPDATE public.messages SET search_vector = to_tsvector('english', coalesce(content, ''));
