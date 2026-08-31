-- Migration: Google Sheets Sync Setup
-- 1. Create sheet_sync_configs table
CREATE TABLE IF NOT EXISTS sheet_sync_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
    google_spreadsheet_id TEXT NOT NULL,
    google_spreadsheet_url TEXT NOT NULL,
    custom_headers TEXT[] NOT NULL DEFAULT '{}',
    google_access_token TEXT,
    google_refresh_token TEXT NOT NULL,
    google_token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create synced_tables table to track each document's row range in the continuous sheet
CREATE TABLE IF NOT EXISTS synced_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_config_id UUID REFERENCES sheet_sync_configs(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE UNIQUE NOT NULL,
    google_sheet_start_row INT NOT NULL,
    google_sheet_end_row INT NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#E8F5E9',
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sheet_sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_tables ENABLE ROW LEVEL SECURITY;

-- Non-breaking policies for sheet_sync_configs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sheet_sync_configs' AND policyname = 'Users can CRUD own sync configs'
    ) THEN
        CREATE POLICY "Users can CRUD own sync configs" ON sheet_sync_configs FOR ALL
        USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = sheet_sync_configs.project_id AND projects.user_id = auth.uid()))
        WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = sheet_sync_configs.project_id AND projects.user_id = auth.uid()));
    END IF;
END $$;

-- Non-breaking policies for synced_tables
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'synced_tables' AND policyname = 'Users can CRUD own synced tables'
    ) THEN
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
    END IF;
END $$;

-- 3. Safely drop upload_portals table (portal demolition)
DROP TABLE IF EXISTS upload_portals CASCADE;
