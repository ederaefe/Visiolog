# Visiolog — High-Performance Local Backend Architecture & Technical Manual

Visiolog is an enterprise-grade, local-first document and paper OCR extraction platform. It converts paper documents, physical forms, logbooks, financial invoices, and tax receipts into structured tabular spreadsheets (Excel, CSV) and relational database schemas with zero cloud lock-in.

---

## 1. System Architecture Overview

Visiolog is designed with a layered, decoupled, and privacy-preserving architecture:

```
[ Scanned / Camera Document (Image / PDF) ]
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│     High-Performance Ingestion & Preprocessing Pipe     │
│  - SHA-256 Content Deduplication Cache                 │
│  - Adaptive Contrast & Deskewing (OpenCV / Pillow)      │
│  - Memory-Safe Chunking & Downsampling (max 2048px)     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│       Asynchronous Inference Engine & Circuit Breaker   │
│  - Local Vision Inference (Ollama / Llama-3.2-Vision)   │
│  - Remote Fallback (Google Gemini / OpenRouter)         │
│  - Exponential Backoff & Automatic Failover             │
│  - Async Worker Queue with Dynamic Backpressure         │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│         Structured Extraction & Normalization Core      │
│  - Strict RFC 4180 CSV / JSON Parser                    │
│  - Dual Output: 2D Relational Grid & Structured Notes   │
│  - Schema Validation (Pydantic / SQLite)                │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│             Persistent Local Storage Layer              │
│  - Local SQLite Database (WAL Mode enabled)             │
│  - ChromaDB Vector Store for Semantic Search            │
│  - Local Disk Master Sheet Exports (CSV / XLSX)         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Failsafe, High-Speed Local Backend Engineering

To ensure maximum efficiency, speed, and 100% uptime for local on-premise execution, the backend implements the following architectural patterns:

### 2.1 Async Queueing & Dynamic Backpressure
- **Non-Blocking I/O**: The FastAPI backend routes ingestion jobs to an asynchronous task pool (`asyncio` + background task queue).
- **Concurrency Limiting**: Semaphore-bounded inference prevents GPU/CPU out-of-memory (OOM) crashes when batching multiple documents.
- **Worker Isolation**: Extraction worker processes are isolated so that an unexpected format error in a single corrupted image does not terminate the service.

### 2.2 In-Memory Image Preprocessing & Deduplication Cache
- **SHA-256 Image Fingerprinting**: Every uploaded document is hashed upon arrival. If the document hash matches an existing processed document, extracted tabular data is served instantaneously from the local LRU cache (0ms inference overhead).
- **Canvas Downsampling & Fast Grayscale**: High-resolution 4K/8K scans are proportionally scaled down to a maximum bounding box of 2048px and normalized. This reduces inference token consumption by up to 70% while improving optical character recognition fidelity.

### 2.3 Circuit Breaker & Resilient Failover
- **Exponential Backoff**: Transient errors (e.g. rate limits on remote fallback providers or Ollama warm-up delays) automatically trigger exponential backoff retry cycles with jitter (1s, 2s, 4s).
- **Automatic Fallback Chain**: If the primary local Ollama endpoint is temporarily unreachable, the inference manager can fall back to configured secondary endpoints (or remote vision endpoints) without interrupting the client queue.

### 2.4 Database Optimization & Zero-Crash WAL Mode
- **SQLite Write-Ahead Logging (WAL)**: `PRAGMA journal_mode=WAL;` and `PRAGMA synchronous=NORMAL;` are enabled to permit high-frequency concurrent reads while batch extractions are written.
- **Connection Pooling**: Thread-safe pooled connections prevent database locks during parallel multi-document processing.

---

## 3. Local Model Ingestion & Ollama Integration

### 3.1 Supported Local Vision Models
- **`llama3.2-vision:11b`**: High-accuracy document transcription and table parsing.
- **`llama3.2-vision:latest`**: Recommended for lightweight consumer hardware.
- **`minicpm-v`**: Ultra-fast vision OCR for constrained edge devices.
- **`qwen2.5-vl`**: High-density multilingual table extraction.

### 3.2 Ollama Setup & Configuration
```bash
# Pull recommended vision model
ollama run llama3.2-vision

# Configure Ollama for multi-origin local web communication
export OLLAMA_ORIGINS="*"
export OLLAMA_KEEP_ALIVE="24h"
ollama serve
```

---

## 4. Docker Deployment & Orchestration

For production or isolated local server deployment, Visiolog provides a pre-configured multi-container stack:

```yaml
version: '3.8'

services:
  visiolog-backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: visiolog_backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./data/visiolog.db
      - OLLAMA_HOST=http://host.docker.internal:11434
      - AI_VISION_PROVIDER=ollama
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./exports:/app/exports
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

## 5. Security & Privacy Guarantees

- **100% Data Sovereignty**: All documents, metadata, extracted spreadsheets, and notes reside strictly on the host system.
- **Zero External Telemetry**: No tracking beacons, analytics scripts, or unprompted network calls.
- **Air-Gapped Operation**: Full operational support in completely offline / air-gapped intranet environments when running local Ollama inference.

