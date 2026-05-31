-- ============================================================
-- GUFF Social Platform — Full Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL)
-- ============================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  cover_url text,
  bio text default '',
  website text default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    ''
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- 2. FOLLOWS
-- ============================================================
create table if not exists follows (
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

alter table follows enable row level security;

create policy "Anyone can see follows"
  on follows for select using (true);

create policy "Users can follow others"
  on follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on follows for delete using (auth.uid() = follower_id);

-- ============================================================
-- 3. POSTS
-- ============================================================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete cascade not null,
  content text not null default '',
  media_urls text[] default '{}',
  post_type text default 'text' check (post_type in ('text', 'image', 'video')),
  likes_count int default 0,
  comments_count int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table posts enable row level security;

create policy "Posts are viewable by everyone"
  on posts for select using (true);

create policy "Users can create their own posts"
  on posts for insert with check (auth.uid() = author_id);

create policy "Users can update their own posts"
  on posts for update using (auth.uid() = author_id);

create policy "Users can delete their own posts"
  on posts for delete using (auth.uid() = author_id);

-- ============================================================
-- 4. LIKES
-- ============================================================
create table if not exists likes (
  user_id uuid references profiles(id) on delete cascade not null,
  post_id uuid references posts(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (user_id, post_id)
);

alter table likes enable row level security;

create policy "Anyone can see likes"
  on likes for select using (true);

create policy "Users can like posts"
  on likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on likes for delete using (auth.uid() = user_id);

-- Trigger: increment/decrement likes_count on posts
create or replace function update_likes_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update posts set likes_count = likes_count - 1 where id = OLD.post_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_change on likes;
create trigger on_like_change
  after insert or delete on likes
  for each row execute procedure update_likes_count();

-- ============================================================
-- 5. COMMENTS
-- ============================================================
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  author_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null
);

alter table comments enable row level security;

create policy "Anyone can see comments"
  on comments for select using (true);

create policy "Users can create comments"
  on comments for insert with check (auth.uid() = author_id);

create policy "Users can delete their own comments"
  on comments for delete using (auth.uid() = author_id);

-- Trigger: increment/decrement comments_count on posts
create or replace function update_comments_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update posts set comments_count = comments_count - 1 where id = OLD.post_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_change on comments;
create trigger on_comment_change
  after insert or delete on comments
  for each row execute procedure update_comments_count();

-- ============================================================
-- 6. STORIES
-- ============================================================
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete cascade not null,
  media_url text not null,
  media_type text default 'image' check (media_type in ('image', 'video')),
  created_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '24 hours') not null
);

alter table stories enable row level security;

create policy "Anyone can see non-expired stories"
  on stories for select using (expires_at > now());

create policy "Users can create their own stories"
  on stories for insert with check (auth.uid() = author_id);

create policy "Users can delete their own stories"
  on stories for delete using (auth.uid() = author_id);

-- ============================================================
-- 7. CONVERSATIONS & MESSAGES (for DMs)
-- ============================================================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1 uuid references profiles(id) on delete cascade not null,
  participant_2 uuid references profiles(id) on delete cascade not null,
  last_message_at timestamptz default now(),
  created_at timestamptz default now() not null,
  constraint unique_conversation unique (participant_1, participant_2),
  constraint ordered_participants check (participant_1 < participant_2)
);

alter table conversations enable row level security;

create policy "Users can see their own conversations"
  on conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "Users can create conversations"
  on conversations for insert
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text default '',
  media_url text,
  read_at timestamptz,
  created_at timestamptz default now() not null
);

alter table messages enable row level security;

create policy "Users can see messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

create policy "Users can send messages in their conversations"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
      and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

-- Update last_message_at on new message
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update conversations set last_message_at = now() where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_new_message on messages;
create trigger on_new_message
  after insert on messages
  for each row execute procedure update_conversation_timestamp();

-- ============================================================
-- 8. STORAGE BUCKETS (create these in Supabase Dashboard → Storage)
-- ============================================================
-- You need to manually create these buckets in the dashboard:
-- • avatars (public)
-- • posts (public)
-- • stories (public)
-- • chat-media (authenticated)

-- ============================================================
-- 9. HELPER: Get or create conversation between two users
-- ============================================================
create or replace function get_or_create_conversation(user_a uuid, user_b uuid)
returns uuid as $$
declare
  p1 uuid := least(user_a, user_b);
  p2 uuid := greatest(user_a, user_b);
  conv_id uuid;
begin
  select id into conv_id from conversations
    where participant_1 = p1 and participant_2 = p2;
  
  if conv_id is null then
    insert into conversations (participant_1, participant_2)
    values (p1, p2)
    returning id into conv_id;
  end if;
  
  return conv_id;
end;
$$ language plpgsql security definer;
