-- Stores provider-specific data such as api_domain returned by OAuth token exchange

ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

ALTER TABLE sheet_sync_configs
ADD COLUMN IF NOT EXISTS custom_headers TEXT[] DEFAULT '{}';
