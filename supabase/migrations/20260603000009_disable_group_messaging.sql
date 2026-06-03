-- Disable Group Messaging Security Migration
CREATE OR REPLACE FUNCTION check_not_group_conversation()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM conversations WHERE id = NEW.conversation_id AND type = 'group') THEN
        RAISE EXCEPTION 'Group messaging is currently disabled for security review.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER block_group_members_insert
BEFORE INSERT ON conversation_members
FOR EACH ROW
EXECUTE FUNCTION check_not_group_conversation();
