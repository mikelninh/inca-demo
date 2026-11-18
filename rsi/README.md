# RSI 2.0 — INCA integration

Runs the **same shared evaluation engine**, pinned to Animal Voices commit 979ef48c3fa39890b449703a92a3e370b7119788, against actual TypeScript escalation-rule code here, using this repository's 8 pre-existing synthetic claims.

- Before: the fixture decisions.
- Candidate: fixture decisions with the narrow scope-conflict guardrail applied.
- Truth labels: the synthetic expected_decision field, **never** exposed to the candidate function.
- Hard check: no new regressions and zero errors for synthetic mandatory human-handoff cases.
- Release requires human review even when the test gate is green.
- Output: rsi/out/latest.json as a CI artifact with case IDs, category and results only.

This is a **code integration test**, not an independent held-out benchmark, insurer-approved workflow, paid claims resolution, fraud detection, or proof of business impact.

For local execution, check out the pinned mikelninh/animal-voices-os commit alongside this repository as rsi-core first; then run node --experimental-strip-types rsi/evaluate.mjs. In GitHub Actions the checkout is performed automatically.

## Next actual measurements to collect
On anonymised, consented real documentation: evidence-span/page citation agreement with independent human raters, unsafe confident answer rate and appropriate abstentions, human review time per claim, and observed provider cost per *correctly reviewed* case.
