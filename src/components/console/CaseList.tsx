import { useLang } from '../../i18n'
import { DECISION_META, type LoopCase } from '../../types'

const TONE_BG = {
  core: 'bg-core text-darkgreen',
  signal: 'bg-signal text-white',
  maroon: 'bg-maroon text-cream',
}

export default function CaseList({
  cases,
  activeId,
  onSelect,
}: {
  cases: LoopCase[]
  activeId: string
  onSelect: (id: string) => void
}) {
  const { lang, t } = useLang()
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:w-56 lg:shrink-0 lg:space-y-2 lg:overflow-visible lg:pb-0">
      {cases.map((c) => {
        const meta = DECISION_META[c.decision]
        return (
          <button
            key={c.claim_id}
            onClick={() => onSelect(c.claim_id)}
            data-testid={`case-${c.claim_id}`}
            className={`w-64 shrink-0 rounded-xl border p-3 text-left transition lg:w-full ${
              c.claim_id === activeId
                ? 'border-core bg-core/10'
                : 'border-mist/30 bg-cream/5 hover:border-mist/60'
            } ${c.correct ? '' : 'border-dashed'}`}
          >
            <div className="flex items-center justify-between font-mono text-[10px] text-mist/70">
              <span>{c.claim_id}</span>
              {!c.correct && <span className="text-signal">{t.console.breakBadge}</span>}
            </div>
            <p className="mt-1 line-clamp-2 font-serif text-sm text-cream">{c.fnol_text}</p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] ${TONE_BG[meta.tone]}`}
            >
              {meta[lang]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
