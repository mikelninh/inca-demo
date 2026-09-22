import { useLang } from '../i18n'
import { useReveal } from '../motion'

export default function CtaFooter() {
  const { lang, t } = useLang()
  const ref = useReveal<HTMLElement>(lang)
  return (
    <footer id="cta" ref={ref} className="bg-darkgreen py-24 text-cream">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-8">
        <div className="text-center">
          <h2 className="reveal text-4xl text-cream lg:text-6xl">
            {t.cta.title}
            <em className="text-mist">{t.cta.titleEm}</em>
          </h2>
          <p className="reveal mx-auto mt-5 max-w-xl text-mist/80">{t.cta.sub}</p>
        </div>
        <div className="reveal mx-auto mt-12 max-w-2xl rounded-xl border border-mist/25 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist/70">
            {t.cta.learnTitle}
          </p>
          <p className="mt-2 text-sm text-mist/80">{t.cta.learnIntro}</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-mist/90">
            {t.cta.learn.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
        <div className="reveal mt-10 flex flex-wrap items-center justify-center gap-5">
          <a href="mailto:mikel_ninh@yahoo.de" className="pill-cta" data-testid="mail-cta">
            {t.cta.mail}
          </a>
          <a
            href="https://www.linkedin.com/in/michael-ninh/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-mist/40 px-7 py-3 font-mono text-sm text-mist hover:border-mist"
          >
            {t.cta.linkedin}
          </a>
        </div>
        <p className="reveal mt-16 text-center font-mono text-[11px] text-mist/50">
          {t.cta.homage}
        </p>
      </div>
    </footer>
  )
}
