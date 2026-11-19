import {useMemo,useState} from 'react'
import loop from '../data/loop.json'
import type {Decision,LoopData} from '../types'
import {portfolioScore,safeReceipt,simulateRun} from './controlTower'
import type {FaultMode,OperatorRun} from './controlTower'
import './ops.css'

const cases=(loop as unknown as LoopData).cases
const score=portfolioScore(cases)
const decisions:Record<Decision,string>={
  pay:'Auszahlung prüfen',pay_reduced:'Teilregulierung prüfen',
  decline:'Ablehnung prüfen',refer_to_human:'Menschliche Prüfung'
}
const actions:Record<OperatorRun['requiredNextAction'],string>={
  VERIFY_SOURCES:'Quellen verifizieren',
  REVIEW_DISCREPANCY:'Reparaturumfang prüfen',
  MANUAL_APPROVAL:'Vier-Augen-Freigabe',
  INVESTIGATE_MISSING_DETAILS:'Fehlende Unterlagen klären',
  REVIEW_CANDIDATE:'Entscheidung fachlich prüfen'
}
const names:Record<string,string>={
 'HR-2026-001':'Leitungswasser · Küchenboden',
 'HR-2026-002':'Leitungswasser · Fremdposition',
 'HR-2026-003':'Überschwemmung · Deckung',
 'HR-2026-004':'Einbruch · Risikohinweise',
 'HR-2026-005':'Einbruch · Belege fehlen',
 'KFZ-2026-001':'Glasbruch · Windschutzscheibe',
 'KFZ-2026-002':'Unfall · Hoher Betrag',
 'KFZ-2026-003':'Parkschaden · Widerspruch'
}
function copyReceipt(run:OperatorRun,event:'INSPECTED'|'DRAFT_EXPORTED'){
 const payload=safeReceipt(run,event)
 const blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'})
 const url=URL.createObjectURL(blob)
 const link=document.createElement('a')
 link.href=url;link.download='inca-audit-'+run.caseId.toLowerCase()+'.json'
 document.body.appendChild(link);link.click();link.remove()
 window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
const iconFor=(ok:boolean)=>ok?'✓':'!'
export default function OpsCockpit(){
 const [selectedId,setSelectedId]=useState('KFZ-2026-003')
 const [fault,setFault]=useState<FaultMode>('none')
 const [activeSource,setActiveSource]=useState('FNOL')
 const [tab,setTab]=useState<'decision'|'draft'|'receipt'>('decision')
 const [reviewed,setReviewed]=useState<string[]>([])
 const [notice,setNotice]=useState('')
 const selected=cases.find(x=>x.claim_id===selectedId)??cases[cases.length-1]
 const run=useMemo(()=>simulateRun(selected,fault),[selected,fault])
 const primarySource=run.evidence.find(x=>x.id===activeSource)??run.evidence[0]
 function chooseCase(id:string){
  setSelectedId(id);setFault('none');setActiveSource('FNOL');setTab('decision');setNotice('')
 }
 function inspectSource(id:string){setActiveSource(id);setNotice('Fundstelle hervorgehoben. Quelle stammt aus dem fiktiven Testdatensatz.')}
 function exportReceipt(){copyReceipt(run,'INSPECTED');setNotice('Anonymisierte Prüfquittung wurde lokal exportiert. Kein Serverkontakt.')}
 return <div className="incatower">
  <a className="tower-skip" href="#tower-workspace">Zum Arbeitsbereich</a>
  <header className="tower-topbar">
   <div className="tower-topbar-inner">
    <a href={import.meta.env.BASE_URL} className="tower-logo"><span className="tower-logomark">i</span><strong>INCA</strong><small>/ CONTROL TOWER</small></a>
    <div className="tower-navlinks"><a href={import.meta.env.BASE_URL+'?lab=1'}>PDF Evidence Lab ↗</a><a href={import.meta.env.BASE_URL+'?study=1'}>Reviewer-Studie ↗</a><a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">Quellcode ↗</a><span className="tower-version">Research prototype · v0.2</span></div>
   </div>
  </header>
  <main>
   <section className="tower-hero">
    <div className="tower-hero-main">
     <span className="tower-overline"><i aria-hidden="true"/> DEMO / CLAIMS OPERATIONS · 2026</span>
     <h1>From uncertainty<br/>to <em>defensible decisions.</em></h1>
     <p>Ein Schaden. Mehrere Dokumente. Eine nachvollziehbare Entscheidung – und die Fähigkeit, bei fehlender Evidenz bewusst zu stoppen.</p>
     <div className="tower-hero-footer"><span><strong>8</strong> fiktive Schadenakten</span><span><strong>0</strong> echte Auszahlungen</span><span><strong>100%</strong> lokale Simulation</span></div>
    </div>
    <div className="tower-hero-aside">
      <div className="tower-hero-symbol" aria-hidden="true">↗</div>
      <span>THE OPERATOR'S PRINCIPLE</span>
      <blockquote>„Ein guter Agent weiss nicht nur, was zu tun ist – sondern wann er aufhören muss.“</blockquote>
    </div>
   </section>
   <section className="tower-metrics" aria-label="Ergebnisse auf synthetischen Beispielen">
    <div><span>Entscheidungen · Testlabels</span><strong>{score.baselineCorrect} → {score.guardedCorrect}<small> / {score.n}</small></strong><p>Gespeicherte Vorschläge vs. Zusatzregel</p></div>
    <div><span>Menschliche Weiterleitungen</span><strong>{score.baselineHandoffs} → {score.guardedHandoffs}</strong><p>Mehr Sicherheit kann mehr Arbeit bedeuten</p></div>
    <div><span>Wörtliche Fundstellen</span><strong>{score.sourceExact}<small> / {score.sourceCount}</small></strong><p>Nur Herkunft, nicht fachlicher Beweis</p></div>
    <div><span>Gemessene Zeitersparnis</span><strong className="tower-unknown">Unbekannt</strong><p>0 reale Versuchsteilnehmende</p></div>
   </section>
   <section className="tower-body" id="tower-workspace">
    <div className="tower-section-title"><span>01 / OPERATIONS WORKSPACE</span><h2>Live operator workflow <small>– simuliert, aber interaktiv</small></h2><p>Wähle eine Akte. Prüfe die Belege. Provoziere einen Fehler. Beobachte, ob die Sicherheitsgrenze greift.</p></div>
    <div className="tower-board">
      <aside className="tower-queue" aria-label="Fallwarteschlange">
       <div className="tower-pane-top"><div><small>INBOX</small><h3>Schadenakten</h3></div><span className="tower-count">{cases.length}</span></div>
       <div className="tower-queue-list">
        {cases.map((c)=>{
         const selectedCase=selectedId===c.claim_id
         const suggested=simulateRun(c)
         return <button key={c.claim_id} type="button" onClick={()=>chooseCase(c.claim_id)}
          aria-pressed={selectedCase} className={'tower-case'+(selectedCase?' is-current':'')}>
          <span className="tower-case-top"><small>{c.claim_id}</small><span className={suggested.safeProposal==='refer_to_human'?'tower-mini-alert':'tower-mini-muted'}>{suggested.safeProposal==='refer_to_human'?'! Review':'· Analyse'}</span></span>
          <strong>{names[c.claim_id]??c.claim_id}</strong>
          <span>{c.line_of_business==='kfz_kasko'?'KFZ-Kasko':'Hausrat'} · {c.invoice_items.length} Position{c.invoice_items.length!==1?'en':''}</span>
         </button>
        })}
       </div>
       <div className="tower-queue-note">Keine Kundendaten. Alle Akten sind erfunden und lokal gespeichert.</div>
      </aside>
      <section className="tower-document" aria-label="Belegansicht">
       <div className="tower-pane-top"><div><small>02 / SOURCE DESK</small><h3>{names[selected.claim_id]}</h3></div><span className="tower-pill">FIXTURE DATA</span></div>
       <div className="tower-doc-meta"><div><span>Aktenzeichen</span><strong>{selected.claim_id}</strong></div><div><span>Schadentag</span><strong>{selected.incident_date}</strong></div><div><span>Belege angegeben</span><strong>{selected.attachments.length}</strong></div></div>
       <div className="tower-source-head"><span>QUELLEN IN DIESER AKTE</span><small>Wähle eine Fundstelle ↓</small></div>
       <div className="tower-source-chips">
        {run.evidence.map(x=><button key={x.id} type="button" onClick={()=>inspectSource(x.id)} className={'tower-chip'+(activeSource===x.id?' active':'')}>{x.id}<span className={x.kind==='synthetic_trace'?'tower-chip-note':''}>{x.kind==='synthetic_trace'?'NOTIZ':'ORIGINALFELD'}</span></button>)}
       </div>
       <div className="tower-paper">
        {primarySource&&<><div className="tower-paper-head"><span>TEXT / {primarySource.id}</span><span>synthetisch · keine PDF-Seite</span></div><h4>{primarySource.title}</h4><p>{primarySource.quote}</p><div className="tower-paper-ref"><span>Feldpfad</span><code>{primarySource.field}</code><span>Expertise</span><strong>Ungeprüft</strong></div></>}
       </div>
       <div className="tower-doc-items"><h4>Original-Rechnungspositionen</h4>
        {selected.invoice_items.map((x,i)=><div key={i}><span>{x.description}</span><strong>{x.amount_eur.toLocaleString('de-DE',{style:'currency',currency:'EUR'})}</strong></div>)}
       </div>
       {selected.attachments.length>0&&<details className="tower-attachments"><summary>Erwähnte Anlagen (keine hochgeladenen Dateien)</summary><p>{selected.attachments.join(' · ')}</p></details>}
      </section>
      <section className="tower-decision" aria-label="Entscheidung und Audit">
        <div className="tower-pane-top"><div><small>03 / DECISION DESK</small><h3>Check &amp; next action</h3></div><span className={'tower-gate '+(run.gate==='PASS_PROVENANCE'?'ok':'stop')}>{run.gate==='PASS_PROVENANCE'?'✓ TEXTMATCH':'✕ BLOCKIERT'}</span></div>
        <div className="tower-recommend">
          <span>VORSCHLAG NACH SICHERHEITS-CHECK</span>
          <strong>{decisions[run.safeProposal]}</strong>
          <p>{run.explanation}</p>
        </div>
        <div className="tower-checks"><div className="tower-subtitle">RELEASE-GATES <span>{run.checks.filter(x=>x.status==='ok').length} / {run.checks.length} geprüft*</span></div>
          {run.checks.map(ch=><div key={ch.id} className="tower-check"><span className={'tower-check-icon '+ch.status}>{ch.status==='ok'?iconFor(true):ch.status==='review'?'?':'×'}</span><div><strong>{ch.label}</strong><small>{ch.note}</small></div></div>)}
          <p className="tower-disclaimer">*Mechanische Tests ≠ fachliche Prüfung. Die regulative Freigabe bleibt deaktiviert.</p>
        </div>
        <nav className="tower-tabs" aria-label="Fallaktionen">
         {(['decision','draft','receipt'] as const).map(t=><button type="button" key={t} className={tab===t?'active':''} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='decision'?'Nächster Schritt':t==='draft'?'Entwurf':'Audit'}</button>)}
        </nav>
        <div className="tower-tab-content">
         {tab==='decision'&&<><small>EMPFOHLENER INTERNER SCHRITT</small><h4>{actions[run.requiredNextAction]}</h4><p>Diese Demo darf keine Auszahlung, Ablehnung oder externe Nachricht automatisch auslösen.</p><button type="button" className="tower-cta" onClick={()=>{setReviewed(v=>v.includes(selected.claim_id)?v:[...v,selected.claim_id]);setNotice('Interne Prüfung als lokale Demo-Markierung erfasst. Keine echte Fallweiterleitung.')}}>{reviewed.includes(selected.claim_id)?'✓ Demo-Aufgabe markiert':'Interne Prüfung simulieren'} <span>→</span></button></>}
         {tab==='draft'&&<><small>NICHT VERSENDETER ENTWURF</small><h4>Vorbereitete Bearbeitungsnotiz</h4><p>{run.actionDraft}</p><div className="tower-draft-warning">Nur lokaler Entwurf. Keine E-Mail, kein Schadenstatus und keine echten Entscheidungen wurden verändert.</div></>}
         {tab==='receipt'&&<><small>ANONYMISIERTE LOKALE AKTE</small><h4>Nachvollziehbare Prüfquittung</h4><p>Fall-ID, Entscheidungsvorschlag, Feldpfade, Prüfstatus und offene Mensch-Freigabe. Keine Schadenschilderung oder Kundendaten im Export.</p><button type="button" className="tower-cta" onClick={exportReceipt}>Audit als JSON exportieren <span>↓</span></button></>}
        </div>
        <p role="status" className="tower-notice">{notice}</p>
      </section>
    </div>
    <section className="tower-fault">
      <div><span>02 / ADVERSARIAL TESTING</span><h2>Was passiert, wenn die Daten falsch sind?</h2><p>Ein vertrauenswürdiger Agent muss scheitern können – und bei einem Fehler sicher stoppen. Teste die Schutzmechanismen ohne echte Schadenfälle.</p></div>
      <div className="tower-fault-controls" role="group" aria-label="Fehler-Szenario">
       {([{id:'none',label:'Normalfall'},{id:'missing_invoice',label:'Rechnung fehlt'},{id:'tampered_citation',label:'Zitat manipuliert'}] as {id:FaultMode,label:string}[]).map(x=>
         <button type="button" aria-pressed={fault===x.id} className={fault===x.id?'active':''} key={x.id} onClick={()=>{setFault(x.id);setActiveSource('POLICY');setNotice('Sicherheitsprüfung mit geänderten Testdaten erneut ausgeführt.')}}>{x.label}</button>)}
       <p>Aktueller Status: <strong>{run.gate==='PASS_PROVENANCE'?'Exakte Textfundstellen vorhanden; fachliche Prüfung ausstehend':'STOP — Keine autonome Aktion, Quellen erneut prüfen'}</strong></p>
      </div>
    </section>
   </section>
   <section className="tower-footer-info">
    <div><span>03 / THE BUSINESS QUESTION</span><h2>Correct. Traceable.<br/><em>Less human work?</em></h2><p>Die ersten beiden Eigenschaften sind im synthetischen Test technisch untersuchbar. Die dritte können wir erst mit unabhängigen Sachbearbeiter:innen und vollständig erfassten Weiterleitungen belegen.</p></div>
    <div className="tower-footer-actions"><a href={import.meta.env.BASE_URL+'?study=1'} className="tower-study-link">A/B-Studie starten ↗</a><a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">Code & Tests prüfen ↗</a><p>Offene, überprüfbare Arbeitsprobe · Kein Produkt von inca und keine Verbindung zu echten Versicherersystemen.</p></div>
   </section>
  </main>
  <footer className="tower-bottom"><span>INCA CONTROL TOWER · Independent work sample</span><span>Fictional cases · No live AI · No insurer integration · No actual payments</span></footer>
 </div>
}
