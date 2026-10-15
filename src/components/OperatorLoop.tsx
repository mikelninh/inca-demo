import { useMemo, useState } from 'react'
import loop from '../data/loop.json'
import { useLang } from '../i18n'
import { useReveal } from '../motion'
import type { LoopData } from '../types'
import { applyScopeGuardrail } from '../escalationRule'

const data = loop as unknown as LoopData
const TARGET_ID = 'KFZ-2026-003'

type Stage = 0 | 1 | 2 | 3

function evaluate(corrected: boolean) {
  const rows = data.cases.map((c) => ({
    decision: corrected ? applyScopeGuardrail(c).decision : c.decision,
    expected: c.expected_decision,
    fraud: c.is_fraudulent,
  }))

  const total = rows.length
  const correct = rows.filter((r) => r.decision === r.expected).length
  const fraud = rows.filter((r) => r.fraud)
  const fraudCaught = fraud.filter((r) => r.decision === 'refer_to_human').length
  const autoResolved = rows.filter((r) => r.decision !== 'refer_to_human').length
  const falseNegatives = fraud.filter((r) => r.decision !== 'refer_to_human').length

  return {
    total,
    correct,
    accuracy: correct / total,
    fraudRecall: fraud.length ? fraudCaught / fraud.length : 1,
    autoShare: autoResolved / total,
    falseNegatives,
  }
}

function pct(n: number) {
  return `${Math.round(n * 1000) / 10}%`
}

function decisionLabel(value: string, lang: 'de' | 'en') {
  const labels: Record<string, { de: string; en: string }> = {
    pay: { de: 'auszahlen', en: 'pay' },
    pay_reduced: { de: 'gekürzt auszahlen', en: 'pay reduced' },
    decline: { de: 'ablehnen', en: 'decline' },
    refer_to_human: { de: 'menschliche Prüfung', en: 'human review' },
  }
  return labels[value]?.[lang] ?? value
}

