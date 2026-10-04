# Claudia’s lens

Audience-aware marketing analysis with a navy interface, spreadsheet uploads, stakeholder-specific KPIs, evidence, meeting preparation, comparisons and text exports.

## Run locally

Requires Node.js 22.13 or newer and pnpm 11.19.0.

```sh
pnpm install
pnpm dev
```

Open the local URL printed by the development server.

```sh
pnpm build
```

## Spreadsheet template

Upload data opens a dialog with a downloadable Excel template containing 21 recognised columns, 100 blank input rows, separate fictional examples and instructions. Uploading this template analyses only the Marketing data sheet. The downloadable workbook is included in public/templates.

## Data and profiles

CSV and XLSX files are processed in browser memory. Files are limited to 10 MB and 50,000 rows per sheet. Uploads are not saved across page reloads. Custom stakeholder profiles are saved in the current browser.

Calculations use the latest available calendar month versus the preceding available month. Financial values assume GBP. Missing values remain unavailable, zero denominators produce unavailable ratios, and supplied ratios without source counts use a labelled unweighted average.

## AI configuration

Live AI requires an OpenAI API key configured on the server. Without it, the app provides a clearly labelled calculation-based assistant. Dashboard summaries and meeting preparation use deterministic logic.

Set OPENAI_API_KEY as a server-side environment secret. OPENAI_MODEL is optional; the adapter defaults to gpt-6-astra. Never place credentials in browser code or commit them to GitHub. AI requests are limited to 5,000 rows and use store: false. The server adapter requires a signed-in user through the included Sites/ChatGPT authentication integration.

## Deployment

This project uses React, Vinext/Vite and a Cloudflare Worker build. It is not a conventional Next.js deployment configuration. The included .openai/hosting.json has no account-specific project identity. Configure the hosting and authentication integration for your own environment before enabling server-side AI.

No API key or live AI inference is included or verified in this source bundle.

## Validation

Production build and TypeScript checks passed. Browser checks covered uploads, the template download and completed-template upload, empty-template rejection, stakeholder differences, evidence, profiles, meeting preparation, exports, chat, comparisons and mobile layouts.
