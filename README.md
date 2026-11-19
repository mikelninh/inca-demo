# CLAIM / OS 4.0 — Evidence Intelligence

**[Open the live work sample](https://mikelninh.github.io/inca-demo/)** · [PDF Evidence Lab](https://mikelninh.github.io/inca-demo/?lab=1) · [Reviewer Study](https://mikelninh.github.io/inca-demo/?study=1)

> A claim is not a confident answer. It is a series of defensible next actions.

Independent AI Operations work sample by Michael Ninh (Berlin) for an AI-first claims TPA. **Not affiliated with inca; all examples are fictional.**

## The core question

**Can we correctly advance a claim, cite the supporting documents, and reduce human work without introducing critical mistakes?**

This repo contains the **public, privacy-preserving React research interface**, with a downloadable PDF workspace, a transparent 36-case adversarial regression suite, reviewer-study instrumentation, and a **server-side opt-in Claude evaluation CLI**. There is **no LLM backend attached to public GitHub Pages**. A separate local CLAIM / OS 4.0 package also contains the earlier Python multimodal Responses API adapter, Tesseract/OCR readback, five PDF/PNG cases and its own 40 backend tests.

## Three proof paths

| Proof path | What truly runs | What it does NOT prove |
|---|---|---|
| **[PDF Evidence Lab](https://mikelninh.github.io/inca-demo/?lab=1)** | Generates/downloads real fictional PDFs, parses PDF.js pages, verifies exact page/character spans, accepts browser-local uploads, stops on missing/mutated evidence | No OCR on uploads, no real multimodal AI, no insurance domain decision |
| **[36-case stress suite](https://mikelninh.github.io/inca-demo/)** | Six authored scenario families including ambiguous paraphrases, unreadable pages, missing sources, forged quotes, routine and missing police references; inspect every mismatch | Not a blinded external dataset, not LLM model accuracy, not expert ground truth |
| **Local model evaluation** | `scripts/claude-eval.mjs` sends 6 fictional text dossiers to the Claude Messages API only with explicit opt-in; independently validates each returned quote and records latency/tokens | Provider run **not executed** in this repo; no secret supplied, no model performance claim |

The original **CLAIM / OS 3.0 Python project** (distributed in a separate complete local package) additionally reads PDFs with PyMuPDF, invoice images with Tesseract, and can send documents via OpenAI Responses API from a local server *if* a server-side key is explicitly configured. Its independently re-run tests in the packaged version are distinct from the GitHub Pages client-side checks. **Do not conflate the two runtimes or claim they are a single deployed API.**

## Observed validations

- **39 Vitest tests passed** including source-value gates and the 36-case behavioural regression framework.
- **5 Chromium browser flows passed** on the application code: v4 dashboard (desktop/mobile), real local PDF generation/reupload, Control Tower, and 8-case reviewer experiment.
- CLI provider adapter: mock transport tested for strict schema, source quote integrity, HTTP errors and no-key guards. **0 successful real paid model calls** verified here.
- Original bundled Python runtime: **40 backend tests passed locally**, including real OCR/PDF source readback and a simulated provider request, plus the 5-case replay evaluation. **0 real paid provider calls**.
- **0 real insurers, 0 production transactions, 0 independently established minutes saved.**

These are **different test counts for different components**; never sum them into a supposed model accuracy score.

## Try the public app locally

```bash
npm ci
npm run dev
# open Vite's local URL, e.g. http://localhost:5173/inca-demo/
npx vitest run
npm run test:agent
npm run test:agent:mock
npx playwright test
```

## Optional real Claude run — fictional text only

The intentionally guarded CLI has **no provider key in the frontend**. It only processes bundled fictional text and does not access or transmit any user's uploaded PDFs.

```bash
export ANTHROPIC_API_KEY=YOUR_KEY
export ALLOW_PAID_MODEL_RUN=YES
npm run eval:claude
```

- Never commit API credentials.
- The command costs money and transfers the six fictional document texts to Anthropic.
- The evaluator rejects non-verbatim citations, invalid classifications and failed responses.
- Its output appears in `rsi/agent-eval/latest-report.json` *on the machine running the command*. Only a **successful actual provider run** may be described as model evidence. A passing mock self-test is not one.
- Different schemas/providers from the standalone Python runtime are intentionally kept separate.

## Design decisions

1. **Source-first UI**: original PDF page and source evidence can be inspected side-by-side.
2. **External verifier**: text provenance is checked by deterministic code rather than a model's own confidence score.
3. **Human responsibility**: all claims remain subject to human review; no payout, decline or external action is implemented.
4. **Honest failures**: regression cases include known lexical paraphrase misses; the UI exposes them.
5. **Metric discipline**: human time saved, insurance correctness and model quality remain unknown until independent review, proper data handling and an approved pilot.

## What would make this production credible?

Independent unseen cases with expert-adjudicated labels; accessible true OCR and box-level visual citations; source authenticity and permission controls; measured end-to-end human work (including escalations); provider cost and latency; independent security and privacy review; domain-approved action rules and insurer authorisation.

**No fake AI. No fabricated savings. No automatic settlement.**
