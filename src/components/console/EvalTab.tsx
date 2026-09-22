import { useLang } from '../../i18n'
import { useCountUp } from '../../motion'
import type { LoopData } from '../../types'

function Stat({ label, value }: { label: string; value: number }) {
  const { ref, value: v } = useCountUp(value * 100)
  return (
    <div className="rounded-xl bg-cream p-4 text-center">
      <span ref={ref} className="font-serif text-4xl tabular-nums">
        {v.toFixed(0)}%
      </span>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
    </div>
  )
}

export default function EvalTab({ data }: { data: LoopData }) {
  const { t } = useLang()
  const m = data.metrics
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t.console.eval.accuracy} value={m.decision_accuracy} />
        <Stat label={t.console.eval.fraudRecall} value={m.fraud_recall} />
        <Stat label={t.console.eval.fraudPrecision} value={m.fraud_precision} />
        <Stat label={t.console.eval.autoShare} value={m.auto_resolved_share} />
      </div>
      <p className="mt-4 px-1 text-sm text-mist">
        △ {t.console.evalDisclaimer} <span className="text-mist/70">{t.console.evalWink}</span>
      </p>
    </div>
  )
}
