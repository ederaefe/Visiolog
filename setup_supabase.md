# Supabase Setup Guide (20-Step Comprehensive Manual)

This document provides an exhaustive, step-by-step procedure for provisioning, configuring, and securing a Supabase project for Visiolog cloud synchronization.

---

### Phase 1: Project Provisioning & Security Credentials

1. **Navigate to Supabase Dashboard**: Open your browser and access `https://supabase.com/dashboard`. Log in or create your organization account.
2. **Create New Project**: Click **New Project**. Select your organization, assign the project name (e.g. `visiolog-production`), set a strong database password (minimum 16 alphanumeric characters), and choose the geographic region closest to your users.
3. **Wait for Database Provisioning**: Allow 2 to 3 minutes for Supabase to allocate and initialize your dedicated PostgreSQL cluster and API gateway.
4. **Locate API Credentials**: In the left sidebar, navigate to **Project Settings** -> **API**.
5. **Copy Project URL**: Copy the **Project URL** (format: `https://[PROJECT-REF].supabase.co`). This corresponds to `NEXT_PUBLIC_SUPABASE_URL`.
6. **Copy Public Anon Key**: Copy the `anon` / `public` API key. This corresponds to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
7. **Copy Secret Service Role Key**: Under Project API keys, reveal and securely copy the `service_role` secret key. Store this securely; it will be used for `SUPABASE_SERVICE_ROLE_KEY` on backend workers only.

---

### Phase 2: Database Schema & Table Initialization

8. **Open SQL Editor**: In the left sidebar of the Supabase dashboard, click **SQL Editor**.
9. **Create New Query**: Click **+ New Query**.
10. **Load Database Schema**: Open [`supabase/schema.sql`](file:///C:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG/supabase/schema.sql) from the Visiolog repository. Copy the entire SQL definition.
11. **Execute Schema SQL**: Paste the contents into the SQL Editor and click **Run**. Verify the green success banner indicating all custom types (`user_tier`, `document_status`, `document_type`), tables (`profiles`, `projects`, `documents`, `spreadsheets`, `processing_jobs`, `system_logs`), and automated triggers were created.
12. **Verify Table Creation**: In the left sidebar, navigate to **Table Editor**. Confirm that all 6 tables appear in the public schema with proper foreign key relationships.

---

### Phase 3: Row Level Security (RLS) & Access Policies

13. **Review RLS Status**: Under **Authentication** -> **Policies**, verify that Row Level Security is **ENABLED** on `projects`, `documents`, `spreadsheets`, and `profiles`.
14. **Confirm Isolation Rules**: Verify that policies enforce `auth.uid() = user_id`, guaranteeing tenant isolation so users can never view or modify another organization's records.

---

### Phase 4: Storage Bucket Configuration

15. **Open Storage Dashboard**: In the left sidebar, click **Storage**.
16. **Create Document Bucket**: Click **New Bucket**. Set the bucket name to `documents`.
17. **Configure Bucket Privacy**: Keep the bucket set to **Private** (do NOT toggle Public Bucket) to protect raw document confidentiality.
18. **Set Storage Size Limit**: Under Bucket Settings, set the Maximum File Size to `50MB` and restrict allowed MIME types to `image/png, image/jpeg, image/webp, application/pdf`.

---

### Phase 5: Authentication & Environment Deployment

19. **Configure Auth URL Configuration**: Navigate to **Authentication** -> **URL Configuration**. Set **Site URL** to your deployment domain (e.g. `https://your-visiolog-domain.com` or `http://localhost:3000`). Add `https://your-visiolog-domain.com/auth/callback` to **Redirect URLs**.
20. **Inject Environment Variables**: Add the credentials to your local `.env.local` or container environment file:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key_here
    ```
    Restart your Visiolog instance. The system will automatically detect the active cloud database.
