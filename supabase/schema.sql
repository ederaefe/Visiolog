-- Visiolog Supabase Database Schema

-- Custom Types
CREATE TYPE user_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE document_status AS ENUM ('Queued', 'Uploading', 'Processing', 'Completed', 'Failed');
CREATE TYPE document_type AS ENUM ('note', 'table');

-- 1. Profiles Table (Extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    tier user_tier DEFAULT 'free',
    pages_processed_total INT DEFAULT 0,
    pages_processed_today INT DEFAULT 0,
    last_processed_date DATE DEFAULT CURRENT_DATE,
    is_super_admin BOOLEAN DEFAULT false,
    flutterwave_customer_id TEXT,
    flutterwave_tx_ref TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    status document_status DEFAULT 'Queued',
    document_type document_type NOT NULL DEFAULT 'table',
    note_content TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Processing Jobs Table
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE UNIQUE NOT NULL,
    status TEXT DEFAULT 'Pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

-- 5. Spreadsheets Table
CREATE TABLE spreadsheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE UNIQUE NOT NULL,
    csv_data TEXT, -- Storing raw CSV for large files
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheets ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Projects: Users can CRUD their own projects
CREATE POLICY "Users can CRUD own projects" ON projects FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Documents: Users can CRUD documents for their own projects
CREATE POLICY "Users can CRUD own documents" ON documents FOR ALL 
USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
) 
WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
);

-- Processing Jobs: Users can CRUD jobs for their own documents
CREATE POLICY "Users can CRUD own processing jobs" ON processing_jobs FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM documents 
        JOIN projects ON documents.project_id = projects.id 
        WHERE documents.id = processing_jobs.document_id AND projects.user_id = auth.uid()
    )
) 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents 
        JOIN projects ON documents.project_id = projects.id 
        WHERE documents.id = processing_jobs.document_id AND projects.user_id = auth.uid()
    )
);

-- Spreadsheets: Users can CRUD spreadsheets for their own documents
CREATE POLICY "Users can CRUD own spreadsheets" ON spreadsheets FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM documents 
        JOIN projects ON documents.project_id = projects.id 
        WHERE documents.id = spreadsheets.document_id AND projects.user_id = auth.uid()
    )
) 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents 
        JOIN projects ON documents.project_id = projects.id 
        WHERE documents.id = spreadsheets.document_id AND projects.user_id = auth.uid()
    )
);

-- Triggers for updated_at

CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_spreadsheets_modtime BEFORE UPDATE ON spreadsheets FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
