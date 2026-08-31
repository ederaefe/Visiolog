# Visiolog User Manual & Technical Reference

Comprehensive operational manual and technical specification for Visiolog, the proprietary document-to-spreadsheet extraction engine and spreadsheet studio.

---

## 1. Executive Summary & Core Capabilities

Visiolog transforms paper logbooks, handwritten forms, printed tables, receipts, registries, and unformatted documents into clean, structured digital spreadsheets and notes.

### Key Capabilities
- **Multimodal Optical Character Recognition (OCR)**: Extracts tabular matrices and plain text with exact spatial and numeric fidelity.
- **Dual-Mode Storage Architecture**: Operates as a completely air-gapped, zero-cloud local application (using browser IndexedDB) or as a cloud-synchronized platform (using Supabase PostgreSQL).
- **Multi-Provider AI Vision Inference**: Choose between local offline models (Ollama: `llama3.2-vision`, `minicpm-v`, `qwen2.5-vl`), multi-model cloud APIs (OpenRouter), high-speed models (Google Gemini), or custom private enterprise OpenAI-compatible endpoints.
- **Interactive Spreadsheet Studio**: In-browser grid editor with formula evaluation, cell formatting, column resizing, sorting, search, and CSV/Excel/Google Sheets export.
- **Fixed Settings & Header Reconciliation**: Define fixed target schemas for continuous batch scanning where varied document column layouts are automatically reconciled and appended into a master project sheet.
- **In-App Database Studio**: Built-in visual database browser to inspect, query, edit, export, and restore database tables without needing third-party database administrative dashboards.
- **Zero-Telemetry Privacy**: Air-gapped deployments operate with zero external tracking, zero third-party analytics, and ephemeral memory buffers that discard raw image files immediately after OCR parsing.

---

## 2. User Guide & Core Workflows

### 2.1 Workspace Organization & Project Folders
Visiolog organizes document scans into dedicated **Projects**:
1. **Projects View (`/projects`)**: Create project folders to group related document batches (e.g. "Q1 Inventory Logs", "Lab Registry 2026").
2. **Recents View (`/recents`)**: A dedicated auto-provisioned workspace pinned to the top of your workspace for ad-hoc scans and quick single-file conversions.
3. **Fixed Settings Mode**:
   - Enable "Fixed Column Rules" in project settings.
   - Specify target comma-separated headers (e.g. `Date, Item Name, Quantity, Unit Price, Total`).
   - Every subsequent scan added to this project will be automatically structured and reconciled into this master schema.

### 2.2 Scanning & Converting Documents
1. **Upload or Capture**:
   - Drag and drop image files (`.png`, `.jpg`, `.jpeg`, `.webp`) or scanned PDFs into the upload dropzone.
   - On mobile devices or tablets, tap the floating capture button to photograph documents directly using your device camera.
2. **Select Extraction Mode**:
   - **Table Mode (Default)**: Parses tabular grids and outputs RFC 4180 compliant CSV.
   - **Note Mode**: Transcribes unstructured text, memo blocks, and handwritten notes into plain readable text while preserving line breaks and numbered lists.
3. **Background Processing**:
   - Extraction jobs execute asynchronously with live status tracking (`Pending` -> `Processing` -> `Completed`).
   - Volatile buffers process image binaries in memory and discard the raw image upon completion.

### 2.3 Interactive Spreadsheet Studio
When viewing a converted spreadsheet or opening the Project Master Sheet (`/sheet/[projectId]`):
- **Cell Editing**: Double-click or select any cell to edit values directly.
- **Formulas**: Type standard spreadsheet formulas starting with `=` (e.g. `=SUM(C1:C10)`, `=AVERAGE(D1:D20)`).
- **Column Management**: Insert columns, delete columns, rename headers, and drag column widths.
- **Sorting & Filtering**: Click any column header to sort ascending or descending. Use the filter bar to isolate matching rows.
- **Data Export**:
  - **Download CSV**: Instant local `.csv` file export directly to your download folder.
  - **Download Excel (.xlsx)**: Formatted offline workbook export.

---

