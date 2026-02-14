-- =====================================================
-- DISABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- =====================================================
-- Run this script in the Supabase SQL Editor to disable RLS
-- on all tables. This allows public access (or access via
-- the 'anon' key without specific policies) to all data.
-- WARNING: This removes row-level restrictions. Ensure you
-- handle data isolation in your application logic if needed.

BEGIN;

-- Core Entitites
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS batch_students DISABLE ROW LEVEL SECURITY;

-- Financials
ALTER TABLE IF EXISTS fee_structures DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fee_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher_payroll DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses DISABLE ROW LEVEL SECURITY;

-- Academics & Operations
ALTER TABLE IF EXISTS attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exam_results DISABLE ROW LEVEL SECURITY;

-- Communications
ALTER TABLE IF EXISTS parent_communications DISABLE ROW LEVEL SECURITY;

-- System & Backups
ALTER TABLE IF EXISTS backups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coaching_backups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schema_version DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify status (Optional)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
