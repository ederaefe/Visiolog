# Google Gemini Setup Guide (20-Step Comprehensive Manual)

This document provides a 20-step manual for configuring Google Gemini AI vision models with multi-key rotation and automated failover in Visiolog.

---

### Phase 1: Google AI Studio Account & Project Setup

1. **Access Google AI Studio**: Open your browser and go to `https://aistudio.google.com/`. Log in with your Google account.
2. **Accept Terms of Service**: Read and accept the Google AI Studio Terms of Service and Privacy Guidelines.
3. **Open API Keys Dashboard**: In the left sidebar navigation, click **Get API key**.
4. **Create Primary API Key**: Click **Create API key**. Choose to associate it with an existing Google Cloud Project or create a new dedicated project (e.g. `Visiolog-OCR-Vision`).
5. **Copy Primary Key**: Click the copy icon to copy your primary API key (`GEMINI_API_KEY`). Store it in a secure text file.

---

### Phase 2: High-Concurrency Multi-Key Rotation Pool Setup

6. **Understand Rate Limits**: Free tier keys allow up to 15 Requests Per Minute (RPM). To handle continuous high-throughput scanning, Visiolog includes a built-in key rotator (`src/lib/api-key-rotator.ts`) that load-balances requests across a pool of up to 12 keys.
7. **Generate Key #2**: In Google AI Studio, click **Create API key in new project**. Assign the project name `Visiolog-Pool-2` and copy the generated key.
8. **Generate Key #3**: Repeat the process for `Visiolog-Pool-3` and copy the key.
9. **Generate Additional Keys (Optional)**: If running enterprise workloads, generate keys `GEMINI_API_KEY_4` through `GEMINI_API_KEY_12` across separate cloud projects to distribute quota allocations.

---

### Phase 3: Model Capabilities & Selection

10. **Review Supported Vision Models**: Visiolog utilizes multimodal vision models with high optical character recognition accuracy:
    - `gemini-2.5-flash`: Best balance of transcription speed, complex tabular reasoning, and high throughput.
    - `gemini-2.0-flash`: Ultra-low latency model for quick single-page receipt and note scanning.
11. **Configure Model Resolver**: In `src/lib/gemini-model-resolver.ts`, Visiolog automatically tests and pins the fastest responding model.

---

### Phase 4: Local & Production Environment Configuration

12. **Open Environment File**: Open `.env.local` in your local project root or access your server environment editor.
13. **Set Active AI Provider**: Specify Gemini as the primary provider:
    ```env
    AI_VISION_PROVIDER=gemini
    ```
14. **Inject Primary API Key**:
    ```env
    GEMINI_API_KEY=AIzaSyYourPrimaryKeyHere
    ```
15. **Inject Rotation Pool Keys**: Add your secondary and tertiary keys:
    ```env
    GEMINI_API_KEY_2=AIzaSyYourSecondaryKeyHere
    GEMINI_API_KEY_3=AIzaSyYourTertiaryKeyHere
    ```
16. **Save Configuration**: Save `.env.local` and restart your local dev server or container.

---

### Phase 5: Testing, Validation & Quota Monitoring

17. **Perform Test Extraction**: Open Visiolog at `http://localhost:3000`, navigate to `/projects` or `/workspace`, and upload a test document with tabular numbers.
18. **Inspect Extraction Speed**: Verify that the document converts to clean CSV rows in the spreadsheet within 2 to 4 seconds.
19. **Test Key Rotation Resilience**: If a key encounters a 429 rate limit or network timeout, check the server console to observe the rotator automatically rotating to the next key in the pool with exponential backoff:
    ```
    [ApiKeyRotator] Key #1 rate-limited. Rotating to Key #2.
    ```
20. **Monitor Usage in Google Cloud**: Periodically check `https://console.cloud.google.com/apis/dashboard` under your Visiolog projects to track daily token consumption and request distributions.
