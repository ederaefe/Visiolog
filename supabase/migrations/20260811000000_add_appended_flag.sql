-- Add appended flag and timestamp to spreadsheets table
-- This tracks which extractions have been appended to the project master sheet

ALTER TABLE spreadsheets 
ADD COLUMN IF NOT EXISTS appended boolean DEFAULT false;

ALTER TABLE spreadsheets 
ADD COLUMN IF NOT EXISTS appended_at timestamptz DEFAULT null;

-- Index for efficient queries on appended status per project
CREATE INDEX IF NOT EXISTS idx_spreadsheets_appended 
ON spreadsheets (document_id, appended);
