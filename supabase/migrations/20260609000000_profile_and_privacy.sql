-- Profile and Privacy Schema Updates (Phase 4)

-- ─── 1. EXTEND USERS TABLE (PROFILE FEATURES) ──────────────────
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pronouns VARCHAR(50),
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS work TEXT,
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;

-- ─── 2. EXTEND USER_SETTINGS TABLE (PRIVACY FEATURES) ──────────
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS message_privacy VARCHAR(20) DEFAULT 'everyone',
ADD COLUMN IF NOT EXISTS post_privacy VARCHAR(20) DEFAULT 'everyone',
ADD COLUMN IF NOT EXISTS tag_privacy VARCHAR(20) DEFAULT 'everyone',
ADD COLUMN IF NOT EXISTS connections_visibility VARCHAR(20) DEFAULT 'everyone',
ADD COLUMN IF NOT EXISTS off_platform_activity BOOLEAN DEFAULT false;

-- ─── 3. RESTRICTED USERS TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restricted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  restricted_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  restricted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, restricted_user_id)
);

ALTER TABLE public.restricted_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own restrictions" ON public.restricted_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can restrict" ON public.restricted_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrestrict" ON public.restricted_users FOR DELETE USING (auth.uid() = user_id);

-- ─── 4. MUTED USERS TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.muted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  muted_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  muted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, muted_user_id)
);

ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own mutes" ON public.muted_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mute" ON public.muted_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unmute" ON public.muted_users FOR DELETE USING (auth.uid() = user_id);

-- ─── 5. COMMENT FILTERS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comment_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, word)
);

ALTER TABLE public.comment_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own filters" ON public.comment_filters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert filters" ON public.comment_filters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete filters" ON public.comment_filters FOR DELETE USING (auth.uid() = user_id);

-- ─── 6. REPORTS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reported_type VARCHAR(20) NOT NULL, -- 'user', 'post', 'comment'
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can see own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
