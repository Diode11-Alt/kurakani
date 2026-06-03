-- ============================================================
-- Phase 3 Security DB Fixes
-- ============================================================

-- 1. Account Deletion Cascade
-- Tie public.users strictly to auth.users so deletions cascade automatically
ALTER TABLE public.users 
  ADD CONSTRAINT users_auth_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure messages are deleted when their sender is deleted
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
  ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  old_data JSONB
);

-- Protect audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only super admins can read audit logs" ON public.audit_logs FOR SELECT USING (false); -- Set up proper admin roles later if needed

-- Create trigger function for audit logs
CREATE OR REPLACE FUNCTION public.log_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (table_name, record_id, action, performed_by, old_data)
  VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), to_jsonb(OLD));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to critical tables
DROP TRIGGER IF EXISTS audit_users_deletion ON public.users;
CREATE TRIGGER audit_users_deletion
  AFTER DELETE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.log_deletion();

DROP TRIGGER IF EXISTS audit_posts_deletion ON public.posts;
CREATE TRIGGER audit_posts_deletion
  AFTER DELETE ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE public.log_deletion();

DROP TRIGGER IF EXISTS audit_messages_deletion ON public.messages;
CREATE TRIGGER audit_messages_deletion
  AFTER DELETE ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.log_deletion();
