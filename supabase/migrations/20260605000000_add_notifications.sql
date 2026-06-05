CREATE TYPE notification_type AS ENUM ('like', 'comment', 'follow', 'friend_request', 'request_accepted', 'post_share');

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Like Trigger
CREATE OR REPLACE FUNCTION handle_new_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
  comment_author UUID;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
    IF post_author != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, entity_id)
      VALUES (post_author, NEW.user_id, 'like', NEW.post_id);
    END IF;
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT author_id INTO comment_author FROM comments WHERE id = NEW.comment_id;
    IF comment_author != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, entity_id)
      VALUES (comment_author, NEW.user_id, 'like', NEW.comment_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_like_created ON likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_like();

-- Comment Trigger
CREATE OR REPLACE FUNCTION handle_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
BEGIN
  SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author != NEW.author_id THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (post_author, NEW.author_id, 'comment', NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_created ON comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_comment();

-- Follow Trigger
CREATE OR REPLACE FUNCTION handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, entity_id)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_follow_created ON follows;
CREATE TRIGGER on_follow_created
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_follow();


