import { useMemo, useState } from 'react'
import loop from './data/loop.json'
import { applyScopeGuardrail } from './escalationRule'
import type { Decision, LoopCase, LoopData } from './types'

const demo = loop as unknown as LoopData
type Language = 'de' | 'en'

const CONTENT = {
  de: {
    eyebrow: 'ARBEITSPROBE · AI OPERATIONS',
    title: 'Ein Fall. Eine falsche Entscheidung. Eine bessere Prüfung.',
    intro: 'Ein kleines Beispiel dafür, was nach einer AI-Entscheidung passieren sollte: Fehler erkennen, Evidenz prüfen, eine Regel testen.',
    banner: '8 erfundene Fälle · feste Testdaten · keine echten Modellaufrufe',
    choose: 'Fall auswählen',
    mismatch: 'Abweichung',
    match: 'Im Test korrekt',
    detail: 'Der ausgewählte Fall',
    what: 'Was gemeldet wurde',
    positions: 'Rechnungspositionen',
    policy: 'Vertragsauszug ansehen',
    insight: 'Warum ist das wichtig?',
    evidence: 'Gespeicherter Prüfhinweis (synthetisch)',
    before: 'Bisherige Entscheidung',
    after: 'Mit zusätzlicher Review-Regel',
    pending: 'Noch nicht angewendet',
    apply: 'Review-Regel auf 8 Fälle anwenden',
    reset: 'Zur Ausgangslage',
    decisionIntro: 'Was ändert sich?',
    afterMessage: 'Der zusätzliche Check schlägt für diesen Fall eine menschliche Prüfung vor. Keine automatische Zahlung oder Ablehnung.',
    unchanged: 'Für diesen Fall löst die enge Zusatzregel keine Änderung aus.',
    beforeMessage: 'Der Ausgangslauf hat diesen Fall als ausreichend für eine automatische Entscheidung behandelt.',
    matched: 'Dieser Fall stimmt bereits mit der synthetischen Testvorgabe überein.',
    resultTitle: 'Ergebnis auf allen Testfällen',
    accuracy: 'Übereinstimmung mit Testvorgabe',
    missed: 'Verpasste markierte Risikofälle',
    automation: 'Anteil ohne menschliche Prüfung',
    metricsHint: 'Die Zahlen beschreiben nur diese 8 handgeschriebenen Beispiele – keine Prognose für reale Schäden.',
    ruleTitle: 'Was die Regel tatsächlich prüft',
    rule1: 'Leichter Stoßstangenschaden im gemeldeten Hergang',
    rule2: 'Weitere Reparaturpositionen in der Rechnung',
    rule3: 'Dokumentierter Widerspruch aus der Rechnungsprüfung',
    ruleOutro: 'Treffen alle Bedingungen zu, wird der Fall zur menschlichen Prüfung eskaliert. Die Regel liest weder Fall-ID noch erwartetes Testergebnis.',
    how: 'Über dieses Experiment',
    caveat: 'Die Fälle, Prüfhinweise und bisherigen Entscheidungen sind synthetisch. Keine Kundendaten, kein Live-Claude, keine Versicherungsentscheidung. Die Zusatzregel ist bewusst eng gefasst und muss für echte Abläufe fachlich geprüft werden.',
    source: 'Quellcode und Tests',
    about: 'Michael Ninh · Berlin',
    footer: 'Eine kleine Demonstration operativer Qualität – nicht mehr, aber auch nicht weniger.',
    categoryHaus: 'Hausrat',
    categoryAuto: 'Kfz-Kasko',
    decisions: {
      pay: 'Auszahlen',
      pay_reduced: 'Gekürzt auszahlen',
      decline: 'Ablehnen',
      refer_to_human: 'Menschliche Prüfung',
    },
    note: 'Testfall',
  },
  en: {
    eyebrow: 'WORK SAMPLE · AI OPERATIONS',
    title: 'One claim. One wrong decision. A better review.',
    intro: 'A small example of what should happen after an AI decision: find the mistake, inspect the evidence, test a rule.',
    banner: '8 fictional claims · fixed fixtures · no live model calls',
    choose: 'Choose a case',
    mismatch: 'Mismatch',
    match: 'Matches test label',
    detail: 'Selected case',
    what: 'Reported incident',
    positions: 'Invoice items',
    policy: 'Show policy excerpt',
    insight: 'Why it matters',
    evidence: 'Saved review note (synthetic)',
    before: 'Baseline decision',
    after: 'With additional review rule',
    pending: 'Not applied yet',
    apply: 'Apply review rule to 8 cases',
    reset: 'Reset demo',
    decisionIntro: 'What changes?',
    afterMessage: 'The extra check recommends human review here. No automatic settlement or rejection.',
    unchanged: 'This narrow additional rule does not change this case.',
    beforeMessage: 'The baseline run treated this case as suitable for an automatic decision.',
    matched: 'This case already matches its synthetic evaluation label.',
    resultTitle: 'Results across all test cases',
    accuracy: 'Matches synthetic test labels',
    missed: 'Missed labelled risk cases',
    automation: 'Without human review',
    metricsHint: 'These numbers describe eight hand-written examples only – not predicted real-world performance.',
    ruleTitle: 'What the rule actually checks',
    rule1: 'A low-impact bumper incident in the reported narrative',
    rule2: 'Additional repair items on the invoice',
    rule3: 'Documented mismatch in the invoice-review note',
    ruleOutro: 'If all conditions hold, the claim is referred for human review. The rule reads neither the claim ID nor the expected test label.',
    how: 'About this exercise',
    caveat: 'All claims, review notes and baseline decisions are synthetic. No customer data, no live Claude call, no insurance decision. The additional rule is deliberately narrow and requires domain review before any real-world use.',
    source: 'Source code & tests',
    about: 'Michael Ninh · Berlin',
    footer: 'A small demonstration of operational quality – nothing more, and nothing less.',
    categoryHaus: 'Contents',
    categoryAuto: 'Motor',
    decisions: {
      pay: 'Pay',
      pay_reduced: 'Partial payment',
      decline: 'Decline',
      refer_to_human: 'Human review',
    },
    note: 'Sample',
  },
} as const

