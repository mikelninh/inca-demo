# CLAIM / OS 8.0 — Story & Work · Evidence Experience

**[Open the live Story Mode](https://mikelninh.github.io/inca-demo/)** · [Work Mode](https://mikelninh.github.io/inca-demo/?mode=work) · [Classic v6 Operator Desk](https://mikelninh.github.io/inca-demo/?classic=1) · [PDF Evidence Reader](https://mikelninh.github.io/inca-demo/?lab=1) · [36-case Evaluation](https://mikelninh.github.io/inca-demo/?evaluation=1) · [Reviewer Study](https://mikelninh.github.io/inca-demo/?study=1)

> A claim is not a confident answer. It is a defensible next action.

Independent AI Operations work sample by Michael Ninh (Berlin) for an AI-first claims TPA. **Not affiliated with inca; all examples are fictional.**

## The core question

**Can we correctly advance a claim, cite the supporting documents, and reduce human work without introducing critical mistakes?**

This repo contains the **public, privacy-preserving React research interface**, with a downloadable PDF workspace, a transparent 36-case adversarial regression suite, reviewer-study instrumentation, and a **server-side opt-in Claude evaluation CLI**. There is **no LLM backend attached to public GitHub Pages**. A separate local CLAIM / OS 5.0 package also contains the earlier Python multimodal Responses API adapter, Tesseract/OCR readback, five PDF/PNG cases and its own 40 backend tests.

## v8 — Two experiences, one validated source engine

**Story Mode** retains the editorial three-shot discovery, but now reveals a real PDF source with a restrained amber spotlight, scroll-to-citation and a non-blocking transition (fully disabled by reduced-motion preferences). Its mobile layout shows the actual finding **before** a deliberately compact document preview; users can open a real full-screen PDF viewer with page, document and zoom controls.

**Work Mode** is shareable at `?mode=work` and eliminates repeated scene progression for daily claims work. The operator sees the original PDF, the case finding, an independently checked source list, the human next action and note/reopen controls together. Switching modes does not erase the active case, its role corrections, page selection or audit.

**PDF specimens** now resemble modest, legible, fictional insurance correspondence: distinct document types, warm white paper, structured headings, invoice rows and clear **FIKTIVES TESTDOKUMENT** labelling. The source files remain actual generated PDFs, so exact text-spans and source highlights can still be checked.

**Safety and limits:** No paid AI call is made from the public demo, no customer data is transmitted by its React workflow, no real claim gets paid/denied, and the audit export excludes document raw text and notes. The source-highlighting gate checks **literal PDF character spans**, not the substantive truth of a claim. Work and Story both use the same deterministic assessment and human-only action constraints. Not production ready.

**Validation:** Existing v5/v6/v7 tests remain. New tests exercise a clickable reveal CTA, story and work modes, original-PDF fullscreen at 390 px, safety gating at 320 px and 7 actual browser screenshots in `test-results/v8/` archived by CI.

## v7 — The cinematic three-shot experience

The public default tells a claim's story in **three real, accessible scenes** rather than another KPI-heavy administrative dashboard.

1. **01 · Der Fall:** A real PDF on a warm-paper canvas, a grounded finding in editorial type, a minimal inventory and one invitation to inspect the source.
2. **02 · Die Fundstelle:** Verified literal source quotes highlighted on the original PDF, with real document/page navigation. A word-for-word quote check is **not** independent semantic verification or legal expert review.
3. **03 · Die Handlung:** Human-only next steps, guarded referral/request actions, source-role correction, extra PDFs attached to an existing waiting case, and a privacy-safe audit download.

**Design system:** graphite, paper, amber, restrained editorial serif, source-led composition, subtle animations (respects reduced-motion), accessible scene tabs (keyboard shortcuts 1/2/3), case drawer, and 390px mobile layout.

The v6 original work queue remains at `?classic=1`, v5 PDF lab at `?lab=1`, evaluation at `?evaluation=1`. This public interface is **browser-only**, operates on fictional or locally imported PDFs, does **not** call a live AI model, interpret coverage, OCR scanned-image PDFs, send actual emails, write to insurer systems or make payout decisions. Time-to-action is not proven time saved. Uploaded raw texts and reviewer notes are excluded from the audit export.

**Visual release gates:** The Playwright suite writes actual Chromium screenshots into `test-results/v7/`: `01-the-case.png`, `02-the-evidence.png`, `03-the-action.png`, and `04-mobile-case.png`. CI attaches these to the `inca-research-taste-evidence` job artifact for design review.
## What's operational in v6?

**A daily queue, rather than another marketing dashboard.** The default route loads and PDF-parses three fictional dossiers and prioritises them by a deterministic source-gate policy. Every state transition is an explicit human action.

- **Queue and prioritisation:** critical source/document problems appear first, followed by mismatch review and routine expert-ready cases.
- **Actual intake:** import up to 12 local PDF files per batch (8 MB each, 12 pages maximum). To separate cases, name *every* document with a shared prefix such as \`CASE-104__Schadenmeldung.pdf\`, \`CASE-104__Vertrag.pdf\`, \`CASE-104__Rechnung.pdf\`. Without a case prefix, all selected files deliberately form **one** dossier. Mixed conventions are blocked rather than silently merging customers.
- **Local triage:** PDFs are parsed inside the browser and grouped by explicitly supplied filename case keys; document type is only inferred from names. An operator can correct each role and retrigger triage.
- **Resume awaiting cases:** attach newly received PDFs to the selected case in the browser. It reopens automatically, preserves prior audit events and recalculates the source gate. No repeated external message is sent.
- **Document proof:** a clicked source quote highlights only matching text coordinates from the original PDF, never fabricated geometry. A text-only PDF without usable text is blocked; no image OCR is claimed by the public interface.
- **One-step human handoff:** record a request for more documents, refer to a specialist, or queue for regular *expert* review (only when the technical source gate allows it). **No e-mail is actually sent, no insurance claim is paid or denied.**
- **Review history:** actions, reopenings and elapsed time-to-action are tracked **in memory** for the browser session, not in an insurer system. Time includes possible idle time and is **not** a productivity measurement.
- **Privacy-safe audit download:** JSON includes generic case keys, statuses, source-role counts and timing only — **never** original PDF contents, filenames, literal quotes or free-text reviewer notes.

**Product limitations:** There is no service backend, account login, shared queue, persistence across reloads, policy/coverage decision engine, inbox integration, insurer write-access, OCR on GitHub Pages or live LLM call. The optional API scripts and local Python prototype remain separate runtimes. Do not use actual customer documents without an approved privacy and security review.

This architecture is intentionally a **real browser-local workflow prototype**, not a production-ready claims platform.

## Three proof paths

| Proof path | What truly runs | What it does NOT prove |
|---|---|---|
| **[Public Evidence Workbench](https://mikelninh.github.io/inca-demo/?lab=1)** | Generates/downloads real fictional PDFs, parses PDF.js pages, highlights verified source-derived text-run rectangles directly on rendered PDF pages, verifies exact page/character spans, accepts browser-local uploads, stops on missing/mutated evidence | No OCR on uploads, no real multimodal AI, no insurance domain decision |
| **[36-case stress suite](https://mikelninh.github.io/inca-demo/?evaluation=1)** | Six authored scenario families including ambiguous paraphrases, unreadable pages, missing sources, forged quotes, routine and missing police references; inspect every mismatch | Not a blinded external dataset, not LLM model accuracy, not expert ground truth |
| **Local model evaluation** | `scripts/claude-eval.mjs` sends 6 fictional text dossiers to the Claude Messages API only with explicit opt-in; independently validates each returned quote and records latency/tokens | Provider run **not executed** in this repo; no secret supplied, no model performance claim |

The original **CLAIM / OS 3.0 Python project** (distributed in a separate complete local package) additionally reads PDFs with PyMuPDF, invoice images with Tesseract, and can send documents via OpenAI Responses API from a local server *if* a server-side key is explicitly configured. Its independently re-run tests in the packaged version are distinct from the GitHub Pages client-side checks. **Do not conflate the two runtimes or claim they are a single deployed API.**

## Observed validations

- **48 Vitest tests passed** including source-value gates and the 36-case behavioural regression framework.
- **10 Chromium browser flows passed** on the application code: v4 dashboard (desktop/mobile), real local PDF generation/reupload, Control Tower, and 8-case reviewer experiment.
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

## Visual v5 release gates

- **Above the fold:** the live homepage opens the source reader, not an abstract evaluation dashboard.
- **Original highlight:** a quote must exactly match the PDF.js page text before any visual rectangle is shown; bounds derive solely from PDF text transforms, not guesses or model output.
- **Mobile:** Source, Decision and Documents are separate interactive panes with an adjustable PDF zoom. Selecting a citation reveals its source pane.
- **Fail closed:** deliberately forged source quotes remove the visual anchor and stop further review readiness.
- **Distinct runtimes:** the separate downloadable offline/local Python package supports Tesseract invoice-photo source boxes; the browser-only GitHub Pages edition supports text-based PDFs but **does not OCR images**.

The 36-case evaluation remains at `?evaluation=1`, and the source-first v5 PDF reader remains at `?lab=1`; the legacy claim loop, Control Tower and Research Study remain available via their query routes.
