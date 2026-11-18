# INCA Research Taste — Experiment R-001

Status: draft / preregistered design, 18 November 2026. No insurer production deployment or actual customer data.

## Decision

Will source-linked AI decision support increase **correct and safely reviewed claims per human hour**, while making every supporting source independently checkable?

The current synthetic escalation rule moves from 7/8 to 8/8 fixture-label matches, but human handoffs rise from 2/8 to 3/8. Greater accuracy is not automatically less work. We must test the trade-off.

## Controlled comparison

- **Reference:** visible incident text, policy excerpt and invoice descriptions, plus the original simulated decision.
- **Assisted:** identical original fields, guarded decision, a clickable verbatim evidence ledger and its provenance warnings.
- Eight fictional cases, each shown once per participant. 4 of each condition. Randomised case order and opposite condition for each case across seed parity.
- Recruit 12–16 distinct, consenting participants, preferably claim reviewers. Avoid collecting names and other personal details.
- Participant chooses a final action, rates evidential support and ends each task. The active-tab timer pauses when hidden.
- No backend telemetry, analytics or automatic reports. A voluntary JSON export contains only the anonymous experiment decision-level record.
- The experimental interface is visibly different, so this is NOT a blinded comparison of interface design. Fixed labels also reside in the synthetic client bundle. A separate independent study is essential.

## Metrics and decision gates

| Metric | Denominator | Rule |
|---|---|---|
| Critical missed referrals | Cases explicitly labelled mandatory human review | No assisted misses, separate new holdout needed |
| Quote exactness | Quoted synthetic source fields | 100% mechanical provenance; cannot establish correctness |
| Reviewer correctness | Human actions matching synthetic labels / completed actions, by condition | Assisted must not be worse; no user-level causal claims from one pilot |
| Primary throughput | **Correct** decisions / **all active reviewer hours**, including wrong attempts | Target +20% assisted, conditional on safety and sufficient evidence |
| Time efficiency | Median milliseconds per correct review, by case and condition | Secondary only; it is selection-sensitive |
| Evidential support | Independent expert checks against actual source passages | Unknown; cannot be inferred from string matches |
| Full operational cost | Minutes including escalation, investigation, corrections and follow-up | Unknown; not captured by synthetic trial |
| Human usability | Consent-based completion / invited participants | Track observed completion and non-completion |

The assessor must not optimize human speed by lowering review referral thresholds or inventing sources.

## Interpretation threshold

Require at least 12 genuine distinct reviewers and at least three correct reviews per case and condition before presenting descriptive case-matched time comparisons. This is a usability signal, not proof of real-world savings. For a production business case, expand to unseen cases, recruit independent expert labels and measure end-to-end investigation time. Use reviewer-clustered intervals, show all unsafe errors, case-mix, uncertainty and disagreement.

## Holdout plan

Create 20–40 new, independently-labelled, consented or permissibly-sourced synthetic/public-document dossiers with authentic PDF page references where available. Two independent qualified reviewers label: the correct disposition, mandatory escalation, each claimed evidence passage and whether the passage supports it. Adjudicate disagreements. Do not use actual customer records without organisational authorisation and appropriate data-protection controls.

## Falsifying the hypothesis

- If safer but slower, preserve safety checks and improve source navigation and operator flows rather than weakening referrals.
- If faster but less accurate, reject.
- If quoted text is genuine but doesn't support the decision, reject factual claims and repair citation mapping.
- If reviewer throughput rises but extra handoff investigations wipe out savings, do not claim workload reduction.
- If inexperienced reviewers disagree with qualified experts, report it rather than smoothing over the conflict.

## Reproduce

- Use the study route with the query parameter ?study=1 after the branch is deployed.
- Unit checks: npx vitest run
- Build: npm run build
- Structural audit: node --experimental-strip-types rsi/study/run.mjs
- Aggregate voluntary exports: node --experimental-strip-types rsi/study/analyse.mjs EXPORT1.json EXPORT2.json ...
- CI saves the audit JSON and compiled preview as an artifact.

This first experiment directly tests whether our **research taste** selected an important, falsifiable goal—not just a visually appealing feature.
