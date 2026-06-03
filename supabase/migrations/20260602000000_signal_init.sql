-- Initial Schema Migration for Supabase

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop conflicting legacy tables if they exist
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS blocked_users CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- ─── USERS ────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- Keep for legacy or Supabase Auth mapping
  phone_hash VARCHAR(128) UNIQUE,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  profile_key TEXT,
  registration_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_seen_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  deletion_scheduled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_phone_hash_idx ON users(phone_hash);
CREATE INDEX users_username_idx ON users(username);

-- Set up RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- ─── CONVERSATIONS ─────────────────────────────────────────
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(10) NOT NULL,
  name VARCHAR(100),
  avatar_url TEXT,
  created_by UUID REFERENCES users(id),
  invite_token VARCHAR(64) UNIQUE,
  invite_token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ─── CONVERSATION MEMBERS ──────────────────────────────────
CREATE TABLE conversation_members (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(10) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  left_at TIMESTAMP WITH TIME ZONE,
  last_read_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- Conversations RLS: A user can see conversations they are a member of.
CREATE POLICY "Users can read their conversations" ON conversations FOR SELECT 
USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = conversations.id AND user_id = auth.uid()));

CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Conversation Members RLS
CREATE POLICY "Users can see members of their conversations" ON conversation_members FOR SELECT
USING (EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid()));

CREATE POLICY "Users can add members" ON conversation_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own membership" ON conversation_members FOR UPDATE USING (auth.uid() = user_id);

-- ─── MESSAGES ─────────────────────────────────────────────
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id),
  ciphertext TEXT NOT NULL,
  ciphertext_type INTEGER NOT NULL,
  skdm TEXT,
  content_type VARCHAR(20) DEFAULT 'text',
  sealed_sender TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX messages_conv_idx ON messages(conversation_id, sent_at);
CREATE INDEX messages_sender_idx ON messages(sender_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read messages in their conversations" ON messages FOR SELECT
USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert messages to their conversations" ON messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

-- ─── USER SETTINGS ────────────────────────────────────────
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen VARCHAR(20) DEFAULT 'everyone' NOT NULL,
  read_receipts BOOLEAN DEFAULT true NOT NULL,
  profile_photo_visibility VARCHAR(20) DEFAULT 'everyone' NOT NULL,
  push_notifications BOOLEAN DEFAULT true NOT NULL,
  notification_preview BOOLEAN DEFAULT false NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── BLOCKED USERS ────────────────────────────────────────
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  blocked_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, blocked_user_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own blocks" ON blocked_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can block" ON blocked_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unblock" ON blocked_users FOR DELETE USING (auth.uid() = user_id);
