-- Migration: Provider-Agnostic Spreadsheet Sync
-- 1. Drop old tables cleanly
DROP TABLE IF EXISTS synced_tables CASCADE;
DROP TABLE IF EXISTS sheet_sync_configs CASCADE;

-- 2. Create provider-agnostic sheet_sync_configs table
CREATE TABLE IF NOT EXISTS sheet_sync_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'cloud',
    spreadsheet_id TEXT NOT NULL,
    spreadsheet_url TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ,
    region TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create synced_tables table to track each document's row range
CREATE TABLE IF NOT EXISTS synced_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_config_id UUID REFERENCES sheet_sync_configs(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE UNIQUE NOT NULL,
    sheet_start_row INT NOT NULL,
    sheet_end_row INT NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#E8F5E9',
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sheet_sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_tables ENABLE ROW LEVEL SECURITY;

-- Policies for sheet_sync_configs
CREATE POLICY "Users can CRUD own sync configs" ON sheet_sync_configs FOR ALL
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = sheet_sync_configs.project_id AND projects.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = sheet_sync_configs.project_id AND projects.user_id = auth.uid()));

-- Policies for synced_tables
CREATE POLICY "Users can CRUD own synced tables" ON synced_tables FOR ALL
USING (EXISTS (
    SELECT 1 FROM sheet_sync_configs sc
    JOIN projects p ON sc.project_id = p.id
    WHERE sc.id = synced_tables.sync_config_id AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM sheet_sync_configs sc
    JOIN projects p ON sc.project_id = p.id
    WHERE sc.id = synced_tables.sync_config_id AND p.user_id = auth.uid()
));
