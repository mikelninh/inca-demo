import fleetJson from '../data/fleet.json'
import { useLang } from '../i18n'
import { useReveal } from '../motion'
import type { FleetData, FleetTool } from '../types'
import Expandable from './Expandable'

const fleet = fleetJson as unknown as FleetData

const ANCHOR_TOOLS = new Set(['GitLaw', 'SafeVoice'])
const DEMOTED_TOOLS = new Set(['movie-mcp'])

function ToolCard({ tool, primary }: { tool: FleetTool; primary: boolean }) {
  const { t } = useLang()
  const anchor = ANCHOR_TOOLS.has(tool.name)
  return (
    <div
      className={`lift rounded-xl border p-5 ${
        anchor
          ? 'border-core/50 bg-softwhite'
          : primary
            ? 'border-hairline border-dashed bg-white/40'
            : 'border-hairline bg-white/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-serif text-xl">{tool.name}</h4>
        {primary && <span className="live-dot" />}
      </div>
      <p className="mt-1 text-sm text-muted">{tool.oneliner}</p>
      {tool.sample && (
        <p className="mt-3 overflow-x-auto rounded bg-softwhite p-2 font-mono text-[10px] text-muted">
          {tool.sample}
        </p>
      )}
      <p className="mt-3 font-mono text-[11px] text-faint">
        {tool.tests ? `${tool.tests} ${t.fleet.tests}` : ''}
        {tool.tests && tool.tools_count ? ' · ' : ''}
        {tool.tools_count ? `${tool.tools_count} ${t.fleet.tools}` : ''}
        {tool.deployed ? (
          <>
            {(tool.tests || tool.tools_count) && ' · '}
            <a
              href={`https://${tool.deployed}`}
              target="_blank"
              rel="noreferrer"
              className="text-core-deep underline underline-offset-2"
            >
              {tool.deployed}
            </a>
          </>
        ) : null}
      </p>
    </div>
  )
}

function Group({ group, primary }: { group: FleetData['groups'][number]; primary: boolean }) {
  return (
    <div className="mt-10">
      <h3 className={`text-2xl ${primary ? '' : 'text-muted'}`}>{group.title}</h3>
      <p className="text-sm text-faint">{group.subtitle}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.tools.map((tool) => (
          <ToolCard key={tool.name} tool={tool} primary={primary} />
        ))}
      </div>
    </div>
  )
}

export default function Fleet() {
  const { lang, t } = useLang()
  const ref = useReveal<HTMLElement>(lang)
  const [rawHead, ...tail] = fleet.groups
  // Anker zuerst, movie-mcp gehört thematisch nicht neben BaFin-Claims — wandert in den Klappbereich
  const head = {
    ...rawHead,
    tools: [
      ...rawHead.tools.filter((x) => ANCHOR_TOOLS.has(x.name)),
      ...rawHead.tools.filter((x) => !ANCHOR_TOOLS.has(x.name) && !DEMOTED_TOOLS.has(x.name)),
    ],
  }
  const demoted = rawHead.tools.filter((x) => DEMOTED_TOOLS.has(x.name))
  const expandGroups = demoted.length
    ? [{ ...tail[0], tools: [...demoted, ...(tail[0]?.tools ?? [])] }, ...tail.slice(1)]
    : tail
  return (
    <section id="flotte" ref={ref} className="relative mx-auto max-w-[1320px] px-6 py-24 lg:px-8">
      <span className="sec-num" aria-hidden>
        04
      </span>
      <p className="eyebrow reveal">{t.fleet.eyebrow}</p>
      <h2 className="reveal mt-3 text-4xl lg:text-5xl">
        {t.fleet.titlePre}
        <em>{t.fleet.titleEm}</em>
      </h2>
      <p className="reveal mt-5 max-w-2xl text-muted">{t.fleet.intro}</p>
      {lang === 'en' && t.fleet.deNote && (
        <p className="reveal mt-2 font-mono text-xs text-faint">{t.fleet.deNote}</p>
      )}
      <div className="reveal">
        <Group group={head} primary />
      </div>
      {expandGroups.length > 0 && (
        <Expandable more={t.fleet.moreGroups} less={t.fleet.lessGroups} className="mt-8">
          {expandGroups.map((g) => (
            <Group key={g.title} group={g} primary={false} />
          ))}
        </Expandable>
      )}
      <p className="reveal mt-8 font-mono text-[11px] text-faint">{fleet.note}</p>
    </section>
  )
}
