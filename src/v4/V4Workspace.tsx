import {useMemo,useState} from 'react'
import {scoreHoldout,summariseHoldout} from '../eval/holdout'
import type {ScoredCase} from '../eval/holdout'
import './v4.css'

const allRows=scoreHoldout()
const score=summariseHoldout(allRows)
const allFamilies=['Alle Szenarien',...score.byFamily.map(x=>x.family)]
function basename(){return import.meta.env.BASE_URL}
function Stat({label,value,foot,kind='normal'}:{label:string;value:string;foot:string;kind?:'normal'|'caution'|'good'}){
 return <div className={'v4-stat '+kind}>
  <span>{label}</span><strong>{value}</strong><small>{foot}</small>
 </div>
}
const routeNames:Record<string,string>={
 REVIEW_DISCREPANCY:'Menschliche Prüfung · Widerspruch',
 STOP_MISSING_SOURCE:'Stopp · Beleg fehlt',
 STOP_UNREADABLE:'Stopp · nicht lesbar',
 STOP_CITATION_INVALID:'Stopp · Falschzitat',
 REQUEST_EVIDENCE:'Angaben nachfordern',
 REVIEW_READY:'Zur fachlichen Prüfung'
}
function idLabel(row:ScoredCase){return row.id.replace('H-','')}
export default function V4Workspace(){
 const [filter,setFilter]=useState('Alle Szenarien')
 const [onlyErrors,setOnlyErrors]=useState(false)
 const [selected,setSelected]=useState(allRows[0]?.id??'')
 const [view,setView]=useState<'evaluation'|'architecture'>('evaluation')
 const rows=useMemo(()=>allRows.filter(x=>(filter==='Alle Szenarien'||x.family===filter)&&(!onlyErrors||!x.match)),[filter,onlyErrors])
 const item=allRows.find(x=>x.id===selected)??rows[0]??null
 const errors=allRows.filter(x=>!x.match)
 const accurate=score.labelsMatched
 return <div className="v4">
  <a className="v4-skip" href="#evaluation">Zum Evaluationsbericht</a>
  <header className="v4-head">
   <div className="v4-head-inner">
    <a className="v4-brand" href={basename()} aria-label="CLAIM OS Startseite"><span className="v4-hex">⌁</span><strong>CLAIM<span>/</span>OS</strong><small>4.0</small></a>
    <nav aria-label="Arbeitsprobe">
      <a href={basename()+'?lab=1'}>PDF Workbench</a>
      <a href={basename()+'?ops=1'}>Operations</a>
      <a href={basename()+'?study=1'}>Human Study</a>
      <a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </nav>
    <span className="v4-research-chip"><i/> INDEPENDENT RESEARCH</span>
   </div>
  </header>
  <main>
   <section className="v4-hero">
    <div className="v4-hero-layout">
     <div className="v4-hero-copy">
      <span className="v4-kicker"><span>INTELLIGENT CLAIMS OPERATIONS</span> · RESEARCH RELEASE 04</span>
      <h1>Every decision<br/>needs <em>evidence.</em></h1>
      <p>Von der Schadenmeldung über PDFs und Belege bis zur richtigen nächsten Handlung. Ein nachvollziehbares Operator-System, das Zweifel sichtbar macht, statt sie wegzuautomatisieren.</p>
      <div className="v4-hero-buttons">
       <a className="v4-cta" href={basename()+'?lab=1'}>Echte PDF-Belege prüfen <span>↗</span></a>
       <button type="button" onClick={()=>{setView('evaluation');document.getElementById('evaluation')?.scrollIntoView({behavior:'smooth'})}}>Evidenz & Tests ansehen <span>↓</span></button>
      </div>
      <div className="v4-reality">Nicht mit inca verbunden · Keine echten Versicherungsdaten · Keine autonome Regulierung</div>
     </div>
     <div className="v4-hero-diagram" role="img" aria-label="Ablauf: Dokumente, Modellhypothese, unabhängige Prüfung und menschliche Freigabe">
       <div className="v4-orbit-label">THE EVIDENCE CONTRACT</div>
       <div className="v4-diagram-stack">
        <div className="v4-diagram-node"><span>01 <b>INPUT</b></span><strong>PDF · Rechnung · Schadenmeldung</strong><small>Originale bleiben referenzierbar</small></div>
        <div className="v4-diagram-connector"><span>↓</span></div>
        <div className="v4-diagram-node hypothesis"><span>02 <b>HYPOTHESIS</b></span><strong>Strukturierte Extraktion</strong><small>Optionaler Modellaufruf nur im lokalen Backend</small></div>
        <div className="v4-diagram-connector"><span>↓</span></div>
        <div className="v4-diagram-node gate"><span>03 <b>INDEPENDENT GATE</b></span><strong>Quelle + Wert verifizieren</strong><small>Falsches Zitat? Fehlender Beleg? STOP.</small></div>
        <div className="v4-diagram-connector"><span>↓</span></div>
        <div className="v4-diagram-node final"><span>04 <b>HUMAN DECISION</b></span><strong>Übergeben, nicht behaupten</strong><small>Keine automatische Auszahlung oder Ablehnung</small></div>
       </div>
      </div>
    </div>
   </section>
   <section className="v4-proof-bar" aria-label="Forschungsstand">
    <div><b className="v4-pulse"/> <strong>LIVE WEBSITE</strong><span>PDF-Verarbeitung und Browser-Abläufe getestet</span></div>
    <div><b className="v4-silent"/> <strong>MODEL GATE</strong><span>CLI implementiert · kein bestätigter Live-Provider-Lauf</span></div>
    <div><b className="v4-silent"/> <strong>LIMIT</strong><span>Synthetische Daten, keine fachliche Gold-Standard-Evaluation</span></div>
   </section>
   <section className="v4-content" id="evaluation">
    <div className="v4-section-heading">
     <div><span>01 / MEASUREMENT, NOT MARKETING</span><h2>Evidence before confidence.</h2><p>Statt Erfolgszahlen zu erfinden: Ein zusätzlicher, offen einsehbarer Stresstest mit 36 handgeschriebenen Szenarien. Jeder Fehler bleibt sichtbar.</p></div>
     <div className="v4-mini-tools"><button type="button" onClick={()=>setView('evaluation')} aria-pressed={view==='evaluation'} className={view==='evaluation'?'current':''}>Evaluation</button><button type="button" onClick={()=>setView('architecture')} aria-pressed={view==='architecture'} className={view==='architecture'?'current':''}>Architecture</button></div>
    </div>
    {view==='evaluation'?<>
     <div className="v4-stat-row">
      <Stat label="AUTHORED SYNTHETIC CASES" value={String(score.n)} foot="Sechs Fehler- und Normalfallfamilien"/>
      <Stat label="LABEL AGREEMENT" value={accurate+' / '+score.n} foot="Regelprüfung · NICHT Modellgenauigkeit" kind={accurate===score.n?'good':'caution'}/>
      <Stat label="CRITICAL MISMATCHES" value={String(score.criticalScenarioMismatches)} foot={'Von '+score.criticalTotal+' kritischen Beispielen'} kind={score.criticalScenarioMismatches?'caution':'good'}/>
      <Stat label="LIVE AI EVALUATIONS" value="0" foot="Provider-Schlüssel und echter Lauf noch erforderlich"/>
     </div>
     <div className="v4-eval-shell">
      <div className="v4-eval-sidebar">
       <div className="v4-eval-sidebar-head"><span>CASE STUDY / HOLDOUT</span><strong>36-case stress test</strong><small>Autorenerstellte Tests, keine unabhängigen Expertenlabels</small></div>
       <div className="v4-filter-controls">
        <label>Testfamilie <select value={filter} onChange={e=>{setFilter(e.target.value);setSelected('')}}>{allFamilies.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label className="v4-checkbox"><input type="checkbox" checked={onlyErrors} onChange={e=>{setOnlyErrors(e.target.checked);setSelected('')}}/> Nur Abweichungen <strong>({errors.length})</strong></label>
       </div>
       <div className="v4-case-list">
        {rows.length?rows.map(row=><button type="button" key={row.id} className={item?.id===row.id?'active':''} onClick={()=>setSelected(row.id)}>
         <span><b>{idLabel(row)}</b><small className={row.match?'v4-green':'v4-orange'}>{row.match?'✓ Match':'! Mismatch'}</small></span>
         <strong>{row.family}</strong><small>{row.variation}</small>
        </button>):<p className="v4-empty">Keine Ergebnisse unter diesen Filtern.</p>}
       </div>
      </div>
      <div className="v4-eval-detail">
        <span className="v4-panel-overline">SELECTED / EVALUATION RECORD</span>
        {item?<><div className="v4-detail-top"><div><span>{item.id} · {item.family}</span><h3>{item.variation}</h3></div><span className={'v4-result-chip '+(item.match?'pass':'fail')}>{item.match?'✓ Label match':'! Label mismatch'}</span></div>
         <div className="v4-compare">
           <div><small>AUTHORED EXPECTATION</small><strong>{routeNames[item.expected]??item.expected}</strong></div>
           <div><small>DETERMINISTIC ACTUAL</small><strong>{routeNames[item.actual]??item.actual}</strong></div>
         </div>
         <div className="v4-explanation"><span>WHY THIS CASE EXISTS</span><p>{item.note}</p></div>
         <div className="v4-facts"><span>Wortgleiche Textanker <strong>{item.validCitations} / {item.totalCitations}</strong></span><span>Handoff <strong>Immer menschlich</strong></span><span>Risiko <strong>{item.severity==='critical'?'Kritisches Szenario':'Routine'}</strong></span></div>
       </>:<p>Kein Fall ausgewählt.</p>}
        <div className="v4-caveat"><b>Measurement boundary</b><p>Die Referenzlabels wurden für diese Fälle geschrieben. Selbst perfekte Übereinstimmung wäre kein Nachweis für die Genauigkeit eines LLM auf echten Versicherungsschäden. Dieser Bericht zeigt transparent das Verhalten unserer deterministischen Sicherheitsregeln.</p></div>
      </div>
     </div>
     <div className="v4-family-grid">
      {score.byFamily.map(x=><div key={x.family}><strong>{x.family}</strong><span>{x.correct} / {x.n}</span><div><i style={{width:(x.correct/x.n*100)+'%'}}/></div></div>)}
     </div>
    </>:<div className="v4-arch-grid">
      <div><span>MODEL</span><h3>Untrusted extraction</h3><p>Das Python-Backend aus CLAIM / OS 3.0 besitzt einen multimodalen Responses-API-Adapter. Modellantworten sind strukturierte Hypothesen, nicht freigegebene Tatsachen.</p></div>
      <div><span>VALIDATOR</span><h3>Independent readback</h3><p>PDF-Text und Bild-OCR stammen aus separaten lokalen Werkzeugen. Quellen-, Seiten- und Wertanker werden unabhängig vom Modell überprüft.</p></div>
      <div><span>REVIEW</span><h3>Deterministic human gate</h3><p>Schaden vor Vertragsbeginn, Rechnungswidersprüche, Beleglücken und auffällige Dokumentanweisungen führen zur Prüfung oder Nachfrage.</p></div>
      <div><span>GOVERNANCE</span><h3>No automatic settlement</h3><p>Kein automatischer Zahlungs- oder Ablehnungsauftrag. Die öffentliche GitHub-Pages-Seite besitzt keine API-Schlüssel und macht keine externen KI-Aufrufe.</p></div>
    </div>}
   </section>
   <section className="v4-trust">
     <div><span>02 / THIS IS WHERE IT GETS INTERESTING</span><h2>Can the next action<br/><em>be defended?</em></h2><p>Ein lesbares PDF ist noch keine korrekte Schadenentscheidung. Unsere strengste nächste Messung: echte Modelloutputs auf neuen Dokumenten, mit separatem Verifier und Expertenprüfung.</p><a href={basename()+'?lab=1'}>Quellen selbst prüfen <span>↗</span></a></div>
     <div className="v4-trust-list">
       <div><strong>01</strong><span>REAL</span><p>PDF-Bytes und Seitenanker aus tatsächlichem Parsing</p></div>
       <div><strong>02</strong><span>TESTABLE</span><p>Falsche Zitate führen zu sichtbaren Fehlern und Stopps</p></div>
       <div><strong>03</strong><span>NOT PROVEN</span><p>Kein gemessener finanzieller Nutzen, keine unabhängige Fachvalidierung</p></div>
       <div><strong>04</strong><span>NEXT</span><p>Opt-in-Modelllauf mit unabhängigen Tests, Token-, Zeit- und Kostenmessung</p></div>
     </div>
   </section>
   <footer className="v4-footer"><strong>CLAIM / OS <span>4.0</span></strong><p>Independent work sample · Fictional cases only · No connection to inca's systems</p><a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">View source ↗</a></footer>
  </main>
 </div>
}