## 3. Storage Architecture: Local-First vs Cloud

Visiolog gives users and self-hosters complete sovereignty over where data resides.

```
+--------------------------------------------------------------------+
|                         Visiolog Frontend                          |
+---------------------------------+----------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
|  Local-First Mode     |                   |  Cloud-Connected Mode |
|  - Zero Cloud         |                   |  - Multi-User Sync    |
|  - IndexedDB Storage  |                   |  - Supabase Database  |
|  - Local File Export  |                   |  - Cloud Storage      |
|  - 100% Offline       |                   |  - Email / Password   |
+-----------------------+                   +-----------------------+
```

### 3.1 Standalone Local-First Mode (Offline / Air-Gapped)
- **Database**: Browser-native IndexedDB database named `visiolog_local_db`.
- **Stores**: `projects`, `documents`, `spreadsheets`, `settings`.
- **Authentication**: Zero authentication required. No Google accounts, no logins, no cloud tokens.
- **Security**: Data never leaves your local workstation or browser session.

### 3.2 Cloud-Connected Mode (Supabase)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS).
- **Authentication**: Email/Password login with optional custom SMTP.
- **Multi-Device Sync**: Workspaces and spreadsheets synchronize across desktop and mobile devices.

### 3.3 Switching Storage Modes
1. Open the user menu in the top navigation bar.
2. Select **Settings**.
3. Under **Storage Mode**, select either **Local IndexedDB** or **Supabase Cloud**.
4. The application dynamically adjusts storage adapters without requiring a full reload.

---

## 4. Multi-Provider Vision AI Engine

Visiolog decouples the document transcription engine from any single model vendor, providing an abstraction layer in `src/lib/ai/`.

```
                         +--------------------------+
                         |  ai-provider-resolver.ts |
                         +------------+-------------+
                                      |
         +----------------+-----------+-----------+----------------+
         |                |                       |                |
         v                v                       v                v
+----------------+ +----------------+ +----------------+ +----------------+
|     Ollama     | |   OpenRouter   | |     Gemini     | |     Custom     |
| (Local/Offline)| | (Cloud Multi)  | |  (Cloud Flash) | | (LocalAI/vLLM) |
+----------------+ +----------------+ +----------------+ +----------------+
```

### 4.1 Supported Providers

#### 1. Ollama (100% Local & Air-Gapped)
- **Endpoint**: `http://localhost:11434/api/chat`
- **Supported Models**: `llama3.2-vision`, `minicpm-v`, `llava`, `qwen2.5-vl`
- **Setup**: Run Ollama locally and pull the vision model:
  ```bash
  ollama run llama3.2-vision
  ```
- **Configuration**: Set `AI_VISION_PROVIDER=ollama` and `OLLAMA_BASE_URL=http://localhost:11434`.

#### 2. OpenRouter (Cloud Multi-Model API)
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Supported Models**: `meta-llama/llama-3.2-11b-vision-instruct`, `qwen/qwen-2.5-vl-72b-instruct`, `google/gemini-2.0-flash-001`, `anthropic/claude-3.5-sonnet`
- **Configuration**: Set `AI_VISION_PROVIDER=openrouter` and `OPENROUTER_API_KEY=sk-or-v1-...`.

#### 3. Google Gemini (High-Speed Cloud)
- **Supported Models**: `gemini-2.5-flash`, `gemini-2.0-flash`
- **Features**: Key rotation pool across multiple configured API keys with automatic jittered exponential retries.
- **Configuration**: Set `AI_VISION_PROVIDER=gemini` and `GEMINI_API_KEY=AIzaSy...`.

#### 4. Custom OpenAI-Compatible Endpoint
- **Supported Targets**: LocalAI, vLLM, LM Studio, Ollama OpenAI endpoint, or private enterprise vision gateways.
- **Configuration**: Set `AI_VISION_PROVIDER=custom`, `CUSTOM_VISION_URL=http://localhost:8080/v1/chat/completions`, and `CUSTOM_VISION_MODEL=default`.

---

## 5. In-App Database Studio

