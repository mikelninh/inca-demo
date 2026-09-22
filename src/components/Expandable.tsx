import { useState, type ReactNode } from 'react'

export default function Expandable({
  more,
  less,
  children,
  className = '',
  dark = false,
}: {
  more: string
  less: string
  children: ReactNode
  className?: string
  dark?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={className}>
      {open && children}
      <button
        onClick={() => setOpen(!open)}
        className={`mt-4 rounded-full border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition ${
          dark
            ? 'border-mist/40 text-mist hover:border-mist'
            : 'border-hairline text-muted hover:border-faint hover:text-ink'
        }`}
      >
        {open ? `▴ ${less}` : `▾ ${more}`}
      </button>
    </div>
  )
}
