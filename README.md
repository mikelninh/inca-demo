# Claims Ops Loop — AI Operations work sample

**[Try the public demo](https://mikelninh.github.io/inca-demo/)** · [Source](https://github.com/mikelninh/inca-demo)

A small, transparent exercise about a simple question: **what happens after a system makes the wrong call?** Designed to be understandable without an insurance or AI background.

## What you do

1. **Read one synthetic claim.** The reported parking accident, invoice items and saved review note are visible together.
2. **Compare the decision.** A baseline fixture proposes partial payment, despite a documented mismatch between the incident and additional repairs.
3. **Test the extra check.** A deliberately narrow, deterministic rule checks the incident narrative, wider repair scope and invoice-review evidence. Matching cases are routed to a human.
4. **See the trade-off.** The same eight hand-written cases are evaluated again. In this fixture set, label agreement rises from 7/8 to 8/8; one missed labelled risk case becomes zero; the share without human review falls from 75% to 62.5%.

The main example is `KFZ-2026-003`. You can also inspect the other seven cases, switch language and reset the comparison.

## Scope and limits

- **All cases, decisions, review notes and labels are synthetic.** No real customers or insurer data.
- **No live AI is called.** The saved 'agent' traces are examples, not proof of a Claude API run.
- The narrow check **does not read claim IDs, the expected label, ground truth or the fraud flag**. See `src/escalationRule.ts`.
- Passing eight hand-written examples is not evidence of real-world accuracy, calibration or suitability for claims settlement.
- Real insurance work needs domain experts, validated contract clauses, quality monitoring, access control, auditability, independently evaluated data and explicit human responsibility.

## Why I built this

I wanted to show how I'd approach the operational part: **look at the actual case, understand the exception, document a review rule, turn the problem into a regression check, and measure the cost of taking the safer route**. The useful part is not the model making a confident guess.

## Run it yourself

```bash
npm ci
npm run dev
```

For the checks used on every GitHub Pages deployment:

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

The tests include a changed claim ID, contradictory expected labels, normal cases, missing mismatch evidence and already-escalated decisions. They are deterministic unit tests, not a live benchmark.

**Tech:** React · TypeScript · Vite · Vitest · GitHub Actions · GitHub Pages.

**Built by:** Michael Ninh · Berlin · [GitHub](https://github.com/mikelninh)
