import { useEffect, useState } from 'react'
import type { AgentTrace } from '../../types'

export default function PipelineView({ traces, caseId }: { traces: AgentTrace[]; caseId: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    setArmed(false)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = setTimeout(() => setArmed(true), reduced ? 0 : 80)
    return () => clearTimeout(id)
  }, [caseId])
  return (
    <div className="space-y-3">
      {traces.map((tr, i) => {
        const warn = tr.confidence < 0.7
        return (
          <div key={`${caseId}-${tr.agent}`}>
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-mist/80">
              <span>{tr.agent}</span>
              <span className={warn ? 'text-signal' : ''}>{Math.round(tr.confidence * 100)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream/15">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${warn ? 'bg-signal' : 'bg-core'}`}
                style={{
                  width: armed ? `${tr.confidence * 100}%` : '0%',
                  transitionDelay: `${i * 350}ms`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-mist/60">{tr.summary}</p>
          </div>
        )
      })}
    </div>
  )
}
