-- =====================================================
-- COACHING MANAGEMENT SYSTEM - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Version: 2.0
-- Created: 2026-02-14
-- Description: Comprehensive schema for coaching institute management
--              with students, batches, teachers, fees, attendance, exams,
--              and parent communications
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL,
    student_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(20),
    parent_name VARCHAR(200),
    parent_phone VARCHAR(20),
    parent_whatsapp VARCHAR(20),
    parent_email VARCHAR(200),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'graduated')),
    profile_pic TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers/Staff Table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL,
    teacher_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(20),
    specialization VARCHAR(200),
    qualification VARCHAR(200),
    experience_years INTEGER,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    salary_type VARCHAR(20) DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'hourly', 'per_class')),
    salary_amount DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    profile_pic TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batches Table
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL,
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(200),
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    schedule_days VARCHAR(50), -- JSON array: ["Monday", "Wednesday", "Friday"]
    schedule_time_start TIME,
    schedule_time_end TIME,
    capacity INTEGER DEFAULT 30,
    current_enrollment INTEGER DEFAULT 0,
    fee_amount DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch Students Junction Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS batch_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    left_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(batch_id, student_id)
);

-- Fee Structures Table
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    installment_count INTEGER DEFAULT 1,
    installment_amount DECIMAL(10, 2),
    frequency VARCHAR(20) DEFAULT 'monthly' CHECK (frequency IN ('one_time', 'monthly', 'quarterly', 'yearly')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fee Payments Table
CREATE TABLE IF NOT EXISTS fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(50) DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'bank_transfer', 'online', 'cheque', 'upi')),
    installment_number INTEGER,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'overdue', 'partial')),
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_by VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, batch_id, attendance_date)
);

-- Exams Table
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL,
    exam_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject VARCHAR(200),
    exam_date DATE NOT NULL,
    total_marks DECIMAL(10, 2) NOT NULL,
    passing_marks DECIMAL(10, 2),
    duration_minutes INTEGER,
    exam_type VARCHAR(50) DEFAULT 'written' CHECK (exam_type IN ('written', 'oral', 'practical', 'online')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam Results Table
CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(10, 2) NOT NULL,
    grade VARCHAR(10),
    rank INTEGER,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);

-- Parent Communications Table
CREATE TABLE IF NOT EXISTS parent_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('sms', 'whatsapp', 'email', 'notification')),
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(200),
    subject VARCHAR(200),
    message TEXT NOT NULL,
    template_name VARCHAR(100),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
    sent_by VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Payroll Table
CREATE TABLE IF NOT EXISTS teacher_payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(100) NOT NULL,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of the month
    base_salary DECIMAL(10, 2),
    classes_taken INTEGER DEFAULT 0,
    bonus DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE,
    payment_mode VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, month)
);

