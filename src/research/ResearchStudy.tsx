import {useEffect,useRef,useState} from 'react'
import loop from '../data/loop.json'
import {applyScopeGuardrail} from '../escalationRule'
import type {Decision,LoopCase,LoopData} from '../types'
import {evidenceLedger,auditEvidenceLedger} from './evidence'
import {allocateCases,compareTrial,countedActiveTime} from './study'
import type {Assignment,SourceRating,TrialResult} from './study'
import './research.css'

const cases=(loop as unknown as LoopData).cases
const byId=new Map(cases.map(c=>[c.claim_id,c]))
const criticalIds=new Set(cases.filter(c=>c.expected_decision==='refer_to_human').map(c=>c.claim_id))
const LABELS:Record<Decision,string>={
 pay:'Auszahlen / Pay',pay_reduced:'Teilweise auszahlen / Pay reduced',
 decline:'Ablehnen / Decline',refer_to_human:'Manuell prüfen / Human review'
}
const decisions:Decision[]=['pay','pay_reduced','decline','refer_to_human']
const percent=(value:number|null)=>value===null?'—':Math.round(value*100)+'%'
const secs=(value:number|null)=>value===null?'—':(value/1000).toFixed(1)+'s'

export default function ResearchStudy(){
 const [consent,setConsent]=useState(false)
 const [started,setStarted]=useState(false)
 const [seed,setSeed]=useState<number|null>(null)
 const [plan,setPlan]=useState<Assignment[]>([])
 const [index,setIndex]=useState(0)
 const [records,setRecords]=useState<TrialResult[]>([])
 const [decision,setDecision]=useState<Decision|''>('')
 const [rating,setRating]=useState<SourceRating|''>('')
 const [focusField,setFocusField]=useState('')
 const [sourceJumps,setSourceJumps]=useState(0)
 const [status,setStatus]=useState('')
 const clock=useRef({started:0,accumulated:0,visible:false})
 const current=plan[index]
 const claim=current?byId.get(current.caseId):null
 const complete=started && plan.length>0 && index>=plan.length
 const ledger=claim?evidenceLedger(claim):[]
 const audit=claim?auditEvidenceLedger(claim,ledger):null
 const proposal=claim&&current?.arm==='evidence_assist'?applyScopeGuardrail(claim):null

 useEffect(()=>{
   if(!started||!claim||complete)return
   clock.current={started:performance.now(),accumulated:0,visible:!document.hidden}
   const visibility=()=>{
     const now=performance.now(),c=clock.current
     if(c.visible){c.accumulated+=now-c.started}
     c.started=now
     c.visible=!document.hidden
   }
   document.addEventListener('visibilitychange',visibility)
   return()=>document.removeEventListener('visibilitychange',visibility)
 },[started,index,claim,complete])

 function begin(){
   if(!consent || started)return
   const bytes=new Uint32Array(1)
   crypto.getRandomValues(bytes)
   const nextSeed=bytes[0]
   setSeed(nextSeed)
   setPlan(allocateCases(cases.map(c=>c.claim_id),nextSeed))
   setIndex(0);setRecords([]);setStarted(true);setStatus('')
 }
 function jump(field:string){
   if(current?.arm!=='evidence_assist')return
   setFocusField(field);setSourceJumps(v=>v+1)
 }
 function commit(){
   if(!claim||!current||!decision||!rating||complete)return
   const c=clock.current
   const duration=countedActiveTime(c.started,performance.now(),c.accumulated,c.visible)
   const recorded:TrialResult={
     caseId:claim.claim_id,arm:current.arm,sequence:current.sequence,
     reviewerDecision:decision,matchesFixtureLabel:decision===claim.expected_decision,
     evidenceJudgement:rating,timeActiveMs:duration,
     sourceJumpCount:sourceJumps,completed:true
   }
   setRecords(list=>[...list,recorded])
   setIndex(v=>v+1);setDecision('');setRating('');setFocusField('');setSourceJumps(0)
   window.scrollTo({top:0,behavior:'instant'})
 }
 function exportSession(){
   if(!complete||seed===null)return
   const summary=compareTrial(records,criticalIds)
   const payload={
     schema:'inca-review-trial-0.1',
     consented_local_export:true,session_seed:seed,created_at:new Date().toISOString(),
     dataset:'8 synthetic cases; author-labelled fixture truth',split:'counterbalanced_per_case_across_seeds',
     protocol:'case-seen-once; 4 reference / 4 evidence-assisted; sequence shuffled; no logged-in users or production data',
     results:records,summary,
     warnings:[
      'No independent reviewer validation, no real insurer documents, no reliable causal workload savings from one session.',
      'Fixture matching is not legal correctness. Exact citations are to authored text fields, not authenticated PDFs.',
      'Share voluntarily with researcher; raw claim text and names are not exported.'
     ]
   }
   const data=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'})
   const url=URL.createObjectURL(data)
   const a=document.createElement('a');a.href=url;a.download='inca-trial-'+seed+'.json'
   document.body.appendChild(a);a.click();a.remove()
   window.setTimeout(()=>URL.revokeObjectURL(url),1000)
   setStatus('Exportiert. Die Datei wurde nur lokal gespeichert und nicht automatisch versendet.')
 }
 const summary=complete?compareTrial(records,criticalIds):null

 return <div className="research-page">
  <header className="research-nav">
   <div className="research-nav-inner">
    <a href="/" className="research-brand">INCA <span>/ RESEARCH TASTE</span></a>
    <span className="research-edition">OPERATIONS LAB · v0.1</span>
    <a href="/" className="research-back">← Zur Arbeitsprobe</a>
   </div>
  </header>
  <main className="research-container">
   <div className="research-hero">
    <div className="research-eyebrow">01 / CONTROLLED PRODUCT EXPERIMENT</div>
    <h1>Correct decisions.<br/><em>Traceable evidence.</em><br/>Less human work.</h1>
    <p>Kann eine quellennahe Entscheidungshilfe Sachbearbeiter:innen schneller zu einer richtigen, nachvollziehbaren Einschätzung bringen — ohne neue gefährliche Fehler?</p>
    <div className="research-pill">8 synthetische Fälle · keine Live-KI · keine echten Versicherungsentscheidungen</div>
   </div>

   {!started && <section className="research-intro-panel">
    <div><div className="research-eyebrow">RESEARCH PROTOCOL</div>
     <h2>Eine faire A/B-Prüfung — keine Verkaufsshow.</h2>
     <p>Du prüfst acht fiktive Schadensfälle. Bei jedem Fall siehst du den Sachverhalt und die Vertragsklausel. In einem Teil der Fälle erhältst du zusätzlich eine Entscheidungshilfe und anklickbare, wörtliche Fundstellen. Die Reihenfolge wird zufällig gewählt.</p>
     <div className="research-three">
      <div><b>01</b><strong>Entscheiden</strong><span>Eine von vier Entscheidungen treffen.</span></div>
      <div><b>02</b><strong>Belege beurteilen</strong><span>Tragen die sichtbaren Angaben die Empfehlung?</span></div>
      <div><b>03</b><strong>Zeit messen</strong><span>Nur aktive Prüfzeit; ausgeblendete Tabs pausieren.</span></div>
     </div>
     <label className="research-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> <span>Ich verstehe: Das ist eine Studie mit fiktiven Fällen. Die Daten bleiben in diesem Tab und werden nur auf meinen ausdrücklichen Klick hin exportiert; es gibt keine automatische Übermittlung.</span></label>
     <button type="button" className="research-primary" disabled={!consent} onClick={begin}>Prüfung starten <span aria-hidden="true">↗</span></button>
    </div>
    <aside className="research-intro-aside"><div className="research-big">?</div><strong>Our hypothesis</strong><p>Better evidence navigation reduces review effort without sacrificing safety or correctness.</p><small>UNTESTED WITH REAL REVIEWERS</small></aside>
   </section>}

   {started&&!complete&&claim&&current&&<section className="research-task" aria-label="Review case">
    <div className="research-progress-head"><span>FALL {index+1} / {plan.length}</span><span>Review each case once · no ground-truth spoilers</span></div>
    <div className="research-progress" role="progressbar" aria-label="Completed cases" aria-valuenow={index} aria-valuemin={0} aria-valuemax={plan.length}><span style={{width:(100*index/plan.length)+'%'}}/></div>
    <div className="research-case-title">
      <div><div className="research-eyebrow">ANONYMOUS SYNTHETIC FILE · {claim.claim_id}</div><h2>Bitte beurteile den Fall.</h2></div>
      <span className="research-case-tag">{claim.line_of_business.toUpperCase()}</span>
    </div>
    <div className="research-columns">
     <section className="research-source-column" aria-label="Original synthetic source fields">
      <div className="research-column-heading"><h3>01 / Originalangaben</h3><small>Unveränderte Textfelder aus dem Testdatensatz</small></div>
      <div className={'research-source '+(focusField==='fnol_text'?'selected':'')}>
        <span className="research-source-type">SCHADENMELDUNG · fnol_text</span><p>{claim.fnol_text}</p>
      </div>
      <div className={'research-source '+(focusField==='policy_excerpt'?'selected':'')}>
        <span className="research-source-type">VERTRAGSAUSZUG · policy_excerpt</span><p>{claim.policy_excerpt}</p>
      </div>
      <div className="research-source">
        <span className="research-source-type">RECHNUNG · {claim.invoice_items.length} POSITION(EN)</span>
        {claim.invoice_items.map((item,i)=><div className={'research-invoice '+(focusField==='invoice_items.'+i+'.description'?'selected':'')} key={i}><span>{item.description}</span><strong>{item.amount_eur.toLocaleString('de-DE')} €</strong></div>)}
      </div>
      <p className="research-caution">Anlagen sind im Demo nur als Dateinamen angegeben, nicht als verifizierbare Original-PDFs. Keine echte Policenprüfung.</p>
     </section>
     <section className="research-aid-column" aria-label="Decision review tools">
      <div className="research-column-heading"><h3>02 / Prüfung</h3><small>Entscheidungsunterstützung · keine automatische Freigabe</small></div>
      <div className="research-suggestion">
        <span className="research-source-type">GESPEICHERTER VORSCHLAG (SYNTHETISCH)</span>
        <strong>{LABELS[current.arm==='evidence_assist' ? proposal!.decision : claim.decision]}</strong>
        {current.arm==='evidence_assist'&&<p>{proposal!.escalated
          ? 'Zusatzregel entdeckt einen potenziellen Widerspruch zwischen Hergang und Reparaturumfang. Menschliche Prüfung empfohlen.'
          : 'Die enge Zusatzregel verändert den gespeicherten Vorschlag nicht.'}</p>}
        {current.arm==='reference'&&<p>Du entscheidest anhand der sichtbaren Originalangaben. Es werden keine zusätzlichen Fundstellen vorgeschlagen.</p>}
      </div>
      {current.arm==='evidence_assist'&&<div className="research-ledger">
        <div className="research-ledger-head"><strong>Beleg-Navigator</strong><small>{audit?.exact}/{audit?.total} wörtlich auffindbar*</small></div>
        {ledger.map(item=><button type="button" key={item.id} className={'research-evidence-link '+(focusField===item.field?'is-active':'')} onClick={()=>jump(item.field)}>
          <span>{item.id} · {item.title}</span><q>{item.quote}</q><small>{item.field} · {item.source_status==='synthetic_analyst_note'?'Simulierte Notiz':'Synthetische Quelldaten'}</small>
        </button>)}
        <p className="research-caution">*Ein wortgenauer Treffer belegt nur die Herkunft aus den Beispieltexten. Er bestätigt weder deren Wahrheitsgehalt noch die fachliche Richtigkeit der Entscheidung. Es gibt keine echten PDF-Seitenzitate.</p>
      </div>}
      <div className="research-review-form">
       <label htmlFor="research-decision">Welche Entscheidung würdest du empfehlen?</label>
       <select id="research-decision" value={decision} onChange={e=>setDecision(e.target.value as Decision|'' )}>
        <option value="">Entscheidung auswählen…</option>
        {decisions.map(d=><option key={d} value={d}>{LABELS[d]}</option>)}
       </select>
       <label htmlFor="research-rating">Ist der Vorschlag durch die sichtbaren Angaben ausreichend gestützt?</label>
       <select id="research-rating" value={rating} onChange={e=>setRating(e.target.value as SourceRating|'')}>
        <option value="">Beleglage beurteilen…</option>
        <option value="supported">Ja, ausreichend gestützt</option>
        <option value="unsupported">Nein, nicht ausreichend gestützt</option>
        <option value="uncertain">Unklar / weitere Unterlagen nötig</option>
       </select>
       <button type="button" className="research-primary" disabled={!decision||!rating} onClick={commit}>Prüfung abschliessen <span aria-hidden="true">→</span></button>
       <p className="research-caution">Wir messen aktive Bearbeitungszeit, ohne dich auf Geschwindigkeit zu drängen. Korrektheit und Sicherheit gehen vor Tempo.</p>
      </div>
     </section>
    </div>
   </section>}

   {complete&&summary&&<section className="research-summary">
    <div className="research-eyebrow">02 / LOCAL STUDY RESULT</div>
    <h2>Dein Test ist abgeschlossen.</h2>
    <p>Dies sind deine tatsächlich aufgezeichneten Entscheidungen auf acht fiktiven Fällen. Die Bedingungen enthielten unterschiedliche Fälle. Daraus lässt sich **keine kausale Zeitersparnis** für reale Sachbearbeitung ableiten.</p>
    <div className="research-results">
      <div><span>Übliche Ansicht</span><strong>{summary.reference.correct}/{summary.reference.n}</strong><small>Testlabels getroffen</small><em>{secs(summary.reference.medianCorrectMs)} · Median pro korrektem Fall</em></div>
      <div><span>Beleg-Navigator</span><strong>{summary.assisted.correct}/{summary.assisted.n}</strong><small>Testlabels getroffen</small><em>{secs(summary.assisted.medianCorrectMs)} · Median pro korrektem Fall</em></div>
      <div><span>Belegte Zeitersparnis</span><strong>Unbekannt</strong><small>Mehrere unabhängige Reviewer + gleiche Fallmischung erforderlich</small></div>
    </div>
    <div className="research-export">
      <div><h3>Freiwilliger Datenexport</h3><p>Die JSON-Datei enthält nur Testfall-IDs, zugewiesene Ansicht, Entscheidungen, aktive Zeit, Belegurteile und zusammengefasste Kennzahlen — keine Namen, keine Originaltexte und keine Zugangsdaten.</p></div>
      <button type="button" className="research-primary" onClick={exportSession}>Anonymisierte Ergebnisse exportieren <span aria-hidden="true">↓</span></button>
    </div>
    <p role="status" className="research-caution">{status}</p>
   </section>}
   <section className="research-method">
    <div className="research-eyebrow">03 / RELEASE GATES</div>
    <h2>What counts as success?</h2>
    <div className="research-gates">
     <div><b>01 / SAFETY</b><strong>Zero critical wrong auto-decisions.</strong><p>Mandatory human handoffs must not disappear. Human judgement can override any draft.</p></div>
     <div><b>02 / TRACEABILITY</b><strong>Every cited excerpt must resolve.</strong><p>Exact text matching is mechanical; independent review must additionally confirm the cited passage supports the claim.</p></div>
     <div><b>03 / WORKLOAD</b><strong>Less time per correctly handled case.</strong><p>Compare median active reviewer time by condition and case, with case-mix balancing and reviewer-level confidence intervals.</p></div>
     <div><b>04 / GENERALISATION</b><strong>Unseen, independently labelled cases.</strong><p>These eight authored fixtures only check the experiment machinery. Real effectiveness requires a separate study.</p></div>
    </div>
   </section>
   <footer className="research-footer">INCA Research Taste · Experimental work sample · No actual insurer or live AI model is connected · <a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">Inspectable code ↗</a></footer>
  </main>
 </div>
}
