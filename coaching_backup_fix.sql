-- =====================================================
-- DEDICATED COACHING BACKUP TABLE (FINAL FIX)
-- =====================================================
-- Run this script in the Supabase SQL Editor to fix the
-- "Table Missing" error and fully enable cloud backups.

-- 1. Create the `coaching_backups` table
-- Using a specific name avoids conflicts with generic 'backups' tables
CREATE TABLE IF NOT EXISTS coaching_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL, -- Renamed from project_name for consistency
    backup_data JSONB NOT NULL,
    backup_size INTEGER,
    version VARCHAR(20) DEFAULT '2.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restored_at TIMESTAMP WITH TIME ZONE
);

-- 2. Enable Row Level Security (RLS)
-- This is critical for Supabase to allow access via the JS client
ALTER TABLE coaching_backups ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policies for the 'anon' role
-- Since this is a client-side app using the anon key, we need
-- to explicitly allow SELECT and INSERT operations.

-- Allow creating backups (Insert)
CREATE POLICY "Enable insert for authenticated users only" 
ON coaching_backups FOR INSERT 
WITH CHECK (true);

-- Allow reading backups (Select)
CREATE POLICY "Enable read access for all users" 
ON coaching_backups FOR SELECT 
USING (true);

-- Allow deleting backups (Delete)
CREATE POLICY "Enable delete access for all users" 
ON coaching_backups FOR DELETE 
USING (true);

-- 4. Create an index for faster sorting by date
CREATE INDEX IF NOT EXISTS idx_coaching_backups_created_at 
ON coaching_backups(created_at DESC);

-- 5. Grant permissions to the anon role (often needed in new projects)
GRANT ALL ON coaching_backups TO anon;
GRANT ALL ON coaching_backups TO authenticated;
GRANT ALL ON coaching_backups TO service_role;

-- Verification
COMMENT ON TABLE coaching_backups IS 'Dedicated storage for Coaching Management System snapshots';