The in-app **Database Studio** (`/admin/database` or `/database`) replaces external database management interfaces (such as the Supabase dashboard) for self-hosters and developers.

```
+---------------------------------------------------------------------------------+
|                                 DATABASE STUDIO                                 |
+-------------------+-------------------------------------------------------------+
| TABLES            | SEARCH & ACTIONS: [ Search records... ] [Export] [Import] [+] |
| - projects        +-------------------------------------------------------------+
| - documents       | ID          | NAME           | CREATED_AT        | ACTIONS  |
| - spreadsheets    | proj_101    | Inventory Q1   | 2026-08-31T12:00  | Edit Del |
| - profiles        | proj_102    | Lab Scans      | 2026-08-31T13:30  | Edit Del |
| - processing_jobs +-------------------------------------------------------------+
| - system_logs     | Pagination: Page 1 of 4                         [<] [>]     |
+-------------------+-------------------------------------------------------------+
```

### 5.1 Features & Capabilities
- **Live Table Explorer**: Browse `projects`, `documents`, `spreadsheets`, `profiles`, `processing_jobs`, and `system_logs`.
- **Dual Backend Detection**: Automatically inspects IndexedDB object stores in local mode or Supabase tables in cloud mode.
- **Record Inspector & Drawer Editor**: Click any row to view structured fields or modify the raw JSON payload directly.
- **Search & Sort**: Real-time text search across all columns with ascending/descending column header sorting.
- **1-Click Database Backup & Portability**:
  - **Export Backup**: Downloads a full `.json` database snapshot.
  - **Import Backup**: Restores table records from any valid Visiolog backup file.
  - **Delete Record**: Remove records with cascading deletion confirmations.

---

## 6. Self-Hosting & Deployment

### 6.1 Docker Compose with Ollama (Single-Command Air-Gapped Deployment)

Run Visiolog alongside a local Ollama vision instance with zero cloud dependencies:

```bash
docker compose -f docker-compose.ollama.yml up -d
```

This launches:
1. `visiolog_app`: Next.js web application on port `3000`.
2. `visiolog_ollama`: Ollama server with persistent volume `ollama_storage` on port `11434`.

Pull your vision model into the running container:
```bash
docker exec -it visiolog_ollama ollama pull llama3.2-vision
```

Open `http://localhost:3000` in your web browser.

### 6.2 Standard Container Deployment

```bash
docker build -t visiolog:latest .
docker run -p 3000:3000 --env-file .env.local visiolog:latest
```

### 6.3 Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | No | `production` | Node.js environment mode |
| `LOCAL_FIRST` | No | `false` | When `true`, bypasses cloud auth and defaults to local mode |
| `AI_VISION_PROVIDER` | No | `gemini` | Active inference provider (`ollama`, `openrouter`, `gemini`, `custom`) |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Base URL for Ollama daemon |
| `OLLAMA_MODEL` | No | `llama3.2-vision` | Default Ollama vision model |
| `OPENROUTER_API_KEY` | Conditional | - | API key for OpenRouter vision models |
| `OPENROUTER_MODEL` | No | `meta-llama/llama-3.2-11b-vision-instruct` | OpenRouter model ID |
| `GEMINI_API_KEY` | Conditional | - | Primary Google Gemini API key |
| `GEMINI_API_KEY_2` | No | - | Secondary Gemini key for rotation pool |
| `GEMINI_API_KEY_3` | No | - | Tertiary Gemini key for rotation pool |
| `NEXT_PUBLIC_SUPABASE_URL` | No | - | Supabase project URL (optional in local mode) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | - | Supabase anonymous public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | - | Supabase administrative service role key |
| `PAYSTACK_SECRET_KEY` | No | - | Paystack secret key for hosted billing |
| `FLUTTERWAVE_SECRET_HASH` | No | - | Flutterwave webhook verification hash |

---

## 7. Progressive Web App (PWA) & Mobile Installation

Visiolog is designed mobile-first and installs as a standalone Progressive Web App on iOS, Android, macOS, Windows, and Linux.