function categoryName(caseItem: LoopCase, language: Language) {
  return caseItem.line_of_business === 'kfz_kasko'
    ? CONTENT[language].categoryAuto
    : CONTENT[language].categoryHaus
}

function metrics(cases: LoopCase[], useRule: boolean) {
  const decisions = cases.map((item) =>
    useRule ? applyScopeGuardrail(item).decision : item.decision,
  )
  const correct = cases.filter((item, i) => decisions[i] === item.expected_decision).length
  const missed = cases.filter((item, i) => item.is_fraudulent && decisions[i] !== 'refer_to_human').length
  const automatic = decisions.filter((decision) => decision !== 'refer_to_human').length

  return {
    correct,
    missed,
    autoPct: Math.round((1000 * automatic) / cases.length) / 10,
  }
}

function shortTitle(item: LoopCase, lang: Language) {
  const titles: Record<string, [string, string]> = {
    'HR-2026-001': ['Wasserschaden in der Küche', 'Kitchen water damage'],
    'HR-2026-002': ['Waschmaschine und Fernseher', 'Washing machine & television'],
    'HR-2026-003': ['Überschwemmung ohne Zusatzschutz', 'Flood without coverage add-on'],
    'HR-2026-004': ['Einbruch ohne Polizeianzeige', 'Burglary without police report'],
    'HR-2026-005': ['Einbruch mit offenen Angaben', 'Burglary with missing details'],
    'KFZ-2026-001': ['Kfz-Schaden', 'Motor claim'],
    'KFZ-2026-002': ['Kfz-Reparatur', 'Vehicle repair'],
    'KFZ-2026-003': ['Parkschaden mit auffälliger Rechnung', 'Parking incident with unusual invoice'],
  }
  return titles[item.claim_id]?.[lang === 'de' ? 0 : 1]
    ?? item.fnol_text.slice(0, 52)
}

