-- Fix polymorphic likes constraint to prevent bad data
-- Ensures a like is either on a post OR a comment, but never both or neither

-- 1. Remove rows that violate the constraint (if any exist)
DELETE FROM likes 
WHERE (post_id IS NOT NULL AND comment_id IS NOT NULL)
   OR (post_id IS NULL AND comment_id IS NULL);

-- 2. Add the CHECK constraint
ALTER TABLE likes ADD CONSTRAINT likes_post_or_comment_check 
  CHECK ( (post_id IS NULL) <> (comment_id IS NULL) );
