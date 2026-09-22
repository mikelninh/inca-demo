import { useLang } from '../i18n'
import { useReveal } from '../motion'

export default function Interstitial() {
  const { lang, t } = useLang()
  const ref = useReveal<HTMLElement>(lang)
  return (
    <section ref={ref} className="border-y border-hairline bg-cream">
      <div className="mx-auto max-w-[1320px] px-6 py-24 text-center lg:px-8 lg:py-32">
        <p className="reveal font-serif leading-none text-[clamp(2.8rem,8vw,7rem)]">
          {t.interstitial.pre}
          <em>{t.interstitial.em}</em>
        </p>
      </div>
    </section>
  )
}
