-- ============================================================
-- Phase 2 Social Network Extensions & Security Database Schema
-- ============================================================

-- ==========================================
-- 1. Core Account & Security Modifications
-- ==========================================

-- Alter users table to support granular security and privacy
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- User Sessions (Active session management)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address VARCHAR(45),
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

-- User Blocks (Block list)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);

-- ==========================================
-- 2. Social Interactions & Content
-- ==========================================

-- Nested Threaded Comments
ALTER TABLE public.comments 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- Content Pinning
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Post Reactions
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL, -- 'love', 'haha', 'wow', 'sad', 'angry', 'like'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);

-- Saved Collections
CREATE TABLE IF NOT EXISTS public.saved_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_collections_user ON public.saved_collections(user_id);

ALTER TABLE public.saved_posts 
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.saved_collections(id) ON DELETE SET NULL;

-- Dynamic Stories (24h expiry)
-- Note: stories table already exists, just adding an index if missing
CREATE INDEX IF NOT EXISTS idx_stories_author_id ON public.stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);

-- ==========================================
-- 3. Groups & Pages
-- ==========================================

-- Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  privacy_level VARCHAR(20) DEFAULT 'public', -- 'public', 'private', 'secret'
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Group Members
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Pages (Business / Public Profiles)
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Page Followers
CREATE TABLE IF NOT EXISTS public.page_followers (
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (page_id, user_id)
);

-- ==========================================
-- 4. Chat Enhancements
-- ==========================================

-- Ephemeral Messaging & Customization
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS expires_in_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS theme_color VARCHAR(50),
  ADD COLUMN IF NOT EXISTS wallpaper_url TEXT;

-- Message Reactions
-- Note: message_reactions table already exists from previous migration

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_followers ENABLE ROW LEVEL SECURITY;

-- user_sessions: users can read/manage their own sessions
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions FOR ALL USING (auth.uid() = user_id);

-- user_blocks: users can read/manage their own blocklist
CREATE POLICY "Users can manage their blocklist" ON public.user_blocks FOR ALL USING (auth.uid() = blocker_id);

-- post_reactions: anyone can read, users can insert/update/delete their own
CREATE POLICY "Anyone can read post reactions" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage their post reactions" ON public.post_reactions FOR ALL USING (auth.uid() = user_id);

-- saved_collections: users manage their own
CREATE POLICY "Users manage their own collections" ON public.saved_collections FOR ALL USING (auth.uid() = user_id);

-- groups: anyone can read public groups
CREATE POLICY "Anyone can read public groups" ON public.groups FOR SELECT USING (privacy_level = 'public' OR auth.uid() IN (SELECT user_id FROM public.group_members WHERE group_id = id));
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);

-- group_members: anyone can read, admins can manage
CREATE POLICY "Anyone can read group members" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can join/leave" ON public.group_members FOR ALL USING (auth.uid() = user_id);

-- pages and followers: anyone can read
CREATE POLICY "Anyone can read pages" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Users can manage their own pages" ON public.pages FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can read page followers" ON public.page_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow/unfollow pages" ON public.page_followers FOR ALL USING (auth.uid() = user_id);
