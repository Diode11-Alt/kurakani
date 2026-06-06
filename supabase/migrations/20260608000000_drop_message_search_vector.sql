-- VULN-015 Fix: Drop the search_vector column and its trigger to prevent indexing plaintext of E2EE messages
ALTER TABLE messages DROP COLUMN IF EXISTS search_vector;
DROP TRIGGER IF EXISTS trg_messages_search_vector_update ON messages;
DROP FUNCTION IF EXISTS messages_search_vector_update();
