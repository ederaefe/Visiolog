-- Migration: Create project_sheets table for continuous master project spreadsheets

CREATE TABLE IF NOT EXISTS project_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
    csv_data TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE project_sheets ENABLE ROW LEVEL SECURITY;

-- Policies for project_sheets
CREATE POLICY "Users can CRUD own project sheets" ON project_sheets FOR ALL
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_sheets.project_id AND projects.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_sheets.project_id AND projects.user_id = auth.uid()));

-- Add modified time trigger
CREATE TRIGGER update_project_sheets_modtime 
BEFORE UPDATE ON project_sheets 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
