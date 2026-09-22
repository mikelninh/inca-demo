import { useLang } from '../i18n'
import { useReveal } from '../motion'

export function openCase(caseId: string) {
  window.dispatchEvent(new CustomEvent('inca:select-case', { detail: caseId }))
  document.getElementById('konsole')?.scrollIntoView({ behavior: 'smooth' })
}

export default function Bruch() {
  const { lang, t } = useLang()
  const ref = useReveal<HTMLElement>(lang)
  return (
    <section
      id="bruchstellen"
      ref={ref}
      className="relative mx-auto max-w-[1320px] px-6 py-24 lg:px-8"
    >
      <span className="sec-num" aria-hidden>
        02
      </span>
      <p className="eyebrow reveal">{t.bruch.eyebrow}</p>
      <h2 className="reveal mt-3 max-w-2xl text-4xl lg:text-5xl">
        {t.bruch.titlePre}
        <em>{t.bruch.titleEm}</em>
      </h2>
      <p className="reveal mt-5 max-w-prose text-muted">{t.bruch.intro}</p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {t.bruch.cards.map((c, i) => (
          <div
            key={c.title}
            className="reveal lift flex flex-col rounded-xl border border-hairline bg-white/50 p-6"
          >
            <h3 className="text-xl">{c.title}</h3>
            <p className="mt-2 flex-1 text-sm text-muted">{c.body}</p>
            {c.caseId ? (
              <button
                onClick={() => openCase(c.caseId!)}
                data-testid={`break-card-${i}`}
                className="mt-4 self-start font-mono text-xs text-core-deep underline underline-offset-4 hover:text-ink"
              >
                {t.bruch.openCase}
              </button>
            ) : (
              <a
                href="#grounding"
                className="mt-4 self-start font-mono text-xs text-core-deep underline underline-offset-4 hover:text-ink"
              >
                {t.bruch.openGrounding}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