export default function OperatorLoop() {
  const { lang } = useLang()
  const ref = useReveal<HTMLElement>(lang)
  const [stage, setStage] = useState<Stage>(0)

  const target = data.cases.find((c) => c.claim_id === TARGET_ID)!
  const fraudTrace = target.receipt.traces.find((tr) => tr.agent.toLowerCase().includes('betrug'))
  const before = useMemo(() => evaluate(false), [])
  const after = useMemo(() => evaluate(true), [])

  const copy = {
    de: {
      eyebrow: 'OPERATOR LOOP · FAILURE → FEEDBACK',
      titlePre: 'Der Fehler ist nicht das Ende. ',
      titleEm: 'Er wird zum Test.',
      intro:
        'Ein synthetischer Fall mit einer fehlerhaften Entscheidung. Evidenz prüfen, eine begrenzte Regel ableiten, danach alle Fälle erneut testen.',
      steps: ['QA findet Fehler', 'Operator prüft', 'Regression sperrt ab', 'Harness läuft neu'],
      current: 'Aktuelle Entscheidung',
      expected: 'Erwartete Entscheidung',
      qa: 'QA-Gate',
      qaBody:
        'Der Harness erkennt einen Decision-Mismatch. Ein verdächtiger Schaden würde automatisch teilweise reguliert, obwohl die Ground Truth eine menschliche Prüfung verlangt.',
      review: 'Root Cause Review',
      reviewBody:
        'Der gespeicherte synthetische Trace nennt ein schwaches Risikosignal; die Rechnungsprüfung markiert Heckklappe und Auspuff als unplausibel. Für diese Konstellation fehlt im Baseline-Ergebnis die Eskalation.',
      guardrail: 'Regression Guardrail',
      guardrailBody:
        'Illustrative Regel: Ein leichter Stoßstangenschaden mit deutlich erweitertem Reparaturumfang und dokumentiertem Widerspruch aus der Rechnungsprüfung wird zur menschlichen Prüfung eskaliert. Keine Entscheidung über Betrug oder Deckung.',
      rerun: 'Deterministischer Re-run',
      rerunBody:
        'Der Browser wertet alle 8 Fixtures neu aus. Eine eng begrenzte, dokumentierte Regel prüft Reparaturumfang, Hergang und Hinweise aus der Rechnungsprüfung – ohne Claim-ID oder erwartetes Ergebnis zu verwenden. Die Zahlen sind synthetisch, kein Modell-Benchmark.',
      reviewButton: 'Fall prüfen',
      lockButton: 'Als Regression-Gate sperren',
      rerunButton: '8 Fixtures neu auswerten',
      resetButton: 'Loop nochmal durchspielen',
      signal: 'Synthetisches Signal',
      confidence: 'Konfidenz',
      before: 'vorher',
      after: 'nachher',
      accuracy: 'Decision Accuracy',
      fraudRecall: 'Fraud Recall',
      autoShare: 'Auto-Resolution',
      falseNegatives: 'bekannte False Negatives',
      tradeoff:
        'Wichtig: Die Auto-Resolution sinkt. Das ist hier kein Rückschritt — wir tauschen etwas Automatisierung gegen einen vermiedenen riskanten False Negative.',
      local: 'LOCAL OPS SIMULATION · SYNTHETIC FIXTURES · REPRODUCIBLE',
    },
    en: {
      eyebrow: 'OPERATOR LOOP · FAILURE → FEEDBACK',
      titlePre: 'A failure is not the end. ',
      titleEm: 'It becomes a test.',
      intro:
        'A synthetic case with an incorrect decision. Inspect the evidence, add a limited rule, then re-evaluate every fixture.',
      steps: ['QA catches it', 'Operator reviews', 'Regression guards it', 'Harness reruns'],
      current: 'Current decision',
      expected: 'Expected decision',
      qa: 'QA gate',
      qaBody:
        'The harness detects a decision mismatch. A suspicious claim would be partially auto-settled even though the ground truth requires human review.',
      review: 'Root cause review',
      reviewBody:
        'The saved synthetic trace shows a weak risk signal; invoice review flags the trunk lid and exhaust as implausible. This combination is missing a review escalation in the baseline result.',
      guardrail: 'Regression guardrail',
      guardrailBody:
        'Illustrative rule: when a low-impact bumper incident has a wider repair invoice and invoice review documents the discrepancy, the case is escalated for human review. No fraud or coverage determination.',
      rerun: 'Deterministic rerun',
      rerunBody:
        'The browser re-evaluates all 8 fixtures. A deliberately narrow, documented rule checks repair scope, incident description, and invoice-review evidence without reading claim IDs or expected labels. Synthetic metrics only; not a model benchmark.',
      reviewButton: 'Review case',
      lockButton: 'Lock as regression gate',
      rerunButton: 'Re-evaluate 8 fixtures',
      resetButton: 'Run the loop again',
      signal: 'Synthetic signal',
      confidence: 'Confidence',
      before: 'before',
      after: 'after',
      accuracy: 'Decision accuracy',
      fraudRecall: 'Fraud recall',
      autoShare: 'Auto-resolution',
      falseNegatives: 'known false negatives',
      tradeoff:
        'Important: auto-resolution falls. That is not a regression here — we trade a little automation for removing a risky false negative.',
      local: 'LOCAL OPS SIMULATION · SYNTHETIC FIXTURES · REPRODUCIBLE',
    },
  }[lang]

  const stageCopy = [
    { title: copy.qa, body: copy.qaBody },
    { title: copy.review, body: copy.reviewBody },
    { title: copy.guardrail, body: copy.guardrailBody },
    { title: copy.rerun, body: copy.rerunBody },
  ][stage]

  const next = () => setStage((Math.min(stage + 1, 3) as Stage))

  return (
    <section id="ops-loop" ref={ref} className="relative bg-darkgreen py-24 text-cream" data-testid="ops-loop">
      <span className="sec-num opacity-20" aria-hidden>
        ↻
      </span>
      <div className="relative mx-auto max-w-[1320px] px-6 lg:px-8">
        <p className="eyebrow reveal" style={{ color: 'var(--color-mist)' }}>{copy.eyebrow}</p>
        <h2 className="reveal mt-3 max-w-3xl text-4xl text-cream lg:text-6xl">
          {copy.titlePre}
          <em className="text-core">{copy.titleEm}</em>
        </h2>
        <p className="reveal mt-5 max-w-2xl text-mist/75">{copy.intro}</p>

        <div className="reveal mt-8 flex flex-wrap gap-2">
          {copy.steps.map((label, i) => (
            <div
              key={label}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] ${
                i <= stage ? 'border-core bg-core/10 text-core' : 'border-mist/20 text-mist/40'
              }`}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>

        <div className="reveal mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[22px] border border-mist/20 bg-cream p-6 text-ink">
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-xs text-faint">{target.claim_id} · {target.line_of_business}</span>
              <span className="rounded-full bg-signal px-2.5 py-1 font-mono text-[10px] uppercase text-white">
                decision mismatch
              </span>
            </div>
            <p className="mt-4 font-serif text-xl">{target.fnol_text}</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-softwhite p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{copy.current}</p>
                <p className="mt-1 font-serif text-lg text-signal-deep">
                  {decisionLabel(target.decision, lang)}
                </p>
              </div>
              <div className="rounded-xl bg-core/15 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{copy.expected}</p>
                <p className="mt-1 font-serif text-lg text-darkgreen">
                  {decisionLabel(target.expected_decision, lang)}
                </p>
              </div>
            </div>

            {fraudTrace && (
              <div className="mt-5 border-t border-hairline pt-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{copy.signal}</p>
                  <span className="font-mono text-xs text-signal-deep">
                    {copy.confidence}: {Math.round(fraudTrace.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">{fraudTrace.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {fraudTrace.sources.map((source) => (
                    <span key={source} className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-muted">
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-mist/25 bg-sage p-6 lg:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist/60">{copy.local}</p>
            <h3 className="mt-4 text-3xl text-cream">{stageCopy.title}</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist/80">{stageCopy.body}</p>

            {stage === 2 && (
              <div className="mt-6 rounded-xl border border-core/40 bg-darkgreen/50 p-4 font-mono text-xs leading-relaxed text-mist">
                IF repair_scope_conflict = high
                <br />
                AND fraud_signal = present
                <br />
                THEN block_auto_settlement → refer_to_human
              </div>
            )}

            {stage === 3 ? (
              <>
                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="ops-metrics">
                  {[
                    [copy.accuracy, pct(before.accuracy), pct(after.accuracy)],
                    [copy.fraudRecall, pct(before.fraudRecall), pct(after.fraudRecall)],
                    [copy.autoShare, pct(before.autoShare), pct(after.autoShare)],
                    [copy.falseNegatives, String(before.falseNegatives), String(after.falseNegatives)],
                  ].map(([label, oldValue, newValue]) => (
                    <div key={label} className="rounded-xl bg-cream p-4 text-ink">
                      <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-faint">{label}</p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="font-mono text-xs text-faint line-through">{oldValue}</span>
                        <span className="font-serif text-2xl text-darkgreen">{newValue}</span>
                      </div>
                      <p className="mt-1 font-mono text-[9px] text-faint">{copy.before} → {copy.after}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 border-l-2 border-core pl-4 text-sm text-mist/80">{copy.tradeoff}</p>
                <button
                  onClick={() => setStage(0)}
                  data-testid="ops-action"
                  className="mt-7 rounded-full bg-core px-6 py-3 font-mono text-sm text-darkgreen transition hover:brightness-110"
                >
                  {copy.resetButton}
                </button>
              </>
            ) : (
              <button
                onClick={next}
                data-testid="ops-action"
                className="mt-7 rounded-full bg-core px-6 py-3 font-mono text-sm text-darkgreen transition hover:brightness-110"
              >
                {[copy.reviewButton, copy.lockButton, copy.rerunButton][stage]} →
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
