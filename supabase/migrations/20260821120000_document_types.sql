-- Add explicit scan modes so rendering follows the user's choice.
CREATE TYPE document_type AS ENUM ('note', 'table');

ALTER TABLE documents
  ADD COLUMN document_type document_type NOT NULL DEFAULT 'table',
  ADD COLUMN note_content TEXT;

ALTER TABLE documents
  ADD CONSTRAINT note_content_only_for_notes
  CHECK (document_type = 'note' OR note_content IS NULL);