### Installation Steps
- **Desktop (Chrome / Edge / Brave)**: Click the Install icon in the address bar or select "Install Visiolog".
- **iOS (Safari)**: Tap the Share button -> Select **Add to Home Screen**.
- **Android (Chrome)**: Tap the menu (three dots) -> Select **Add to Home screen** or tap the in-app install prompt.

### Offline Resilience
- Service worker (`sw.js`) caches core UI assets, fonts, icons, and client application bundles.
- Offline scanning saves documents and edits directly into IndexedDB for zero-connectivity field operations.

---

## 8. Privacy, Security & Compliance

- **Zero Image Retention**: Uploaded document images are processed strictly in volatile memory buffers during OCR transcription and discarded immediately.
- **Air-Gapped Operation**: In local mode with Ollama, no outbound HTTP requests are generated.
- **Data Protection Compliance**: Designed in compliance with the Nigeria Data Protection Act (NDPA) 2023, NDPR, and global data privacy standards.
- **Encrypted Local Storage**: Data in browser IndexedDB is protected by the operating system user sandbox.

---

## 9. Contact & Support

For technical inquiries, enterprise deployments, bug reports, or feature requests:

- **Contact & Support Email**: `elrazortheodore@gmail.com`
- **Application Route**: Accessible directly at `/contact`
- **In-App Help**: Tap the User Menu -> Settings -> Database Studio or contact options.

---


## 10. Step-by-Step Setup Guides (20 Steps Each)

For users deploying optional cloud services, refer to the dedicated 20-step configuration manuals:

- **Master Setup Index**: [`software_setup.md`](file:///C:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG/software_setup.md)
- **Supabase Cloud Database Setup (20 Steps)**: [`setup_supabase.md`](file:///C:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG/setup_supabase.md)
- **Vercel Production Deployment (20 Steps)**: [`setup_vercel.md`](file:///C:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG/setup_vercel.md)
- **Google Gemini API Key Rotation Setup (20 Steps)**: [`setup_gemini.md`](file:///C:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG/setup_gemini.md)

---

## 11. In-Browser Demo Studio Architecture

The live demo (`index.html`, `demo/index.html`, and `public/demo/index.html`) operates as an autonomous, client-side application:

- **Root & Static Deployment**: Hosted directly from repository root for GitHub Pages or static CDN deployment without requiring Node.js server runtimes.
- **Client-Side BYOK Privacy**: API keys for Google Gemini or OpenRouter reside exclusively in browser `localStorage` and transmit directly to inference endpoints without intermediary servers.
- **Collapsible Settings Drawer**: Encapsulates provider selection, key management, live model discovery, and prompt customization in a minimalist panel with live status badges.
- **Dynamic Prompt Customization**: Provides full prompt flexibility allowing users to extract specialized schemas, JSON payloads, or standard RFC 4180 CSV tables.
- **Client-Side Pre-processing**: In-memory HTML5 canvas compression reduces raw image payloads prior to transmission.
- **Sample Document Quota**: Provides a 2-conversion free sample quota for testing before requiring user-supplied API keys.

---

## 12. Modular Multi-Page Demo Architecture

To cleanly decouple marketing presentation from daily extraction workflows and configuration management, the standalone demo suite is organized into three specialized pages:

### 12.1 Architecture Overview
- **Landing Page (`index.html` / `demo/index.html`)**: Semantic marketing page detailing product features, 3-step extraction workflow, FAQ accordion, trust badges, and theme engine.
- **Workspace Page (`workspace.html` / `demo/workspace.html`)**: Interactive extraction and editing hub. Features in-memory canvas image compressor, sample document loader with free quota, conversion history manager (stored locally), and editable 2D spreadsheet grid with CSV export.
- **Settings Page (`settings.html` / `demo/settings.html`)**: Configuration center. Manages inference providers (Gemini, OpenRouter, local Ollama), API key input with show/hide masking, automated model probing, system prompt customization, and local storage cache management.

### 12.2 Inter-Page State Synchronization
All settings (provider, API keys, active model, custom prompt, conversion history, free sample quotas, and dark/light theme) synchronize seamlessly across pages via `localStorage` with zero backend server dependencies.


