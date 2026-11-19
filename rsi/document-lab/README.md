# INCA Document Evidence Lab v0.3

**Purpose:** a defensible, independent AI Operations work sample. The next testable question is whether reviewers can move from real document bytes to correctly sourced human decisions with lower overall workload.

**Route after deployment:** `https://mikelninh.github.io/inca-demo/?lab=1` (not active until this PR merges and the GitHub Pages deployment succeeds).

## What is demonstrably real

- `pdf-lib` generates **real PDF files** in the user's browser with visible fictional-document watermarks, including a two-page example policy.
- `pdfjs-dist` parses those PDF bytes in a dedicated worker and provides the actual per-page extracted text.
- Source references contain a document ID, a **PDF page number**, an exact character offset and the verbatim excerpt from the parsed page. Any missing/modified quote fails a deterministic citation gate.
- The side-by-side reader renders PDF pages from bytes, not from fabricated HTML screenshots; users can download the generated PDFs and independently inspect them.
- User-supplied PDF files are read locally (max 4, 8 MB each, 12 pages each). No PDF content, customer metadata, extracted text, uploaded names or user identity is sent to a backend. The exported audit only has counts, document roles and gate status.
- The analysis consists of deterministic, openly inspectable **rules**. It is deliberately **not** a live LLM, multimodal visual model or real claims settlement engine.

## Three evaluation dossiers

| Dossier | Files | What should occur |
|---|---:|---|
| Parkschaden A17 | 3 files, 4 PDF pages | Identifiable document discrepancy -> human review |
| Leitungswasser B21 | 3 files | Source coverage intact, no selected discrepancy -> human review candidate (NOT automatic payment) |
| Einbruch C09 | 2 files | Missing invoice document type -> mandatory STOP and document request |

These are all authored examples. They demonstrate extraction and safe workflow gating, **not independent model accuracy**.

## Hard constraints

- **No automatic payments, rejections or emails**. Every branch requires human review.
- A missing source type, unreadable page, or fabricated citation generates a STOP.
- A source quote matching an exact PDF page is mechanically traceable, but doesn't prove that the cited text is factually sound or that it supports a legally correct decision.
- The rule-generated review signals are possible inconsistencies, not fraud determinations.
- Image-only PDFs require OCR, which this version does not perform; unparseable pages are marked unsafe. The front end never invents their contents.
- No open-ended AI or VLM inference in this build.
- No staff hours saved or operational claim costs are estimated without human outcome observations.

## Reproduce and test

Run `npm ci && npx vitest run && npm run build && npx playwright test`. The full Playwright suite checks page rendering, synthetic PDF generation and download, actual reupload and reparse, second-page source anchoring, source removal, forged citation, local-only audit, plus the prior 8-case reviewer trial and control tower. Live verification runs the same suite against the published GitHub Pages project.

## What makes v0.4 worth building

The next truly valuable improvement requires **authentic document understanding**, not a larger static model façade:

1. Obtain consented, permitted de-identified document samples or use independently authored unseen test documents.
2. Add a backend-managed, access-controlled multimodal model (never a frontend API key) for structured fields with exact source page/box references. Compare against baseline PDF text and independent reviewer labels.
3. Independent double-blind professional label/quote-support review, disagreement adjudication and holdout performance.
4. Measure human time through **resolution of any necessary referral**, not just the quick initial decision. Count correctly handled claims per total human hour and compute extra escalation cost.
5. Require zero new critical missed referrals, human sign-off, privacy/security review, sensible cost controls and full auditability before describing any production trial as safe.

**Demo order for an INCA interviewer:** A17 -> click second-page policy citation -> show PDF original -> select "Zitat manipulieren" -> STOP -> normal -> upload real PDF -> stop on incomplete dossier -> show CI and source. In under three minutes, this demonstrates source-first design, engineering, risk controls, and evaluation maturity.
