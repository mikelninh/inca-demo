import { useLang } from '../i18n'
import { useScrollProgress } from '../motion'

const ANCHORS = ['konsole', 'bruch', 'grounding', 'flotte', 'fit', 'cta'] as const
const ANCHOR_IDS: Record<(typeof ANCHORS)[number], string> = {
  konsole: 'konsole',
  bruch: 'bruchstellen',
  grounding: 'grounding',
  flotte: 'flotte',
  fit: 'fit',
  cta: 'cta',
}

export default function Nav() {
  const { lang, setLang, t } = useLang()
  const progress = useScrollProgress()
  return (
    <nav className="sticky top-0 z-50 border-b border-hairline bg-cream/90 backdrop-blur">
      <div className="scroll-progress" style={{ width: `${progress * 100}%` }} />
      <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-3 lg:px-8">
        <a href="#top" className="font-mono text-sm tracking-[0.14em]">
          MIKEL <span className="text-core">×</span> INCA
        </a>
        <div className="hidden gap-6 lg:flex">
          {ANCHORS.map((a) => (
            <a
              key={a}
              href={`#${ANCHOR_IDS[a]}`}
              className="nav-link font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
            >
              {t.nav[a]}
            </a>
          ))}
        </div>
        <button
          onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
          data-testid="lang-toggle"
          className="rounded-full border border-hairline px-3 py-1 font-mono text-xs text-muted transition hover:border-faint hover:text-ink"
          aria-label={lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
        >
          {lang === 'de' ? 'EN' : 'DE'}
        </button>
      </div>
    </nav>
  )
}
