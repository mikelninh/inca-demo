import { useState } from 'react'
import agentRun from '../data/agent_run.json'
import toolLayer from '../data/tool_layer.json'
import { useLang } from '../i18n'
import { useReveal } from '../motion'
import type { AgentRun, ToolLayerData } from '../types'

const tl = toolLayer as unknown as ToolLayerData
const run = agentRun as AgentRun

export default function Grounding() {
  const { lang, t } = useLang()
  const ref = useReveal<HTMLElement>(lang)
  const [idx, setIdx] = useState(0)
  const c = tl.cases[idx]
  const verified = Boolean((c.result as { verified?: boolean }).verified)
  return (
    <section id="grounding" ref={ref} className="relative bg-softwhite py-24">
      <span className="sec-num" aria-hidden>
        03
      </span>
      <div className="relative mx-auto max-w-[1320px] px-6 lg:px-8">
        <p className="eyebrow reveal">{t.grounding.eyebrow}</p>
        <h2 className="reveal mt-3 max-w-2xl text-4xl lg:text-5xl">
          {t.grounding.titlePre}
          <em>{t.grounding.titleEm}</em>
        </h2>
        <p className="reveal mt-5 max-w-prose text-muted">{t.grounding.intro}</p>
        <div className="reveal mt-10 grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
              {t.grounding.toolTitle}
            </p>
            {tl.cases.map((tc, i) => (
              <button
                key={tc.label}
                onClick={() => setIdx(i)}
                className={`lift block w-full rounded-lg border bg-white/60 p-3 text-left text-sm ${
                  i === idx ? 'border-core bg-core/10' : 'border-hairline hover:border-faint'
                }`}
              >
                <span className="font-mono text-[10px] text-faint">{tc.tool}</span>
                <p className="font-serif">{tc.label}</p>
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-darkgreen p-5 font-mono text-xs leading-relaxed">
            <div className="flex justify-between text-mist/60">
              <span>{tl.source}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  verified ? 'bg-core text-darkgreen' : 'bg-maroon text-cream'
                }`}
              >
                {verified ? t.grounding.verified : t.grounding.notVerified}
              </span>
            </div>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-mist">
              {JSON.stringify({ input: c.input, result: c.result }, null, 1)}
            </pre>
          </div>
        </div>
        <div className="reveal mt-8 rounded-xl border border-mist/25 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mist/70">
            {t.grounding.agentTitle}
          </p>
          {'ran' in run && run.ran === false ? (
            <p className="mt-2 text-sm text-mist/80">{t.grounding.agentNotRun}</p>
          ) : (
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs text-mist">
              {JSON.stringify(run, null, 1)}
            </pre>
          )}
        </div>
      </div>
    </section>
  )
}
