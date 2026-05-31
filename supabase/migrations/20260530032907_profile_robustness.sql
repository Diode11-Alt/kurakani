-- ============================================================
-- Upgrade handle_new_user Trigger for Robustness
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
declare
  new_username text;
  base_username text;
  suffix int := 1;
begin
  -- Resolve base username from metadata or email
  base_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  new_username := base_username;
  
  -- If username exists, loop and append suffix until unique
  while exists(select 1 from public.profiles where username = new_username) loop
    new_username := base_username || suffix::text;
    suffix := suffix + 1;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    new_username,
    new_username,
    ''
  );
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger to ensure it points to the new function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Backfill Profiles for Existing Users
-- ============================================================
do $$
declare
  user_record record;
  new_username text;
  base_username text;
  suffix int;
begin
  for user_record in 
    select id, email, raw_user_meta_data 
    from auth.users 
    where id not in (select id from public.profiles)
  loop
    base_username := coalesce(user_record.raw_user_meta_data->>'username', split_part(user_record.email, '@', 1));
    new_username := base_username;
    suffix := 1;
    
    while exists(select 1 from public.profiles where username = new_username) loop
      new_username := base_username || suffix::text;
      suffix := suffix + 1;
    end loop;

    insert into public.profiles (id, username, display_name, avatar_url)
    values (
      user_record.id,
      new_username,
      new_username,
      ''
    );
  end loop;
end;
$$;
