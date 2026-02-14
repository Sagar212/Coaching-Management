-- =====================================================
-- ENHANCED CLOUD BACKUP SCHEMA
-- =====================================================
-- This script creates the necessary table and security policies
-- for the Coaching Management System's cloud backup feature.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create the Backups Table
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(100) NOT NULL,
    backup_data JSONB NOT NULL,
    backup_size INTEGER NOT NULL,
    version VARCHAR(20) DEFAULT '2.0',
    checksum VARCHAR(64), -- SHA-256 or simple hash for integrity check
    compression_type VARCHAR(20) DEFAULT 'none' CHECK (compression_type IN ('none', 'gzip', 'lz')),
    audit_trail JSONB, -- Stores metadata like {user: "admin", action: "manual_backup", timestamp: "..."}
    restored_from UUID REFERENCES backups(id), -- Track if this backup was a restore point
    restored_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add Comments for Documentation
COMMENT ON TABLE backups IS 'Stores encrypted/compressed snapshots of the application state';
COMMENT ON COLUMN backups.project_name IS 'Identifier for multi-tenant support (e.g., "coaching_management_pro")';
COMMENT ON COLUMN backups.backup_data IS 'The complete JSON dump of local storage data';
COMMENT ON COLUMN backups.audit_trail IS 'JSON log of who created the backup and when';

-- 3. Enable Row Level Security (RLS)
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policy
-- This ensures that users can only access backups for their specific project
CREATE POLICY backups_project_isolation ON backups
    USING (project_name = current_setting('app.current_project_id', true));

-- 5. Create Indexes for Performance
-- Index on project_name for fast filtering
CREATE INDEX IF NOT EXISTS idx_backups_project ON backups(project_name);
-- Index on created_at for fast sorting of history
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- SELECT id, project_name, created_at, backup_size FROM backups ORDER BY created_at DESC LIMIT 5;
