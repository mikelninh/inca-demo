import { useState } from 'react'
import { useLang } from '../../i18n'
import type { LoopCase } from '../../types'

export default function ReceiptView({ c }: { c: LoopCase }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-xl bg-mist p-4 font-mono text-xs leading-relaxed text-darkgreen"
      data-testid="receipt"
    >
      <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-sage">
        {t.console.receiptHint}
      </p>
      <div>
        <span className="font-semibold text-core-deep">"decision"</span>:{' '}
        <span className="text-signal-deep">"{c.decision}"</span>,
      </div>
      <div>
        <span className="font-semibold text-core-deep">"payout_eur"</span>: {c.payout_eur},
      </div>
      <div>
        <span className="font-semibold text-core-deep">"rationale"</span>: "{c.receipt.rationale}"
      </div>
      {c.receipt.blocked_actions.length > 0 && (
        <div className="mt-1">
          <span className="font-semibold text-core-deep">"blocked_actions"</span>: [
          {c.receipt.blocked_actions.map((b) => `"${b.action} — ${b.reason}"`).join(', ')}]
        </div>
      )}
      {c.receipt.uncertainty_notes.length > 0 && (
        <div className="mt-1">
          <span className="font-semibold text-core-deep">"uncertainty"</span>: [
          {c.receipt.uncertainty_notes.map((n) => `"${n}"`).join(', ')}]
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="mt-3 underline underline-offset-2"
        data-testid="trace-toggle"
      >
        {open ? '▾' : '▸'} {t.console.traceToggle} ({c.receipt.traces.length})
      </button>
      {open && (
        <div className="mt-2 space-y-2 border-t border-sage/30 pt-2">
          {c.receipt.traces.map((tr) => (
            <div key={tr.agent}>
              <span className="font-semibold">{tr.agent}</span> · {tr.model} · {tr.mode}
              <p className="text-darkgreen/80">{tr.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
