import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { strings, type Lang } from './strings'

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'de',
  setLang: () => {},
})

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem('lang')
    if (stored === 'de' || stored === 'en') return stored
  } catch {
    /* Safari Private Mode */
  }
  return 'de'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('lang', lang)
    } catch {
      /* ignore */
    }
  }, [lang])
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  const { lang, setLang } = useContext(LangContext)
  return { lang, setLang, t: strings[lang] }
}