export default function ClaimsApp() {
  const [lang, setLang] = useState<Language>('de')
  const [activeId, setActiveId] = useState(
    demo.cases.find((item) => !item.correct)?.claim_id ?? demo.cases[0].claim_id,
  )
  const [ruleApplied, setRuleApplied] = useState(false)
  const t = CONTENT[lang]
  const active = demo.cases.find((item) => item.claim_id === activeId) ?? demo.cases[0]
  const result = applyScopeGuardrail(active)
  const afterDecision = ruleApplied ? result.decision : null
  const before = useMemo(() => metrics(demo.cases, false), [])
  const after = useMemo(() => metrics(demo.cases, true), [])
  const current = ruleApplied ? after : before
  const invoiceTrace = active.receipt.traces.find((trace) =>
    /rechnungspr.fung|invoice review/i.test(trace.agent),
  )
  const isMismatch = active.decision !== active.expected_decision
  const status = (decision: Decision) => t.decisions[decision]

  return (
    <div className="claims-app" id="top">
      <header className="site-bar">
        <div className="site-bar-inner">
          <a className="brand" href="#top">Michael Ninh <span>/ AI Operations</span></a>
          <div className="bar-actions">
            <a className="quiet-link" href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">
              {t.source} <span aria-hidden="true">↗</span>
            </a>
            <button
              className="lang-switch"
              type="button"
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              aria-label={lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
            >{lang === 'de' ? 'EN' : 'DE'}</button>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="intro">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="lead">{t.intro}</p>
          <span className="scope-note"><span className="scope-dot" aria-hidden="true" />{t.banner}</span>
        </div>

        <section className="results" aria-labelledby="result-title">
          <div className="results-heading">
            <div>
              <p className="section-kicker">01 / {t.resultTitle}</p>
              <h2 id="result-title">{t.decisionIntro}</h2>
            </div>
            <div className="rule-actions">
              {ruleApplied ? (
                <button className="secondary-button" type="button" onClick={() => setRuleApplied(false)}>
                  <span aria-hidden="true">↶</span> {t.reset}
                </button>
              ) : (
                <button className="primary-button" type="button" onClick={() => setRuleApplied(true)}>
                  {t.apply} <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>
          <div className="metric-row" aria-live="polite" aria-atomic="true">
            <div className="metric"><span className="metric-name">{t.accuracy}</span><strong>{current.correct} / {demo.cases.length}</strong><span className="metric-change">{ruleApplied ? '7 → 8' : '7 / 8'} · {t.note}</span></div>
            <div className="metric"><span className="metric-name">{t.missed}</span><strong>{current.missed}</strong><span className="metric-change">{ruleApplied ? '1 → 0' : '1'} · {t.note}</span></div>
            <div className="metric"><span className="metric-name">{t.automation}</span><strong>{String(current.autoPct).replace('.', lang === 'de' ? ',' : '.')}%</strong><span className="metric-change">{ruleApplied ? '75 → 62,5%' : '75%'} · {t.note}</span></div>
          </div>
          <p className="metric-disclaimer">{t.metricsHint}</p>
        </section>

        <section className="workspace" aria-label={t.detail}>
          <aside className="case-panel">
            <div className="pane-title"><h2>02 / {t.choose}</h2><span>{demo.cases.length}</span></div>
            <div className="case-list">
              {demo.cases.map((item) => {
                const selected = item.claim_id === activeId
                const mismatch = item.decision !== item.expected_decision
                const fixed = ruleApplied && applyScopeGuardrail(item).escalated
                return (
                  <button
                    key={item.claim_id}
                    className={'case-choice' + (selected ? ' is-selected' : '')}
                    type="button"
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => setActiveId(item.claim_id)}
                    data-testid={'case-' + item.claim_id}
                  >
                    <span className="case-id">{item.claim_id}</span>
                    <span className="case-title">{shortTitle(item, lang)}</span>
                    <span className={'case-state' + (mismatch && !fixed ? ' is-warning' : '')}>
                      {mismatch && !fixed ? t.mismatch : t.match}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="detail-panel">
            <div className="detail-head">
              <div>
                <p className="section-kicker">03 / {t.detail} <span className="separator">·</span> {active.claim_id}</p>
                <h2>{shortTitle(active, lang)}</h2>
                <span className="case-type">{categoryName(active, lang)}</span>
              </div>
              {isMismatch && <span className="attention-tag">{t.mismatch}</span>}
            </div>

            <div className="claim-block">
              <h3>{t.what}</h3>
              <p>{active.fnol_text}</p>
            </div>

            <div className="claim-columns">
              <div>
                <h3>{t.positions}</h3>
                <ul className="invoice-list">
                  {active.invoice_items.map((item, i) => (
                    <li key={i}>
                      <span>{item.description}</span>
                      <strong>{item.amount_eur.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', {
                        style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                      })}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="evidence-block">
                <h3>{t.evidence}</h3>
                <p>{invoiceTrace?.summary || active.receipt.rationale}</p>
              </div>
            </div>

            <div className="decision-row" aria-live="polite">
              <div className="decision-card baseline">
                <span>{t.before}</span>
                <strong>{status(active.decision)}</strong>
              </div>
              <div className={'decision-card updated' + (ruleApplied && result.escalated ? ' escalated' : '')}>
                <span>{t.after}</span>
                <strong>{afterDecision ? status(afterDecision) : t.pending}</strong>
                {ruleApplied && <small>{result.escalated ? t.afterMessage : t.unchanged}</small>}
              </div>
            </div>

            <details className="policy-details">
              <summary>{t.policy}<span aria-hidden="true">＋</span></summary>
              <p>{active.policy_excerpt}</p>
            </details>
          </div>
        </section>

        <section className="explainer">
          <div>
            <p className="section-kicker">04 / {t.ruleTitle}</p>
            <div className="rule-points">
              {[t.rule1, t.rule2, t.rule3].map((line, i) => (
                <div className="rule-point" key={line}>
                  <span>{String(i + 1).padStart(2, '0')}</span><p>{line}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rule-info">
            <h2>{t.insight}</h2>
            <p>{t.ruleOutro}</p>
            <details>
              <summary>{t.how} <span aria-hidden="true">＋</span></summary>
              <p>{t.caveat}</p>
            </details>
          </div>
        </section>

        <footer className="site-footer">
          <span>{t.about}</span>
          <p>{t.footer}</p>
          <a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">
            {t.source} ↗
          </a>
        </footer>
      </main>
    </div>
  )
}
