-- Fix: Ensure audit_logs exists and policy USING (false) is dropped
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  old_data JSONB
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Fix: audit_logs policy USING (false) blocks all reads
DROP POLICY IF EXISTS "Only super admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Service role reads audit logs" ON public.audit_logs
  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Admins insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true); -- trigger-only inserts, no user writes
