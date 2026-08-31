-- Migration: Automated Database Webhook Trigger for Background AI Processing
-- Enables pg_net extension to dispatch asynchronous webhooks to Supabase Edge Function

-- 1. Enable pg_net extension for non-blocking HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Trigger function to dispatch processing webhook to Supabase Edge Function
CREATE OR REPLACE FUNCTION public.handle_document_processing_webhook()
RETURNS trigger AS $$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
  edge_function_url TEXT;
  request_payload JSONB;
BEGIN
  -- Only trigger for documents in 'Processing' or 'Queued' status
  IF NEW.status = 'Processing' OR NEW.status = 'Queued' THEN
    -- Construct payload
    request_payload := jsonb_build_object(
      'documentId', NEW.id,
      'projectId', NEW.project_id,
      'fileName', NEW.file_name,
      'fileUrl', NEW.file_url,
      'documentType', NEW.document_type,
      'uploadedAt', NEW.uploaded_at
    );

    -- Dispatch asynchronous HTTP POST request via pg_net (non-blocking)
    -- Replace with project edge function endpoint if invoking directly
    PERFORM net.http_post(
      url := concat(current_setting('app.settings.supabase_url', true), '/functions/v1/process-document'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true))
      ),
      body := request_payload
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to documents table on INSERT
DROP TRIGGER IF EXISTS on_document_processing_trigger ON public.documents;

CREATE TRIGGER on_document_processing_trigger
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_document_processing_webhook();