---

## 6. Client-Side Browser Engine & Search Discovery Protocol

### 6.1 Pure Client-Side Architecture
The static web client and live workspace operate entirely in the client browser:
- **Zero-Storage Execution**: Document image downsampling and client-side preprocessing are performed in memory via HTML5 Canvas.
- **Direct-to-Endpoint Inference**: Browser calls out directly to configured vision inference endpoints (Gemini REST, OpenRouter, local Ollama, or OpenAI-compatible custom endpoints) without intermediate application servers.
- **Client-Side State Storage**: User API keys, custom model identifiers, extraction prompts, and conversion history are persisted in browser `localStorage`.

### 6.2 Search Engine & Crawler Optimization
- **Standardized Directives**: `robots.txt` explicitly allows full crawling for standard user agents (`Googlebot`, `Bingbot`, `Slurp`, `DuckDuckBot`, `Baiduspider`, `YandexBot`).
- **Sitemap Manifest**: `sitemap.xml` provides full coverage with change frequencies and priorities for all public entrypoints (`/`, `/workspace.html`, `/settings.html`, `/docs.html`, `/privacy.html`, `/terms.html`, `/contact.html`).
- **Canonical Meta Tags**: Each page contains strict OpenGraph, Twitter Card, and Canonical link tags for indexation.

---

## 7. Document CRUD, Multi-Format Export Engine & Data Wipe Protocol

### 7.1 Client-Side Document CRUD Management
- **Create**: Multi-image drag-and-drop / file picker ingestion, blank spreadsheet generation (`createBlankSheet`), and realistic sample preset loader (`loadSampleTemplate` for invoices, medical logs, and inventory registers).
- **Read**: Dynamic document preview with thumbnail rendering and pan-zoom expansion, interactive 2D table grid, structured Markdown notes summary, and multi-file queue inspector.
- **Update**: In-place document renaming, inline `contenteditable` cell and column header editing, real-time column sorting (alphanumeric/numeric ascending and descending), instant row filtering/searching (`filterGridRows`), and dynamic `+ Row`, `- Row`, `+ Col`, `- Col` dimension modifiers.
- **Delete**: Queue item removal, active sheet reset, individual history record deletion, and bulk history purge.

### 7.2 Multi-Format Export Engine
- **Excel (.xlsx)**: True binary spreadsheet workbook generated client-side via SheetJS (`XLSX.writeFile`) with zero server roundtrips.
- **CSV (.csv)**: Strict RFC 4180 compliant comma-separated file format with double-quote escaping.
- **JSON (.json)**: Normalized array of structured key-value objects for direct database and API pipeline ingestion.
- **Markdown (.md)**: GitHub-Flavored Markdown table representation alongside generated structured analytical notes.
- **Clipboard (TSV)**: Instant tab-separated clipboard copy for direct copy-pasting into Microsoft Excel, Google Sheets, LibreOffice Calc, or Notion.

### 7.3 Type-to-Confirm Application Reset Safeguard
- **Data Sanitization**: Under `Settings > Reset Application`, users can purge all stored credentials, custom endpoints, prompt rules, and document history.
- **Strict Verification Protocol**: The destructive wipe trigger remains strictly disabled until the user explicitly inputs `delete my data` into the confirmation input. Upon confirmation, `localStorage.clear()` and `sessionStorage.clear()` execute simultaneously, restoring factory default state.

### 7.4 Mobile-First Responsive Framework
- **Touch-Friendly Targets**: All buttons, inputs, and editable table cells adhere to minimum 44px touch targets.
- **Adaptive Viewport Modes**: On screens `< 960px`, the interface shifts from a split-pane layout to a focused tab switcher (`Upload`, `Table`, `Notes`, `History`), eliminating vertical scroll fatigue.
- **Horizontal Table Scrolling**: Spreadsheet tables are isolated in responsive touch-scroll containers with sticky column headers and dynamic row visibility indicators.

---

## 8. Icon-Driven Navigation Header & Streamlined Mobile Workspace Controls

### 8.1 Icon-Driven Header Architecture
- **Accessible Tooltips & Aria Tokens**: Text-heavy top navigation links are replaced with compact, accessible SVG icon buttons (`Workspace`, `Settings`, `Docs`, `Theme Switcher`, and `GitHub Repository`).
- **Zero Layout Shift**: Fixed-dimension 38px icon buttons maintain visual balance and prevent navigation overflow across extreme mobile screen widths (320px to 480px).

### 8.2 Mobile View Icon Transformations
- **Relatable Metaphors**: Mobile workspace tab controls use high-clarity SVG icons:
  - *Upload*: Arrow-up tray icon.
  - *Table*: 2D spreadsheet grid icon.
  - *Notes*: Document text icon.
  - *History*: Clock history icon.
