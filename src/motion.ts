import { useEffect, useRef, useState } from 'react'

// `dep` (z.B. die Sprache) erzwingt Neu-Beobachtung, wenn React die Knoten ersetzt hat.
export function useReveal<T extends HTMLElement>(dep?: unknown) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-visible')),
      { threshold: 0.15 },
    )
    el.querySelectorAll('.reveal').forEach((n, i) => {
      ;(n as HTMLElement).style.transitionDelay = `${i * 40}ms`
      obs.observe(n)
    })
    return () => obs.disconnect()
  }, [dep])
  return ref
}

export function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return
      obs.disconnect()
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - t0) / durationMs, 1)
        setValue(target * (1 - Math.pow(1 - p, 3)))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, durationMs])
  return { ref, value }
}

export function useScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setP(max > 0 ? window.scrollY / max : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return p
}

export function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now.toLocaleTimeString('de-DE', { hour12: false })
}
