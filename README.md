# INCA AI Operations Demo

A small, public proof-of-work for **AI Operations**: how to take an agentic workflow from a failure, through human review and a regression guardrail, to a measurable rerun.

**Live demo:** https://mikelninh.github.io/inca-demo/

## What to look at

The core loop is deliberately narrow:

**Synthetic decision → QA detects mismatch → evidence review → narrow, rule-based escalation → deterministic rerun**

One synthetic claim, `KFZ-2026-003`, is intentionally wrong. The demo makes the failure visible, shows the evidence behind it, shows a scoped repair-scope guardrail, then recomputes the same fixture set so the trade-off is inspectable rather than hand-waved.

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
- No model/API calls are executed in the browser; stored traces are illustrative, not real Claude responses
- An existing Claude Pro or ChatGPT subscription is not an API credential
- The rerun is deterministic and reproducible in the browser; the rule does not inspect claim IDs, expected labels or fraud ground truth
- The rule is deliberately narrow (low-impact vehicle incident, broader repair scope, documented invoice conflict) and is not insurer-approved
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

The showcased generalizable rule (see `src/escalationRule.ts`) deliberately reduces auto-resolution on this eight-case synthetic fixture set. Its tests include changed IDs, deliberately misleading expected labels, ordinary claims and missing evidence. That is the point: optimisation is not “maximise automation”; it is **make the cost of automation visible and choose the safer operating point with evidence**.

---

Built as a concise proof-of-work around the kind of **Ops × Agents × Evals** loop I would want to operate in a real team.

## Operational hand-off / short SOP

1. **Intake:** inspect the supplied incident narrative, invoice positions and review trace. Do not use personal/customer data in this public demo.
2. **QA:** compare the stored decision to the synthetic label; a mismatch creates a review candidate (the label is an evaluation target, never an input to the guardrail).
3. **Review:** note the invoice narrative conflict and why auto-settlement may be unsafe; do not accuse a person of fraud.
4. **Policy:** apply the narrow scope-conflict escalation from `src/escalationRule.ts`; cases matching it are referred to a human, not paid or declined automatically.
5. **Release gate:** rerun all synthetic fixtures and regression tests, track decision accuracy, false negatives and auto-resolution trade-off.
6. **Human sign-off:** a real insurer would need policy/legal review, richer test data, audited operating procedures, access control, measured latency/cost and independent production validation before use.

**What this does not prove:** live Claude evaluation, calibrated fraud accuracy, real customer outcomes or production suitability. The UI contains a guided operator loop over saved fixtures, not a deployed claims-processing backend.
