# Visiolog Software Setup Manuals

This directory contains comprehensive, 20-step setup manuals for self-hosters and teams configuring optional cloud services with Visiolog.

---

## Setup Manuals Overview

Visiolog runs 100% locally out of the box with zero external configuration required using browser-native **IndexedDB** and local **Ollama** models. 

For users and organizations who choose to synchronize data across devices or leverage cloud vision inference, three detailed 20-step configuration guides are provided:

1. **[Supabase Setup Guide (20 Steps)](./setup_supabase.md)**
   - Database provisioning, PostgreSQL schema migration, Row Level Security (RLS) policies, private storage bucket configuration, and environment key injection.
   - File: [`setup_supabase.md`](file:///C:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG/setup_supabase.md)

2. **[Vercel Deployment Guide (20 Steps)](./setup_vercel.md)**
   - Repository linking, Next.js build overrides (`npm ci --legacy-peer-deps`), environment variables, edge proxying, custom domain DNS, and zero-telemetry configuration.
   - File: [`setup_vercel.md`](file:///C:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG/setup_vercel.md)

3. **[Google Gemini Setup Guide (20 Steps)](./setup_gemini.md)**
   - Google AI Studio key generation, multi-key rotation pool setup (`GEMINI_API_KEY_1..12`), rate limit mitigations, model cascade resolver, and quota monitoring.
   - File: [`setup_gemini.md`](file:///C:/Users/USER/Documents/Codes%20and%20projects/VISIOLOG/setup_gemini.md)

---

## Quick Reference Architecture Matrix

| Service | Mode | Required? | Primary Purpose | Guide Link |
| :--- | :--- | :--- | :--- | :--- |
| **IndexedDB** | Local | Built-in | 100% offline standalone database | Zero setup needed |
| **Ollama** | Local | Optional | Air-gapped offline vision OCR | [`documentation.md#41-supported-providers`](./documentation.md) |
| **Supabase** | Cloud | Optional | Multi-user & multi-device sync | [20-Step Guide](./setup_supabase.md) |
| **Vercel** | Cloud | Optional | Global edge serverless hosting | [20-Step Guide](./setup_vercel.md) |
| **Gemini** | Cloud | Optional | High-speed vision OCR with key rotation | [20-Step Guide](./setup_gemini.md) |
