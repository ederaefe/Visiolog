-- Migration: User-Level Integrations

-- 1. Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Enable RLS on integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own integrations" ON integrations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Modify sheet_sync_configs
TRUNCATE TABLE synced_tables CASCADE;
TRUNCATE TABLE sheet_sync_configs CASCADE;

ALTER TABLE sheet_sync_configs
ADD COLUMN integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE NOT NULL;

ALTER TABLE sheet_sync_configs
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token,
DROP COLUMN IF EXISTS token_expires_at,
DROP COLUMN IF EXISTS provider,
DROP COLUMN IF EXISTS region;
