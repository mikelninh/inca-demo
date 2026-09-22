import loop from '../data/loop.json'
import { useLang } from '../i18n'
import { useReveal } from '../motion'
import { DECISION_META, type LoopData } from '../types'

const data = loop as unknown as LoopData

const TONE_PILL = {
  core: 'bg-core text-darkgreen',
  signal: 'bg-signal text-white',
  maroon: 'bg-maroon text-cream',
}

export default function Hero() {
  const { lang, t } = useLang()
  const ref = useReveal<HTMLElement>(lang)
  const preview = data.cases.find((c) => c.decision === 'refer_to_human') ?? data.cases[0]
  const meta = DECISION_META[preview.decision]

  return (
    <header
      id="top"
      ref={ref}
      className="mx-auto grid max-w-[1320px] gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28"
    >
      <div>
        <p className="eyebrow reveal hidden sm:block">{t.hero.eyebrow}</p>
        <p className="eyebrow reveal sm:hidden">{t.hero.eyebrowShort}</p>
        <h1 className="reveal mt-4 text-[3.2rem] leading-[0.95] lg:text-[5.4rem]">
          {t.hero.titlePre}
          <em>{t.hero.titleEm}</em>
        </h1>
        <p className="reveal mt-6 max-w-md text-lg text-muted">{t.hero.sub}</p>
        <div className="reveal mt-8 flex flex-wrap items-center gap-6">
          <a href="#ops-loop" className="pill-cta">
            {t.hero.cta}
          </a>
          <a
            href="#konsole"
            className="font-mono text-sm text-muted underline-offset-4 hover:underline"
          >
            {t.hero.secondary}
          </a>
        </div>
        <p className="reveal mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          {lang === 'de'
            ? 'Synthetische Fixtures · lokal reproduzierbar · keine Production-Claims'
            : 'Synthetic fixtures · locally reproducible · no production claims'}
        </p>
      </div>

      <a
        href="#konsole"
        className="reveal block rounded-[20px] bg-sage p-5 shadow-[0_24px_60px_rgba(47,53,18,0.25)] transition-transform hover:scale-[1.01] lg:[transform:perspective(2000px)_rotateY(-3deg)]"
      >
        <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.14em] text-mist">
          <span>{t.console.header}</span>
          <span>{data.metrics.total} FIXTURES</span>
        </div>
        <div className="mt-3 rounded-xl bg-cream p-4">
          <div className="flex items-center justify-between font-mono text-xs text-faint">
            <span>{preview.claim_id}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${TONE_PILL[meta.tone]}`}>
              {meta[lang]}
            </span>
          </div>
          <p className="mt-1 font-serif text-lg">{preview.fnol_text.slice(0, 80)}…</p>
          <div className="mt-3 space-y-2">
            {preview.receipt.traces.map((tr) => (
              <div key={tr.agent}>
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  <span>{tr.agent}</span>
                  <span>{Math.round(tr.confidence * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-hairline">
                  <div
                    className="h-full rounded-full bg-core"
                    style={{ width: `${tr.confidence * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </a>
    </header>
  )
}
