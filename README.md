# Visiolog

> **Privacy-First Document Extraction & Real-Time Spreadsheet Studio for Schools and Organizations**

Visiolog is a modern, open-source web platform engineered to transform scanned invoices, receipts, ledgers, and academic records into interactive, high-performance spreadsheets with uncompromising privacy guarantees.

---

## Key Highlights

- **Zero-Persistence Privacy**: Document parsing occurs in-memory. Sensitive institutional documents, student records, and financial receipts are not stored on public clouds or third-party servers.
- **Bring Your Own Key (BYOK)**: Connect your own Google Gemini AI keys or local inference endpoints directly. No centralized intermediary proxy or vendor lock-in.
- **Pure-React Interactive Spreadsheet Studio**: Instant client-side computation for `=SUM`, `=AVERAGE`, `=PRODUCT`, nested ranges, formula bars, sorting, dynamic zoom, and multi-sheet workflows.
- **Universal Multi-Format Export**: Export parsed matrices instantly to `.xlsx`, `.csv`, `.json`, and print-ready `.pdf`.
- **Intranet and Self-Hostable**: Deployable anywhere via Docker on private school servers and local networks.

---

## Quickstart

### Prerequisites

- **Node.js**: v20.x or higher
- **npm** or **pnpm**
- **Google Gemini API Key**: [Get a key from Google AI Studio](https://aistudio.google.com/)

### 1. Clone Repository

```bash
git clone https://github.com/your-username/visiolog.git
cd visiolog
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase connection strings and Gemini API key:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_PRIVACY_MODE=true
```

### 3. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Self-Hosting with Docker

To deploy Visiolog on your private school or enterprise intranet using Docker Compose:

```bash
# 1. Ensure .env.local exists with your configuration
cp .env.example .env.local

# 2. Build and launch container
docker compose up -d
```

The application will be accessible at port `3000`.

---

## Privacy & Compliance for Institutions

Visiolog is designed with a **Privacy-by-Design** architecture:

1. **FERPA and GDPR Alignment**: Document images are held in volatile client memory during extraction and immediately purged upon matrix generation unless local archiving is explicitly enabled by your administrator.
2. **Zero Telemetry**: All external tracking and third-party analytics are disabled by default.
3. **Sovereign Key Custody**: API keys remain under institutional custody via standard environment variables or browser-level settings.

---

## Contributing

We welcome contributions from educators, developers, and privacy advocates! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development workflows.

---

## Security

For security vulnerability disclosures, please review our [SECURITY.md](SECURITY.md).

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.
