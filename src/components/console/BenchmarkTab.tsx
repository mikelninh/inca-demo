import { useLang } from '../../i18n'
import type { LoopData } from '../../types'

export default function BenchmarkTab({ data }: { data: LoopData }) {
  const { lang } = useLang()
  const failure = data.cases.find((c) => !c.correct)

  const copy = {
    de: {
      title: 'Gemessener Fixture-Stand',
      intro:
        'Keine projizierte Modellverbesserung. Nur das, was im aktuellen deterministischen Harness tatsächlich steht.',
      fixtures: 'Fixtures',
      correct: 'korrekt',
      knownFailure: 'bekannter Fehler',
      accuracy: 'Decision Accuracy',
      fraudRecall: 'Fraud Recall',
      autoShare: 'Auto-Resolution',
      note:
        'Diese Zahlen stammen aus handgeschriebenen synthetischen Fixtures. Sie zeigen die Evaluationsmethode, nicht Production-Qualität.',
      open: 'Fehler im Operator Loop beheben ↓',
    },
    en: {
      title: 'Measured fixture baseline',
      intro:
        'No projected model improvement. Only what the current deterministic harness actually contains.',
      fixtures: 'fixtures',
      correct: 'correct',
      knownFailure: 'known failure',
      accuracy: 'Decision accuracy',
      fraudRecall: 'Fraud recall',
      autoShare: 'Auto-resolution',
      note:
        'These numbers come from hand-written synthetic fixtures. They demonstrate the evaluation method, not production quality.',
      open: 'Fix the failure in the operator loop ↓',
    },
  }[lang]

  const cards = [
    [copy.fixtures, String(data.metrics.total)],
    [copy.correct, `${data.metrics.correct}/${data.metrics.total}`],
    [copy.accuracy, `${(data.metrics.decision_accuracy * 100).toFixed(1)}%`],
    [copy.fraudRecall, `${(data.metrics.fraud_recall * 100).toFixed(1)}%`],
    [copy.autoShare, `${(data.metrics.auto_resolved_share * 100).toFixed(1)}%`],
    [copy.knownFailure, failure?.claim_id ?? '—'],
  ]

  return (
    <div>
      <h3 className="font-serif text-2xl text-cream">{copy.title}</h3>
      <p className="mt-2 max-w-2xl text-sm text-mist/70">{copy.intro}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-cream p-4 text-ink">
            <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-faint">{label}</p>
            <p className="mt-2 font-serif text-3xl">{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 px-1 text-sm text-mist/75">△ {copy.note}</p>
      <a
        href="#ops-loop"
        className="mt-4 inline-block font-mono text-xs text-core underline underline-offset-4"
      >
        {copy.open}
      </a>
    </div>
  )
}
