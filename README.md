# INCA AI Operations Demo

A small, public proof-of-work for **AI Operations**: how to take an agentic workflow from a failure, through human review and a regression guardrail, to a measurable rerun.

**Live demo:** https://mikelninh.github.io/inca-demo/

## What to look at

The core loop is deliberately narrow:

**Claim → agent decision → QA catches a mismatch → operator review → regression rule → deterministic rerun**

One synthetic claim, `KFZ-2026-003`, is intentionally wrong. The demo makes the failure visible, shows the evidence behind it, lets an operator turn the lesson into a guardrail, then recomputes the same fixture set so the trade-off is inspectable rather than hand-waved.

This is meant to demonstrate the work around an AI system — **evaluation, review queues, failure analysis, guardrails and measurable iteration** — not to pretend a toy front end is a production claims platform.

## Why this exists

Agentic systems become useful when failures create better operations instead of disappearing into anecdotes.

The demo focuses on four questions:

1. **Can we see why a decision happened?**
2. **Can a human review the right cases quickly?**
3. **Can a failure become a repeatable regression test?**
4. **Can we rerun the same evidence and show what changed?**

## Evidence & boundaries

- All claims, traces and metrics are **synthetic fixtures**
- No production or customer data
- No backend API keys or secrets
- No external model calls are required
- The rerun is deterministic and reproducible in the browser
- Metrics shown are computed from the included fixture set; they are **not production-performance claims**

## Stack

React 19 · TypeScript · Vite · Vitest · GitHub Actions · GitHub Pages

The repository is intentionally simple: the interesting part is the operational loop, not infrastructure theatre.

## Run locally

```bash
npm ci
npm run dev
```

Then open the local Vite URL.

For the same checks used in deployment:

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

## Deployment

Every push to `main` runs:

1. clean install
2. TypeScript check
3. Vitest
4. production build
5. GitHub Pages deployment

See `.github/workflows/deploy.yml`.

## Design trade-off

The showcased guardrail deliberately reduces auto-resolution for one risky case. That is the point: optimisation is not “maximise automation”; it is **make the cost of automation visible and choose the safer operating point with evidence**.

---

Built as a concise proof-of-work around the kind of **Ops × Agents × Evals** loop I would want to operate in a real team.
