# Opportunity Hunter

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable%20%26%20Offline-0EA5E9)](https://web.dev/progressive-web-apps/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Discovery%20%26%20Pages-2088FF?logo=githubactions&logoColor=white)](.github/workflows/hunter.yml)

**Opportunity Hunter** is a client-side Single-Page Progressive Web Application (SPA PWA) paired with an automated GitHub Actions discovery pipeline. It helps independent AI systems developers track, deterministically score, and manage opportunities across **Research & Model Evaluation**, **Recruitment & Contracting**, **Early Access & Credits**, **Grants & Competitions**, **Partnerships & Innovation**, and **Community & Fellowships**.

---

## Key Capabilities

- **Deterministic, Explainable Scoring (0–100):** Scores every opportunity across five weighted dimensions (`Skills & Flagship Projects 30%`, `Eligibility & Location 25%`, `Category & Benefit Fit 20%`, `AI Systems Depth 15%`, `Deadline Urgency 10%`), exposing matched signals, uncertain checks, and recommended next actions.
- **Explicit Eligibility Gate:** Prioritizes Sweden and remote/international opportunities while keeping uncertain eligibility conservative and capping ineligible entries so excluded roles never masquerade as top matches.
- **Separated Status Model:** Tracks **external listing status** (`open`, `closing_soon`, `closed`, `unknown`) independently from **personal workflow stages** (`new`, `saved`, `preparing`, `applied`, `interview`, `accepted`, `rejected`, `dismissed`).
- **Offline-First Local Persistence:** Stores profile rules, scoring weights, pipeline stages, and notes in **IndexedDB** with synchronous **localStorage** fallback and one-click JSON export/import backup.
- **Untrusted Data Sanitization:** Sanitizes pasted JSON batches and external RSS/Atom/JSON feeds so external text is never executed or injected as raw HTML.
- **Installable PWA:** Ships with a complete Web App Manifest, `192x192` / `512x512` / maskable PNG icons, iOS `apple-touch-icon`, Workbox offline asset caching, in-app install prompt, and offline status banner.

---

## Architecture

```text
.
├── .github/workflows/
│   ├── hunter.yml               # Daily cron discovery & feed commit workflow
│   └── pages.yml                # Static Vite PWA build & GitHub Pages deployment
├── public/
│   ├── data/opportunities.json  # Static discovered opportunity feed served at ./data/opportunities.json
│   ├── icon.svg                 # Vector brand mark
│   ├── pwa-192x192.png          # Standard PWA icon
│   ├── pwa-512x512.png          # High-res PWA icon
│   ├── pwa-maskable-512x512.png # Safe-zone padded maskable icon
│   └── apple-touch-icon.png     # 180x180 iOS Safari touch icon
├── scripts/
│   └── discover.mjs             # Live rss / json / grant_program discovery & dedupe runner
├── shared/
│   ├── default-profile.json     # Canonical developer profile & weights shared across Node and UI
│   ├── scoring-core.d.ts        # TypeScript declarations for shared scoring module
│   └── scoring-core.mjs         # Canonical phrase-aware scoring, eligibility gate & sanitization
├── src/
│   ├── components/              # Dashboard, Opportunities, Pipeline, Profile, Modals, PWA UI
│   ├── hooks/                   # usePWAInstall, useOnlineStatus
│   ├── lib/                     # Canonical scoring wrapper, demo seed markers, IndexedDB storage
│   ├── App.tsx                  # Main application shell
│   ├── main.tsx                 # React entry point + ErrorBoundary + SW registration
│   └── types.ts                 # Domain TypeScript interfaces
├── index.html
├── package.json
└── vite.config.ts               # Vite + Tailwind CSS v4 + VitePWA configuration (dynamic base path)
```

---

## Local Development

```bash
# Install dependencies
npm ci

# Run live discovery adapters locally (writes public/data/opportunities.json)
npm run discover

# Start Vite dev server on http://localhost:3000
npm run dev

# Type-check and build production static PWA into ./dist
npm run lint
npm run build
```

---

## Configuring Discovery Sources (`scripts/discover.mjs`)

Live sources are pre-configured in `SOURCES` inside `scripts/discover.mjs` using three modular adapters:

1. **`rss`**: Supports RSS 2.0 (`<item>`) and Atom (`<entry>`) feeds (e.g., We Work Remotely, Hugging Face Blog, OpenAI News), with `keywordsOnly` filtering.
2. **`json`**: Consumes public JSON job and program APIs (e.g., Remotive AI, Anthropic Greenhouse, Scale AI Greenhouse) using dot-path `itemsPath` and `fields` mapping.
3. **`grant_program`**: Tracks structured grant JSON feeds or verifies landing page availability and open/closed signals via `markers`.

Cross-run deduplication strips tracking parameters (`utm_*`, `ref`, `gh_src`) to build a canonical URL key, falling back to a normalized `organization::title` hash when links point to generic hubs.

---

## Deploying to GitHub Pages

1. Push the repository to the `main` branch on GitHub.
2. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. Both **Opportunity Hunter Discovery** (daily cron / manual dispatch writing `public/data/opportunities.json`) and **Deploy PWA to GitHub Pages** (building with automatic `VITE_BASE_PATH` for `/<repo>/` project sites) run automatically.
