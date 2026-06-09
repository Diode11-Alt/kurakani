-- Security Phase 3: Moving phone_hash to a private table

-- 1. Create the secure user_private_data table
CREATE TABLE IF NOT EXISTS public.user_private_data (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  phone_hash VARCHAR(128) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Migrate existing phone_hash data from users table
INSERT INTO public.user_private_data (user_id, phone_hash)
SELECT id, phone_hash FROM public.users WHERE phone_hash IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Drop phone_hash from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS phone_hash;

-- 4. Enable RLS and setup policies
ALTER TABLE public.user_private_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own private data" 
  ON public.user_private_data 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own private data" 
  ON public.user_private_data 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own private data" 
  ON public.user_private_data 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create index for quick lookups inside secure functions
CREATE INDEX IF NOT EXISTS user_private_data_phone_hash_idx ON public.user_private_data(phone_hash);

-- 5. Update the auth trigger to map new users correctly
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users (without phone_hash)
  INSERT INTO public.users (id, email, username, display_name, registration_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'username',
    (NEW.raw_user_meta_data->>'registration_id')::INTEGER
  );

  -- Insert phone_hash into user_private_data if it exists
  IF NEW.raw_user_meta_data->>'phone_hash' IS NOT NULL THEN
    INSERT INTO public.user_private_data (user_id, phone_hash)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'phone_hash'
    );
  END IF;

  -- Create default user settings
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
