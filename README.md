# Visiolog

<div align="center">

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Offline_Vision-black)](https://ollama.com/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Multimodal-purple)](https://openrouter.ai/)
[![PWA](https://img.shields.io/badge/PWA-100%25_Offline_Ready-success)](https://web.dev/progressive-web-apps/)

**Open-Source AI Document-to-Spreadsheet Studio & Tabular OCR Engine**

*Transform paper logbooks, receipts, financial records, handwritten tables, and PDFs into interactive spreadsheets with 100% privacy sovereignty.*

[Live Demo](./public/demo/) • [Quickstart](#quickstart) • [Features](#key-features) • [Architecture](#architecture) • [Self-Hosting](#self-hosting--docker) • [Database Studio](#in-app-database-studio) • [Setup Guides](#setup-guides)

</div>

---

## What is Visiolog?

**Visiolog** is an open-source, privacy-first document intelligence platform and interactive spreadsheet studio. It converts physical paper documents, photographs, and PDF files into structured digital spreadsheets (`.xlsx`, `.csv`) and clean notes in seconds.

Unlike cloud-dependent SaaS OCR services, Visiolog runs **100% locally and air-gapped** using browser-native **IndexedDB** storage and local **Ollama** vision models (`llama3.2-vision`, `minicpm-v`, `qwen2.5-vl`), or connects seamlessly to cloud backends (**Supabase**, **OpenRouter**, **Google Gemini**) for multi-device synchronization.

---

## Key Features

### 1. Multimodal Tabular & Note OCR
- **High-Fidelity Table Extraction**: Converts complex tabular matrices, multi-line cells, financial ledgers, and scanned forms into standard CSV and Excel.
- **Handwritten Registry Recognition**: Parses handwritten logs, dates, quantities, and currency amounts with spatial alignment.
- **Plain Text & Note Mode**: Transcribes memos, letters, and unstructured documents with preserved line breaks and list numbering.

### 2. Multi-Provider Vision AI Engine
- **Local Air-Gapped Inference**: Connects directly to local Ollama instances (`llama3.2-vision`, `minicpm-v`, `qwen2.5-vl`) with zero internet access required.
- **Multi-Model Cloud Routing**: Native OpenRouter support (`meta-llama/llama-3.2-11b-vision-instruct`, `qwen/qwen-2.5-vl-72b-instruct`, `claude-3.5-sonnet`).
- **High-Speed Flash Vision**: Google Gemini Flash models with an automatic 12-key rotation load balancer and exponential retry backoff.
- **Custom OpenAI Endpoints**: Plug into LocalAI, vLLM, LM Studio, or private enterprise vision gateways.

### 3. Interactive Spreadsheet Studio
- In-browser reactive spreadsheet engine with formulas (`=SUM`, `=AVERAGE`, `=PRODUCT`, `=COUNT`).
- Column management (insert, delete, rename, resize), real-time sorting, search filtering, and instant export to `.csv` and `.xlsx`.

### 4. Fixed Settings & Header Reconciliation
- Define strict master schemas (e.g. `Date, Item, Quantity, Price, Total`) for continuous batch scanning.
- Disparate document column structures are automatically aligned and appended into your project master sheet.

### 5. In-App Database Studio
- Complete replacement for external database dashboards.
- Visual table explorer for `projects`, `documents`, `spreadsheets`, `profiles`, `processing_jobs`, and `system_logs`.
- Inline JSON drawer editor, column sorting, search filters, and 1-click database backup export/restore (`.json`).

### 6. Zero-Telemetry Privacy Sovereignty
- Zero external tracking, zero analytics packages, zero persistent image retention.
- Binary files process strictly in volatile memory buffers and are discarded immediately after transcription.

---

## Architecture

```
+---------------------------------------------------------------------------------+
|                                 VISIOLOG STUDIO                                 |
+----------------------------------------+----------------------------------------+
                                         |
            +----------------------------+----------------------------+
            |                                                         |
            v                                                         v
+-------------------------------------+   +-------------------------------------+
|         LOCAL-FIRST ENGINE          |   |          CLOUD-SYNC ENGINE          |
| - 100% Offline Air-Gapped           |   | - Multi-Device Synchronization      |
| - Browser IndexedDB Storage         |   | - Supabase PostgreSQL Database      |
| - Local Ollama Vision Daemon        |   | - OpenRouter / Gemini Cloud Models  |
| - Direct File Export (.csv / .xlsx) |   | - Edge Serverless Hosting           |
+-------------------------------------+   +-------------------------------------+
```

---

## Quickstart

### Prerequisites
- Node.js 20+ and npm
- Git

### 1. Clone Repository
```bash
git clone https://github.com/ederaefe/Visiolog.git
cd Visiolog
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser. Visiolog will immediately operate in local-first standalone mode with zero cloud configuration required.

---

## Self-Hosting & Docker

### 1-Command Air-Gapped Deployment with Ollama

Run Visiolog alongside a local Ollama vision container using Docker Compose:

```bash
docker compose -f docker-compose.ollama.yml up -d
```

Pull your vision model into the Ollama container:
```bash
docker exec -it visiolog_ollama ollama pull llama3.2-vision
```

Access the studio at `http://localhost:3000`.

### Standard Docker Build

```bash
docker build -t visiolog:latest .
docker run -d -p 3000:3000 -e LOCAL_FIRST=true visiolog:latest
```

---

## In-App Database Studio

Accessible at `/admin/database` or `/database`:

```
+---------------------------------------------------------------------------------+
| TABLES            | SEARCH & ACTIONS: [ Search records... ] [Export] [Import] [+] |
| - projects        +-------------------------------------------------------------+
| - documents       | ID          | NAME           | CREATED_AT        | ACTIONS  |
| - spreadsheets    | proj_101    | Inventory Q1   | 2026-08-31T12:00  | Edit Del |
| - profiles        | proj_102    | Lab Scans      | 2026-08-31T13:30  | Edit Del |
| - processing_jobs +-------------------------------------------------------------+
| - system_logs     | Pagination: Page 1 of 4                         [<] [>]     |
+-------------------+-------------------------------------------------------------+
```

- **Table Navigator**: Real-time browsing across all application stores.
- **Dual Mode**: Direct inspection of browser IndexedDB or Supabase PostgreSQL.
- **Data Portability**: 1-click JSON snapshot backup export and restore.

---

## Setup Guides

For users deploying optional cloud backends, refer to our step-by-step 20-step setup manuals:

- [Master Setup Index](./software_setup.md)
- [Supabase Setup Guide (20 Steps)](./setup_supabase.md)
- [Vercel Deployment Guide (20 Steps)](./setup_vercel.md)
- [Google Gemini Setup Guide (20 Steps)](./setup_gemini.md)
- [Comprehensive User Manual](./documentation.md)

---

## Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `LOCAL_FIRST` | No | `false` | Enables zero-cloud standalone mode |
| `AI_VISION_PROVIDER` | No | `gemini` | Active inference provider (`ollama`, `openrouter`, `gemini`, `custom`) |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama daemon base URL |
| `OLLAMA_MODEL` | No | `llama3.2-vision` | Default Ollama vision model |
| `OPENROUTER_API_KEY` | Conditional | - | OpenRouter API authentication token |
| `OPENROUTER_MODEL` | No | `meta-llama/llama-3.2-11b-vision-instruct` | OpenRouter model ID |
| `GEMINI_API_KEY` | Conditional | - | Primary Google Gemini API key |
| `GEMINI_API_KEY_2..12` | No | - | Multi-key rotation pool keys |
| `NEXT_PUBLIC_SUPABASE_URL` | No | - | Supabase project URL for cloud mode |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| No | - | Supabase public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | - | Supabase administrative service role key |

---

## Contact & Support

For feature requests, enterprise deployments, bug reports, or partnership inquiries:

- **Founder & Developer Email**: `elrazortheodore@gmail.com`
- **Repository**: [https://github.com/ederaefe/Visiolog](https://github.com/ederaefe/Visiolog)

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.
