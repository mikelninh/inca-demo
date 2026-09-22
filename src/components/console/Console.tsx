import { useEffect, useState } from 'react'
import loop from '../../data/loop.json'
import { useLang } from '../../i18n'
import { useReveal } from '../../motion'
import type { LoopData } from '../../types'
import BenchmarkTab from './BenchmarkTab'
import CaseList from './CaseList'
import EvalTab from './EvalTab'
import PipelineView from './PipelineView'
import ReceiptView from './ReceiptView'

const data = loop as unknown as LoopData

const TABS = ['faelle', 'auswertung', 'benchmark'] as const
type Tab = (typeof TABS)[number]

export default function Console() {
  const { lang, t } = useLang()
  const ref = useReveal<HTMLElement>(lang)
  const [activeId, setActiveId] = useState(data.cases[0].claim_id)
  const [tab, setTab] = useState<Tab>('faelle')
  const active = data.cases.find((c) => c.claim_id === activeId)!

  useEffect(() => {
    const onSelect = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (data.cases.some((c) => c.claim_id === id)) {
        setTab('faelle')
        setActiveId(id)
      }
    }
    window.addEventListener('inca:select-case', onSelect)
    return () => window.removeEventListener('inca:select-case', onSelect)
  }, [])

  return (
    <section id="konsole" ref={ref} className="relative bg-softwhite py-24">
      <span className="sec-num" aria-hidden>
        01
      </span>
      <div className="relative mx-auto max-w-[1320px] px-6 lg:px-8">
        <div className="reveal mx-auto max-w-5xl rounded-[28px] bg-sage p-6 shadow-[0_24px_60px_rgba(47,53,18,0.25)] lg:p-8">
          <div className="flex items-center justify-between gap-4 font-mono text-[11px] tracking-[0.14em] text-mist">
            <span>{t.console.header}</span>
            <span>{data.metrics.total} FIXTURES · {data.metrics.correct}/{data.metrics.total} CORRECT</span>
          </div>

          <div className="mt-5 flex gap-2">
            {TABS.map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                data-testid={`tab-${k}`}
                className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition sm:px-4 sm:text-[11px] ${
                  tab === k
                    ? 'bg-core text-darkgreen'
                    : 'border border-mist/30 text-mist hover:border-mist/60'
                }`}
              >
                {t.console.tabs[k]}
              </button>
            ))}
          </div>

          {tab === 'faelle' && (
            <div className="mt-6 flex flex-col gap-5 lg:flex-row">
              <CaseList cases={data.cases} activeId={activeId} onSelect={setActiveId} />
              <div className="min-w-0 flex-1 space-y-5">
                <div className="rounded-xl bg-cream p-4">
                  <div className="font-mono text-xs text-faint">
                    {active.claim_id} · {active.line_of_business}
                  </div>
                  <p className="mt-1 font-serif text-lg">{active.fnol_text}</p>
                  <p className="mt-2 border-l-2 border-core pl-3 text-xs text-muted">
                    {active.policy_excerpt}
                  </p>
                </div>
                <PipelineView traces={active.receipt.traces} caseId={active.claim_id} />
                <ReceiptView c={active} />
              </div>
            </div>
          )}

          {tab === 'auswertung' && (
            <div className="mt-6">
              <EvalTab data={data} />
            </div>
          )}

          {tab === 'benchmark' && (
            <div className="mt-6">
              <BenchmarkTab data={data} />
            </div>
          )}
        </div>

        <p className="reveal mt-4 text-center font-mono text-xs tracking-[0.1em] text-faint">
          {t.console.caption}
        </p>
      </div>
    </section>
  )
}