-- =====================================================
-- ENHANCED BACKUP TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(100) NOT NULL,
    backup_data JSONB NOT NULL,
    backup_size INTEGER NOT NULL,
    version VARCHAR(20) DEFAULT '2.0',
    checksum VARCHAR(64), -- SHA-256 hash for integrity
    compression_type VARCHAR(20) DEFAULT 'none' CHECK (compression_type IN ('none', 'gzip', 'lz')),
    audit_trail JSONB, -- {user: "admin", action: "manual_backup", changes: [...]}
    restored_from UUID REFERENCES backups(id), -- Track restore history
    restored_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_project_id ON students(project_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

-- Teachers indexes
CREATE INDEX IF NOT EXISTS idx_teachers_project_id ON teachers(project_id);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

-- Batches indexes
CREATE INDEX IF NOT EXISTS idx_batches_project_id ON batches(project_id);
CREATE INDEX IF NOT EXISTS idx_batches_teacher_id ON batches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_dates ON batches(start_date, end_date);

-- Batch Students indexes
CREATE INDEX IF NOT EXISTS idx_batch_students_batch_id ON batch_students(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_students_student_id ON batch_students(student_id);
CREATE INDEX IF NOT EXISTS idx_batch_students_status ON batch_students(status);

-- Fee Payments indexes (composite for common queries)
CREATE INDEX IF NOT EXISTS idx_fee_payments_project_id ON fee_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_batch_id ON fee_payments(batch_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_due_date ON fee_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_date ON fee_payments(student_id, payment_date);

-- Attendance indexes (composite for date range queries)
CREATE INDEX IF NOT EXISTS idx_attendance_project_id ON attendance_records(project_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_id ON attendance_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON attendance_records(batch_id, attendance_date);

-- Exams indexes
CREATE INDEX IF NOT EXISTS idx_exams_project_id ON exams(project_id);
CREATE INDEX IF NOT EXISTS idx_exams_batch_id ON exams(batch_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);

-- Exam Results indexes
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);

-- Parent Communications indexes
CREATE INDEX IF NOT EXISTS idx_parent_comms_project_id ON parent_communications(project_id);
CREATE INDEX IF NOT EXISTS idx_parent_comms_student_id ON parent_communications(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_comms_sent_at ON parent_communications(sent_at);

-- Backup indexes
CREATE INDEX IF NOT EXISTS idx_backups_project_name ON backups(project_name);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);

-- =====================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =====================================================

-- Student Fee Summary View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_student_fee_summary AS
SELECT 
    s.id AS student_id,
    s.project_id,
    s.name AS student_name,
    s.student_code,
    COUNT(fp.id) AS total_payments,
    COALESCE(SUM(fp.amount), 0) AS total_paid,
    COALESCE(SUM(CASE WHEN fp.status = 'pending' THEN fp.amount ELSE 0 END), 0) AS total_pending,
    COALESCE(SUM(CASE WHEN fp.status = 'overdue' THEN fp.amount ELSE 0 END), 0) AS total_overdue,
    MAX(fp.payment_date) AS last_payment_date,
    MIN(CASE WHEN fp.status IN ('pending', 'overdue') THEN fp.due_date END) AS next_due_date
FROM students s
LEFT JOIN fee_payments fp ON s.id = fp.student_id
GROUP BY s.id, s.project_id, s.name, s.student_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_student_fee_summary_student_id ON mv_student_fee_summary(student_id);

-- Batch Attendance Statistics View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_batch_attendance_stats AS
SELECT 
    b.id AS batch_id,
    b.project_id,
    b.name AS batch_name,
    b.batch_code,
    COUNT(DISTINCT ar.student_id) AS total_students,
    COUNT(DISTINCT ar.attendance_date) AS total_sessions,
    COUNT(CASE WHEN ar.status = 'present' THEN 1 END) AS total_present,
    COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) AS total_absent,
    ROUND(
        (COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(ar.id), 0) * 100), 2
    ) AS attendance_percentage,
    MAX(ar.attendance_date) AS last_session_date
FROM batches b
LEFT JOIN attendance_records ar ON b.id = ar.batch_id
GROUP BY b.id, b.project_id, b.name, b.batch_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_batch_attendance_stats_batch_id ON mv_batch_attendance_stats(batch_id);

-- Exam Performance View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_exam_performance AS
SELECT 
    e.id AS exam_id,
    e.project_id,
    e.name AS exam_name,
    e.exam_code,
    e.batch_id,
    e.total_marks,
    COUNT(er.id) AS students_appeared,
    ROUND(AVG(er.marks_obtained), 2) AS average_marks,
    MAX(er.marks_obtained) AS highest_marks,
    MIN(er.marks_obtained) AS lowest_marks,
    COUNT(CASE WHEN er.marks_obtained >= e.passing_marks THEN 1 END) AS students_passed,
    COUNT(CASE WHEN er.marks_obtained < e.passing_marks THEN 1 END) AS students_failed,
    ROUND(
        (COUNT(CASE WHEN er.marks_obtained >= e.passing_marks THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(er.id), 0) * 100), 2
    ) AS pass_percentage
FROM exams e
LEFT JOIN exam_results er ON e.id = er.exam_id
GROUP BY e.id, e.project_id, e.name, e.exam_code, e.batch_id, e.total_marks, e.passing_marks;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_exam_performance_exam_id ON mv_exam_performance(exam_id);

-- =====================================================
-- FUNCTIONS FOR MATERIALIZED VIEW REFRESH
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_fee_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_batch_attendance_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_exam_performance;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON fee_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_payments_updated_at BEFORE UPDATE ON fee_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_results_updated_at BEFORE UPDATE ON exam_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_payroll_updated_at BEFORE UPDATE ON teacher_payroll
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_backups_updated_at BEFORE UPDATE ON backups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS for multi-tenant support

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- Create policies (example for students - repeat for other tables)
CREATE POLICY students_project_isolation ON students
    USING (project_id = current_setting('app.current_project_id', true));

CREATE POLICY backups_project_isolation ON backups
    USING (project_name = current_setting('app.current_project_id', true));

-- =====================================================
-- SAMPLE DATA INSERTION (OPTIONAL - FOR TESTING)
-- =====================================================

-- Insert sample fee structures
INSERT INTO fee_structures (project_id, name, total_amount, installment_count, installment_amount, frequency)
VALUES 
    ('coaching_management_pro', 'Monthly Fee - Standard', 5000.00, 1, 5000.00, 'monthly'),
    ('coaching_management_pro', 'Quarterly Fee - Standard', 14000.00, 3, 4666.67, 'monthly'),
    ('coaching_management_pro', 'Yearly Fee - Premium', 50000.00, 10, 5000.00, 'monthly')
ON CONFLICT DO NOTHING;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to calculate student attendance percentage
CREATE OR REPLACE FUNCTION get_student_attendance_percentage(
    p_student_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_percentage DECIMAL;
BEGIN
    SELECT 
        ROUND(
            (COUNT(CASE WHEN status = 'present' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100), 2
        )
    INTO v_percentage
    FROM attendance_records
    WHERE student_id = p_student_id
        AND (p_start_date IS NULL OR attendance_date >= p_start_date)
        AND (p_end_date IS NULL OR attendance_date <= p_end_date);
    
    RETURN COALESCE(v_percentage, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get pending fee payments
CREATE OR REPLACE FUNCTION get_pending_payments(
    p_project_id VARCHAR,
    p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
    student_id UUID,
    student_name VARCHAR,
    amount DECIMAL,
    due_date DATE,
    days_until_due INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        fp.amount,
        fp.due_date,
        (fp.due_date - CURRENT_DATE)::INTEGER
    FROM fee_payments fp
    JOIN students s ON fp.student_id = s.id
    WHERE fp.project_id = p_project_id
        AND fp.status IN ('pending', 'overdue')
        AND fp.due_date <= CURRENT_DATE + p_days_ahead
    ORDER BY fp.due_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE students IS 'Stores student information including enrollment details and parent contacts';
COMMENT ON TABLE teachers IS 'Stores teacher/staff information with salary details';
COMMENT ON TABLE batches IS 'Stores batch/class information with schedules and teacher assignments';
COMMENT ON TABLE fee_payments IS 'Tracks all fee payments with installment support';
COMMENT ON TABLE attendance_records IS 'Daily attendance records for students';
COMMENT ON TABLE exams IS 'Exam/test information';
COMMENT ON TABLE exam_results IS 'Student exam results and grades';
COMMENT ON TABLE parent_communications IS 'Log of all parent communications (SMS/WhatsApp/Email)';
COMMENT ON TABLE backups IS 'Enhanced backup table with compression and audit trails';

COMMENT ON MATERIALIZED VIEW mv_student_fee_summary IS 'Real-time fee collection analytics per student';
COMMENT ON MATERIALIZED VIEW mv_batch_attendance_stats IS 'Attendance statistics by batch';
COMMENT ON MATERIALIZED VIEW mv_exam_performance IS 'Exam performance metrics and analytics';

-- =====================================================
-- SCHEMA VERSION TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS schema_version (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_version (version, description)
VALUES ('2.0', 'Initial comprehensive coaching management schema with enhanced backup system')
ON CONFLICT (version) DO NOTHING;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
