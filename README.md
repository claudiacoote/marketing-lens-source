# Lens — Audience-aware marketing intelligence

A responsive MVP for uploading marketing spreadsheets, calculating facts and adapting priorities to business stakeholders.

## Run locally

Requires Node 22.13+ and pnpm 11.19.0.

- `pnpm install`
- `pnpm dev`
- `pnpm build`

The starter was migrated to pnpm because npm is unavailable in the supplied environment. pnpm-lock.yaml records the installed dependencies.

## Working features

- Browser-only CSV and XLSX parsing, workbook sheet selection, data preview and editable column meanings.
- Totals, monthly comparisons, denominator-weighted ratios, channel contributions and rankings.
- Six stakeholder profiles, custom profiles saved in this browser, five preference controls, comparison of two perspectives.
- Evidence with source fields, relevant records, periods, formulas and confidence.
- Meeting opening, likely questions, difficult questions, numbers and overclaim limits.
- Five downloadable text outputs and clipboard copy.
- Grounded calculation-based assistant, plus a server-side OpenAI Responses API adapter.

## AI configuration

Live AI is not enabled: no API key has been supplied. Set `OPENAI_API_KEY` as a server-side Site secret using the OpenAI Developers plugin. `OPENAI_MODEL` is optional (default: gpt-6-astra). No keys are stored or accepted by the browser. The API recalculates facts server-side and sends only aggregated metrics, rankings and profile context to the model. It uses `store: false`, verifies sign-in and origin, limits request size and uses a 45-second timeout.

Official implementation reference: https://developers.openai.com/api/docs/quickstart

AI operates in the Ask the data panel when configured. Dashboard summaries and meeting preparation remain deterministic. Free-text communication preferences are saved; detail, numerical preference, metric priorities and caution influence the deterministic output. The strategic/operational control sets orientation. Formality is passed to AI when connected.

## Scope and assumptions

- Files: up to 10 MB and 50,000 rows per sheet; AI requests limited to 5,000 rows.
- Uploads stay in browser memory and are removed on reload. Custom profiles persist locally on the same browser, not across devices.
- Comparisons use latest available calendar month versus the preceding available month. Incomplete coverage is warned about, not normalised.
- Currency is assumed GBP. Slash dates use day/month/year.
- Missing numerical values are omitted. Zero denominators yield unavailable ratios. Supplied ratios without underlying counts use an explicitly labelled unweighted average.
- ROI requires gross profit and spend. ROAS does not establish profitability or causality.
- Text outputs are drafts for review. No email, Slack or Teams messages are sent.
- WebMCP tools are feature-detected; browser support validation was unavailable.

## Validation

TypeScript and production builds pass. Calculation tests verify ratios, changes, zero denominators, missing ROI and stakeholder priorities. Browser checks cover uploads, profiles, evidence, meetings, exports, comparison, chat and mobile layout. Live model inference is unverified until an API key is connected.

## Spreadsheet template

Upload data opens a dialog with a downloadable Excel template. The template provides 21 recognised headers and 100 blank input rows, plus separate examples and instructions. Uploading this template analyses only Marketing data; empty templates are rejected. Download and completed-template upload were verified on desktop and mobile.

