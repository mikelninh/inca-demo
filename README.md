# INCA CLAIM OPERATIONS LAB · v0.4

> **From claim to judgement. With receipts.**
>
> [Open the 90-second interactive demo](https://mikelninh.github.io/inca-demo/) · [PDF Evidence Lab](https://mikelninh.github.io/inca-demo/?lab=1) · [Reviewer study](https://mikelninh.github.io/inca-demo/?study=1) · [Source and CI](https://github.com/mikelninh/inca-demo/actions)

An independent, public work sample by Michael Ninh for **AI Operations Associate** roles at AI-first claims TPAs. Not affiliated with INCA. All available case data and examples are **fictional**.

## What the default demo really demonstrates

A real PDF-to-review experience rather than a fake LLM screen:

1. **Select one of three authored synthetic claims.** The browser generates proper, downloadable PDF files.
2. **Inspect original pages and citations.** PDF.js parses the PDF bytes and the source desk links exact character spans to their actual extracted pages.
3. **Review a deterministic handoff.** A conservative guardrail evaluates document completeness, unreadable pages, source integrity and a narrow sample discrepancy. It never settles a claim.
4. **Break it intentionally.** Removing an invoice or forging a citation must force a STOP, with a human next action and no external side effects.
5. **Examine the evidence behind the metrics.** 40/40 authored deterministic pipeline regression cases (not a real-world accuracy benchmark), plus an optional eight-case review study.

The app's default route is **the single 90-second mission**. Older historical prototypes remain at `?lab=1`, `?ops=1`, `?study=1`, and `?legacy=1`.

## Actual Claude endpoint — prepared but NOT silently activated

`netlify/functions/agent-claims.mjs` implements a *real* server-only call to Claude through **Netlify AI Gateway**, using the official Anthropic SDK. There is no browser-exposed API key and no frontend imitation of live results. The code:

- Accepts **only** `{ "caseId": "parking" | "water" | "burglary" }` — no public uploads, original document text or arbitrary prompts.
- Reconstructs the **known synthetic source texts on the server**, instructs the model to return bounded structured tool output, and checks each quote against a **single exact original source line**.
- Requires a citation with source document and page for every finding. Browser additionally verifies that the model's cited span appears in its *extracted original PDF text*.
- Fails closed for invalid schemas, forged citations, absent required document types or bad provider output. It only suggests a **human** action; no payout, decline, external email or insurer-system integration is possible.
- Applies per-IP rate limiting (3 requests/hour), no-store headers and bounded output tokens. No user-supplied PDF contents are sent to the model.
- Is **off by default** unless `ENABLE_PUBLIC_MODEL_RUNS=1` is set in a deployed Netlify project's Function environment, a production deploy has activated AI Gateway and spend limits have been reviewed. This avoids surprising inference costs.

**Important:** The present public URL is GitHub Pages, a static host. It deliberately reports “agent unavailable on this host”; a real Claude call has **not** been executed or verified there. Do not describe the GitHub Pages demonstration as a live AI agent. A secure Netlify function deploy is the next dependency before making any live-model claims. Netlify can use the repository's `netlify.toml` and the Vite build with `NETLIFY=true`; it hosts the website and the function on the same origin.

Netlify deployment (owner-controlled):
- Connect this GitHub repo as a new Netlify project on a credit-based plan and publish at least once (AI Gateway activates after the initial production deploy).
- Review project access, AI quotas, spending controls and rate limits first. Then set `ENABLE_PUBLIC_MODEL_RUNS=1` in the **Functions** environment scope and redeploy.
- Test the live endpoint on the public three-case scenario and verify the returned citation anchors against the actual PDFs. Do not provide real insurance files to this route.

## Honest quality gates

| Signal | What it proves | What it does NOT prove |
| --- | --- | --- |
| 40 scripted regression variations | Authored guardrail behaviour across complete, incomplete, unreadable, tampered and contradictory fixture variants | Model accuracy, unseen-case generalisation, fraud detection, regulatory correctness |
| Model response source validation | Exact author-written text quotes are mechanically supported on the cited source page | Semantic relevance, documentary authenticity, correct interpretation |
| Unit & browser tests | Code builds, PDF pages render, citations link, exports remain local, failures block | Zero critical errors in live claims or staff time savings |
| Optional Claude model path | Real provider integration **when securely deployed and enabled** | Measured model performance before an actual, verified provider call |
| Trial route | Reviewers can voluntarily take part in a synthetic test | Genuine efficiency before independent participant results exist |

**Target gate for a real pilot:** at least 30 independently curated unseen claims with double-expert labels, zero unflagged critical mistakes, 100% cited high-impact findings, documented false referrals, and total staff minutes measured **through completed human handoffs**. Require legal/privacy signoff and access controls first.

## Reproduce locally

```bash
npm ci
npm run build
npx vitest run
npx playwright test
```

Netlify Function syntax can be checked with `node --check netlify/functions/agent-claims.mjs`. The production GitHub Pages deployment runs strict TypeScript, Vitest and Vite; a second workflow tests the **actual public site** in Chromium, including the mission, PDF parsing, forged evidence cases, the older reviewer study and responsive mobile layout.

## Why it exists

A useful AI Operations Associate should not merely show an agent producing an answer. The operational question is: **Can we make evidence-based decisions, know when not to trust them, and measure whether human work actually decreases?**

This is a transparent, still-incomplete answer to that question — meant to be inspected, challenged and improved rather than oversold.
