-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create the documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  embedding vector(384), -- 384 dimensions for all-MiniLM-L6-v2 / gte-small models
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Secure the table with Row Level Security (RLS)
alter table documents enable row level security;

-- Policy: Users can only see their own documents
create policy "Users can select their own documents" 
on documents for select 
using (auth.uid() = user_id);

-- Policy: Users can only insert their own documents
create policy "Users can insert their own documents" 
on documents for insert 
with check (auth.uid() = user_id);

-- Policy: Users can only update their own documents
create policy "Users can update their own documents" 
on documents for update 
using (auth.uid() = user_id);

-- Policy: Users can only delete their own documents
create policy "Users can delete their own documents" 
on documents for delete 
using (auth.uid() = user_id);

-- Create an RPC function for vector similarity search
create or replace function match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.title,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where auth.uid() = documents.user_id -- Only search within the user's own documents!
    and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;