- **Card and Toolbar Icons**: Interactive controls throughout the workspace feature intuitive icon representations for `New` (Plus), `Sample` (Template), `Export` (Download tray), `Sort` (Bidirectional arrows), and `Clear` (Trash bin).

### 8.3 Streamlined Spreadsheet Interactions
- **Toolbar De-Cluttering**: Redundant `+ Row`, `- Row`, `+ Col`, `- Col` buttons are eliminated from the grid header bar to maximize horizontal space for live search filtering, column sorting, and multi-format export dropdowns.
- **Direct Inline Mutation**: Users perform cell editing, row additions, and header updates directly within the 2D grid matrix via standard contenteditable interactions and keyboard shortcuts.

---

## 9. Desktop Text vs Mobile Icon Segregation & Strict Monochrome Icon Framework

### 9.1 Desktop Text Navigation & Mobile Icon Segregation
- **Desktop Viewport (>= 768px)**: Navigation links and primary action controls display clear, single-word typographic text labels (`Workspace`, `Settings`, `Docs`, `Landing`, `GitHub`, `New`, `Sample`, `Sort`, `Clear`, `Export`, `Copy`, `MD`).
- **Mobile Viewport (< 768px)**: Navigation and controls collapse seamlessly into compact, touch-friendly icon buttons, eliminating viewport overflow and line wraps.

### 9.2 Strict Non-Repeating Monochrome Icon System
- **100% Unique Glyph Registry**: Every interactive control possesses a distinct, non-repeating SVG geometry:
  - *Workspace Nav*: 2D Matrix Grid (`rect` with cross-hatched coordinates).
  - *Settings Nav*: Multi-channel parameter adjustment sliders.
  - *Docs Nav*: Open manual book outline.
  - *Theme Toggle*: Radial astronomical sun/moon monochrome vector.
  - *GitHub Repository*: Monochrome silhouette mark.
  - *Upload Action*: Ingestion tray with upward directional arrow.
  - *Table View Tab*: Layered tabular sheets polygon.
  - *Notes View Tab*: Document text line register.
  - *History Tab*: Radial analog clock dial.
  - *New Document*: Centered geometric plus cross.
  - *Sample Template*: Document structural matrix layout (zero sparkles).
  - *Convert Execution*: High-voltage forward execution vector.
  - *Retry Action*: Synchronous counter-clockwise dual-arrow loop.
  - *Sort Action*: Bidirectional vertical sort arrows.
  - *Search Action*: Magnifying optical lens.
  - *Clear / Purge Action*: Waste receptacle bin.
  - *Copy Action*: Layered dual-sheet buffer.
  - *Export Action*: Downward delivery tray.
- **Zero Sparkles & Zero Emojis**: Complete elimination of decorative magic wand/sparkle clusters and emojis across all source files, comments, and rendered elements.
- **Strict Monochrome Inheritance**: All SVGs enforce `stroke="currentColor"` or `fill="currentColor"`, eliminating inline hex colors (`#f59e0b`, `#34d399`, etc.) for seamless light/dark theme synchronization.

---

## 10. Root-Directory Live Demo Architecture

### 10.1 Root Entry Point (`demo.html`)
- **Direct Root Access**: The full in-browser interactive extraction demo is placed directly in the repository root directory as `demo.html` (`https://ederaefe.github.io/Visiolog/demo.html`).
- **Complete Feature Parity**: Contains the complete client-side processing suite:
  - Document ingestion and drag-and-drop downsampling.
  - Multi-file queue with item removal and active thumbnail switching.
  - In-browser vision inference integration across Gemini, OpenRouter, Ollama, and Custom endpoints.
  - 2D editable spreadsheet grid with inline cell and column title editing.
  - Live row search and column sorting.
  - Multi-format client-side export (SheetJS Excel `.xlsx`, RFC 4180 `.csv`, structured `.json`, Markdown `.md`, and clipboard TSV).
  - Structured notes generator and editor.
  - Local history persistence with load and individual/bulk purge capabilities.
- **Strict Compliance**: Adheres to zero-emoji, zero-sparkle, pure monochrome SVG icons, desktop text navigation, and responsive mobile icon controls.

---

## 11. Demo Directory Root Segregation & Public Folder Sanitization

### 11.1 Dedicated Root `demo/` Architecture
- **Complete Standalone Suite**: All static demo pages and components reside exclusively under the root `demo/` directory (`demo/demo.html`, `demo/workspace.html`, `demo/settings.html`, `demo/docs.html`, `demo/index.html`, `demo/contact.html`, `demo/privacy.html`, `demo/terms.html`).
- **Modular Isolation**: Keeps the static client-side web demo decoupled from server-side Next.js route components while maintaining 100% feature and styling parity.

### 11.2 Public Directory Asset Preservation
- **Asset-Only Policy**: The `public/` directory is strictly reserved for Next.js assets (brand logos, icons, service worker `sw.js`, `sitemap.xml`, and preview mockups). All HTML demo pages and `public/demo/` subfolders have been permanently purged from `public/`.





