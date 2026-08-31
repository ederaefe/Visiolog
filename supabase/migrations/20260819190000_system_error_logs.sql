-- System Error Logs Table for Admin Diagnostics & Per-User Telemetry

CREATE TABLE IF NOT EXISTS system_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_code TEXT,
    context TEXT DEFAULT 'GENERAL', -- e.g. 'OCR_EXTRACTION', 'FILE_UPLOAD', 'SHEET_RECONCILIATION', 'AUTH', 'SETTINGS'
    route TEXT, -- e.g. '/mobile', '/workspace/[id]', '/api/upload'
    level TEXT DEFAULT 'error', -- 'error', 'warn', 'fatal'
    origin TEXT DEFAULT 'client', -- 'client', 'server', 'api'
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_error_logs ENABLE ROW LEVEL SECURITY;

-- Allow public/authenticated insert for telemetry error logs
CREATE POLICY "Allow telemetry error logs insert" 
ON system_error_logs FOR INSERT 
WITH CHECK (true);

-- Super Admin read and manage access
CREATE POLICY "Super admins can view all error logs" 
ON system_error_logs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    )
);

CREATE POLICY "Super admins can delete error logs" 
ON system_error_logs FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    )
);

-- Indexes for rapid query and filtering by user and timestamp
CREATE INDEX IF NOT EXISTS idx_system_error_logs_user_id ON system_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_created_at ON system_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_context ON system_error_logs(context);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_level ON system_error_logs(level);
