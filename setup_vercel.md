# Vercel Deployment Guide (20-Step Comprehensive Manual)

This document details the exact 20-step process for deploying, configuring, and optimizing Visiolog on Vercel with zero-telemetry privacy and high-speed edge proxying.

---

### Phase 1: Repository Preparation & Project Linking

1. **Verify Git Status**: On your local workstation, run `git status` inside the `VISIOLOG` repository to ensure all local changes and migrations are committed.
2. **Push to Remote Repository**: Push your code to your remote GitHub or GitLab repository:
   ```bash
   git push origin main
   ```
3. **Log in to Vercel**: Access `https://vercel.com/dashboard` and log in to your account.
4. **Initiate New Project**: Click **Add New...** -> **Project** in your team workspace.
5. **Import Repository**: Select your Git provider, locate the `VISIOLOG` repository, and click **Import**.

---

### Phase 2: Build Settings & Framework Optimization

6. **Select Framework Preset**: Ensure the **Framework Preset** is set to **Next.js**. Vercel will automatically detect Next.js 16 (App Router).
7. **Configure Root Directory**: Leave **Root Directory** set to `./` (repository root).
8. **Configure Build Command**: Under **Build and Output Settings**, verify the build command is:
   ```bash
   npm run build
   ```
9. **Configure Install Command**: Under **Install Command**, toggle override and specify:
   ```bash
   npm ci --legacy-peer-deps
   ```
   This ensures deterministic dependency resolution for spreadsheet grid packages.

---

### Phase 3: Environment Variable Injection

10. **Expand Environment Variables Section**: In the project import screen, expand **Environment Variables**.
11. **Configure Telemetry Disable**: Add key `NEXT_TELEMETRY_DISABLED` with value `1`.
12. **Configure App Base URL**: Add key `NEXT_PUBLIC_APP_URL` with value `https://your-custom-domain.com` (or your temporary `.vercel.app` URL).
13. **Configure Storage Mode**:
    - For standalone local mode: Add key `LOCAL_FIRST` with value `true`.
    - For cloud mode: Add keys `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
14. **Configure AI Provider**: Add key `AI_VISION_PROVIDER` (e.g. `gemini` or `openrouter`) along with the respective API keys (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`).
15. **Target All Environments**: Ensure these variables are assigned to **Production**, **Preview**, and **Development** scopes.

---

### Phase 4: Initial Deployment & Verification

16. **Trigger Deployment**: Click **Deploy**. Vercel will clone the repository, install dependencies with `--legacy-peer-deps`, run TypeScript validation, compile serverless functions, and deploy assets to the global edge network.
17. **Monitor Build Logs**: Observe the build console. Verify that all static pages and dynamic route handlers compile with status code `0`.
18. **Verify Edge Proxy & PWA**: Once complete, click the deployment link to open the live site. Verify that `manifest.webmanifest`, `sw.js`, and favicon headers load with 200 OK.

---

### Phase 5: Custom Domains & Post-Deployment Tuning

19. **Assign Custom Domain**: Go to **Project Settings** -> **Domains**. Enter your domain (e.g. `visiolog.yourorg.com`). Follow the on-screen DNS instructions to point an `A` record or `CNAME` to Vercel's edge network (`cname.vercel-dns.com`).
20. **SSL Certificate Issuance**: Wait 60 seconds for Vercel to automatically generate and activate your free Let's Encrypt TLS certificate with automatic HTTP-to-HTTPS redirect.
