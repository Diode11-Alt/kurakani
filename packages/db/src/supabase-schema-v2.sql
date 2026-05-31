-- Phase 2 Schema Updates: Folders, Tags, and Summaries

-- 1. Create the folders table
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  parent_id uuid references folders(id) on delete cascade, -- Support for nested folders
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Secure folders with RLS
alter table folders enable row level security;

create policy "Users can select their own folders" 
on folders for select using (auth.uid() = user_id);

create policy "Users can insert their own folders" 
on folders for insert with check (auth.uid() = user_id);

create policy "Users can update their own folders" 
on folders for update using (auth.uid() = user_id);

create policy "Users can delete their own folders" 
on folders for delete using (auth.uid() = user_id);

-- 2. Update documents table with new columns
alter table documents 
  add column if not exists folder_id uuid references folders(id) on delete set null,
  add column if not exists tags text[] default '{}',
  add column if not exists summary text;

-- 3. Update the RPC function to return new columns
drop function if exists match_documents(vector(384), float, int);

create or replace function match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  folder_id uuid,
  tags text[],
  summary text,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.title,
    documents.content,
    documents.folder_id,
    documents.tags,
    documents.summary,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where auth.uid() = documents.user_id
    and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;
