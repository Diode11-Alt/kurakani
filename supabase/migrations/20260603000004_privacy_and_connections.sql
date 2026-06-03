-- Migration: Add Privacy Settings and Connections

-- 1. Add privacy columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS require_connection_requests BOOLEAN DEFAULT false;

-- 2. Create connections table
CREATE TABLE IF NOT EXISTS user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(sender_id, receiver_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_connections_sender ON user_connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_receiver ON user_connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);

-- 3. Enable RLS on connections
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for connections
-- Users can read connections they are part of
CREATE POLICY "Users can read their connections" ON user_connections 
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send connection requests (insert)
CREATE POLICY "Users can send connection requests" ON user_connections 
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can accept/reject/block connection requests they receive
CREATE POLICY "Users can update connection requests they receive" ON user_connections 
    FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- Users can delete their own connection requests
CREATE POLICY "Users can delete their connections" ON user_connections 
    FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create updated_at trigger for user_connections
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_connections_modtime ON user_connections;
CREATE TRIGGER update_user_connections_modtime
    BEFORE UPDATE ON user_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_connections_updated_at();
