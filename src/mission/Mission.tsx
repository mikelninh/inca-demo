import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {scenarios,createScenarioPdfs} from '../doclab/samples'
import {parsePdfBytes,drawPdfPage} from '../doclab/pdfReader'
import {assessDossier,createCitations,checkCitation} from '../doclab/pdfEvidence'
import type {DossierStatus,ParsedDocument,PageCitation} from '../doclab/pdfEvidence'
import {checkAgentDraft,resolveExtractedCitation,sourcePackets} from './agentContract'
import type {AgentDraft,AgentCitation} from './agentContract'
import {runSyntheticRegression} from './regression'
import './mission.css'

type Stress='none'|'no_invoice'|'fabricated_quote'
type Inference='idle'|'running'|'live'|'rejected'|'unavailable'
type AgentView={mode:Inference;draft:AgentDraft|null;message:string;model:string;usage:string}
const emptyAgent:AgentView={mode:'idle',draft:null,message:'Noch keine Modellanfrage.',model:'',usage:''}
const names:Record<DossierStatus,string>={
  STOP_MISSING_SOURCE:'Belege fehlen',
  STOP_UNREADABLE:'Seite unlesbar',
  STOP_CITATION_INVALID:'Quelle ungültig',
  REVIEW_DISCREPANCY:'Widerspruch prüfen',
  REQUEST_EVIDENCE:'Nachweise anfordern',
  REVIEW_READY:'Fachprüfung vorbereiten'
}
const roleNames={claim:'Schadenmeldung',policy:'Versicherungsbedingungen',invoice:'Rechnung',unknown:'Ungeklärt'} as const
const regression=runSyntheticRegression()
function PageView({document,page}:{document:ParsedDocument|null;page:number}){
 const ref=useRef<HTMLCanvasElement>(null)
 const [state,setState]=useState<'working'|'ready'|'error'>('working')
 useEffect(()=>{
  let active=true;setState('working')
  if(!document||!ref.current)return
  const canvas=ref.current
  void drawPdfPage(document.bytes,page,canvas)
    .then(()=>{if(active)setState('ready')})
    .catch(()=>{if(active)setState('error')})
  return()=>{active=false}
 },[document,page])
 return <div className="mission-page-frame">
  {document?<><canvas ref={ref} className="mission-canvas" aria-label={'PDF Vorschau Seite '+page}/>
    {state==='working'&&<span className="mission-page-loading">PDF wird lokal gerendert …</span>}
    {state==='error'&&<span role="alert">PDF-Seite konnte nicht angezeigt werden.</span>}
   </>:<span>Die PDF-Akte wird vorbereitet …</>}
 </div>
}
function ShortStatus({status}:{status:DossierStatus}){
 const blocked=status.startsWith('STOP')
 return <span className={'mission-state '+(blocked?'blocked':status==='REVIEW_READY'?'ready':'review')}>
  <span aria-hidden="true">{blocked?'⨯':status==='REVIEW_READY'?'✓':'!'}</span> {blocked?'STOP / ':''}{names[status]}
 </span>
}
function packetAnchor(
  documents:ParsedDocument[],ref:AgentCitation
):PageCitation|null{
 const resolved=resolveExtractedCitation(documents,ref)
 const doc=documents.find(d=>d.id===ref.documentId)
 if(!resolved||!doc)return null
 return {id:'AI-SOURCE',documentId:ref.documentId,page:ref.page,
   offset:resolved.offset,quote:ref.quote,label:'Modellbeleg',
   role:doc.role,origin:doc.origin}
}
export default function Mission(){
 const [caseId,setCaseId]=useState('parking')
 const [documents,setDocuments]=useState<ParsedDocument[]>([])
 const [busy,setBusy]=useState(true)
 const [error,setError]=useState('')
 const [activeDocId,setActiveDocId]=useState('')
 const [pageNo,setPageNo]=useState(1)
 const [activeCitation,setActiveCitation]=useState<PageCitation|null>(null)
 const [stress,setStress]=useState<Stress>('none')
 const [agent,setAgent]=useState<AgentView>(emptyAgent)
 const [locallyReviewed,setLocallyReviewed]=useState(false)
 const sequence=useRef(0)
 const current=scenarios.find(s=>s.id===caseId)??scenarios[0]
 const load=useCallback(async(id:string)=>{
  const seq=++sequence.current
  setBusy(true);setError('');setStress('none');setAgent(emptyAgent)
  setActiveCitation(null);setLocallyReviewed(false)
  try{
   const sample=await createScenarioPdfs(id)
   const docs:ParsedDocument[]=[]
   for(const source of sample.docs)
    docs.push(await parsePdfBytes(source.bytes,source.id,source.name,source.role,'generated_sample'))
   if(seq!==sequence.current)return
   setDocuments(docs);setCaseId(id);setActiveDocId(docs[0]?.id??'');setPageNo(1)
  }catch(e){if(seq===sequence.current)setError(e instanceof Error?e.message:'PDF konnte nicht verarbeitet werden.')}
  finally{if(seq===sequence.current)setBusy(false)}
 },[])
 useEffect(()=>{void load('parking');return()=>{sequence.current++}},[load])
 const effective=useMemo(()=>stress==='no_invoice'?documents.filter(d=>d.role!=='invoice'):documents,[documents,stress])
 const normalQuotes=useMemo(()=>createCitations(effective),[effective])
 const citations=useMemo(()=>stress==='fabricated_quote'
   ?normalQuotes.map((c,i)=>i===0?{...c,quote:c.quote+' [ERFUNDEN]'}:c)
   :normalQuotes,[normalQuotes,stress])
 const result=useMemo(()=>assessDossier(effective,citations),[effective,citations])
 const exact=citations.filter(c=>checkCitation(effective,c)).length
 const activeDoc=effective.find(d=>d.id===activeDocId)??effective[0]??null
 const page=Math.min(pageNo,activeDoc?.pages.length??1)
 const currentText=activeDoc?.pages.find(p=>p.page===page)?.text??''
 const selectedAnchor=activeCitation?.documentId===activeDoc?.id&&activeCitation?.page===page
   ?activeCitation:null
 const validSelected=selectedAnchor?checkCitation(effective,selectedAnchor):false
 function jumpTo(citation:PageCitation){
  setActiveDocId(citation.documentId);setPageNo(citation.page);setActiveCitation(citation)
 }
 function downloadPdf(){
  if(!activeDoc)return
  const data=Uint8Array.from(activeDoc.bytes)
  const url=URL.createObjectURL(new Blob([data.buffer as ArrayBuffer],{type:'application/pdf'}))
  const link=document.createElement('a')
  link.href=url;link.download=activeDoc.name;link.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1500)
 }
 async function askAgent(){
  if(agent.mode==='running'||busy||stress!=='none')return
  if(window.location.hostname.endsWith('github.io')){
   setAgent({mode:'unavailable',draft:null,model:'',usage:'',
    message:'GitHub Pages ist statisch. Der echte Claude-Endpunkt läuft nur nach separater Freigabe auf einer sicheren Netlify-Bereitstellung.'})
   return
  }
  const run=sequence.current
  setAgent({mode:'running',draft:null,model:'',usage:'',message:'Modell prüft die drei öffentlich bekannten Beispieldokumente …'})
  try{
   const response=await fetch('/api/agent-claims',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({caseId}),cache:'no-store'
   })
   const data:unknown=await response.json()
   if(run!==sequence.current)return
   if(!response.ok)throw new Error('Live-Modell nicht freigegeben oder nicht erreichbar ('+response.status+').')
   if(!data||typeof data!=='object')throw new Error('Ungültige Modellantwort.')
   const payload=data as Record<string,unknown>
   if(payload.mode!=='live_model'){
    setAgent({mode:'rejected',draft:null,model:String(payload.model??''),usage:'',
      message:'Modellantwort wurde von der Quellenprüfung blockiert: '+String(payload.reason??'invalid output')})
    return
   }
   const verified=checkAgentDraft(payload.draft,sourcePackets(current))
   if(!verified.valid||!verified.accepted)throw new Error('Zitate sind nicht mit den Sample-Quellen vereinbar.')
   if(!verified.accepted.findings.every(f=>resolveExtractedCitation(documents,f.citation)))
    throw new Error('Mindestens ein Modellzitat konnte nicht im Original-PDF gefunden werden.')
   if(result.status.startsWith('STOP'))throw new Error('Deterministischer Sicherheitscheck blockiert die Modellantwort.')
   const usage=payload.usage as {inputTokens?:number;outputTokens?:number}|undefined
   setAgent({mode:'live',draft:verified.accepted,
     message:'Claude-Antwort durch Zitatvalidierung geprüft. Fachliche Richtigkeit bleibt offen.',
     model:String(payload.model??'Claude'),
     usage:usage?String(usage.inputTokens??'?')+' Input / '+String(usage.outputTokens??'?')+' Output-Tokens':''})
  }catch(e){
   if(run===sequence.current)setAgent({mode:'unavailable',draft:null,model:'',usage:'',
    message:e instanceof Error?e.message:'Modell nicht verfügbar. Kein Ergebnis behauptet.'})
  }
 }
 const onStatic=typeof window!=='undefined'&&window.location.hostname.endsWith('github.io')
 return <div className="mission">
  <a className="mission-skip" href="#mission-workspace">Zum Arbeitsbereich</a>
  <header className="mission-nav">
   <div className="mission-nav-content">
    <a className="mission-brand" href={import.meta.env.BASE_URL}><span className="mission-monogram">i</span><strong>INCA</strong><span> / CLAIM OPERATIONS LAB</span></a>
    <div className="mission-nav-links"><a href={import.meta.env.BASE_URL+'?lab=1'}>PDF-Lab ↗</a><a href={import.meta.env.BASE_URL+'?study=1'}>Reviewer-Studie ↗</a><a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">GitHub ↗</a><span>INDEPENDENT WORK SAMPLE / v0.4</span></div>
   </div>
  </header>
  <main>
   <section className="mission-hero">
    <div className="mission-hero-inner">
     <div className="mission-hero-copy">
      <span className="mission-eyebrow"><i/> THE 90-SECOND CLAIMS CHALLENGE</span>
      <h1>Automate the work.<br/><em>Own the outcome.</em></h1>
      <p>Ein realer Dokumentenfluss – aber fiktive Schadenfälle. Lies PDFs, verfolge jede Fundstelle, provoziere einen Fehler und prüfe, ob das System verantwortungsvoll stoppt.</p>
      <div className="mission-hero-bits"><span><b>01</b> ORIGINAL-PDF</span><span><b>02</b> VERIFIZIERBARE QUELLEN</span><span><b>03</b> HUMAN HANDOFF</span></div>
     </div>
     <div className="mission-hero-graphic" aria-label="Visualisierter Prozess von Dokument bis zur menschlichen Freigabe">
      <div className="mission-orbit orbit-one"/><div className="mission-orbit orbit-two"/>
      <div className="mission-orbit-centre"><span>∴</span><strong>PROVENANCE</strong><small>Every claim needs a source</small></div>
      <div className="mission-floating mission-float-a"><i>01</i><span>INTAKE</span><strong>PDF</strong></div>
      <div className="mission-floating mission-float-b"><i>02</i><span>EVIDENCE</span><strong>✓</strong></div>
      <div className="mission-floating mission-float-c"><i>03</i><span>HUMAN REVIEW</span><strong>↗</strong></div>
     </div>
    </div>
   </section>
   <section className="mission-numberline" aria-label="Nachprüfbare Projektdaten">
     <div><strong>40<span>/40</span></strong><small>Bestehende synthetische Regeln im Regressionstest*</small></div>
     <div><strong>3</strong><small>Vollständige / unvollständige Beispiel-Dossiers</small></div>
     <div><strong>0</strong><small>Auszahlungen, externe Nachrichten oder echte Schadenfälle</small></div>
     <div><strong>?</strong><small>Reale Arbeitsersparnis – noch ungemessen</small></div>
   </section>
   <section className="mission-pick" id="mission-workspace">
    <div className="mission-title"><span>01 / TRY IT YOURSELF</span><h2>Pick a case. Challenge the system.</h2><p>Jeder Test erzeugt echte PDF-Dateien, liest sie lokal wieder ein und verbindet prüfbare Textstellen mit der Originalseite.</p></div>
    <div className="mission-scenarios">
     {scenarios.map((s,i)=><button type="button" key={s.id} disabled={busy}
       className={caseId===s.id?'selected':''}
       aria-pressed={caseId===s.id} onClick={()=>void load(s.id)}>
       <span className="mission-scenario-head"><span>CASE {String(i+1).padStart(2,'0')}</span><span className="mission-scenario-indicator">{caseId===s.id?'●':'○'}</span></span>
       <strong>{s.label.replace(/^\d+ \/ /,'')}</strong><small>{s.tagline}</small>
       <span className="mission-scenario-foot">{s.id==='parking'?'⚠ REPARATURUMFANG':s.id==='water'?'✓ KEINE MARKIERTE ABWEICHUNG':'⨯ DOKUMENT FEHLT'}</span>
     </button>)}
    </div>
    {error&&<p role="alert" className="mission-alert">{error}</p>}
    {busy&&<p role="status" className="mission-sloading">PDFs werden generiert, extrahiert und aufbereitet …</p>}
   </section>
   <section className="mission-work" aria-label="Schadenarbeitsplatz">
    <aside className="mission-documents">
     <header><small>02 / THE DOSSIER</small><h3>Original documents</h3><p>Fiktive, herunterladbare PDFs – lokal extrahiert.</p></header>
     <div className="mission-file-list">
      {effective.map(d=><button type="button" key={d.id} aria-pressed={d.id===activeDoc?.id}
        className={d.id===activeDoc?.id?'active':''}
        onClick={()=>{setActiveDocId(d.id);setPageNo(1);setActiveCitation(null)}}>
        <span className="mission-pdf-icon">PDF</span><span><strong>{roleNames[d.role]}</strong><small>{d.name} · {d.pages.length} Seite(n)</small></span><span className="mission-file-arrow">↗</span></button>)}
      {!effective.length&&<p>Keine Unterlagen.</p>}
     </div>
     <div className="mission-sourcelist-title"><strong>SOURCE LEDGER</strong><small>{exact}/{citations.length} wortgleich</small></div>
     <div className="mission-sourcelist">
      {citations.map(c=><button type="button" key={c.id} className={activeCitation?.id===c.id?'active':''} onClick={()=>jumpTo(c)}>
        <span><b>{c.id}</b> {c.label} <small>p. {c.page}</small></span>
        <span>{c.quote.slice(0,83)}{c.quote.length>83?'…':''}</span></button>)}
     </div>
    </aside>
    <section className="mission-reader">
     <header><div><small>03 / ORIGINAL SIDE BY SIDE</small><h3>{activeDoc?.name??'PDF wird geladen'}</h3></div>
      <div className="mission-page-controls">
       <button type="button" aria-label="Vorherige PDF-Seite" disabled={page<=1} onClick={()=>{setPageNo(n=>n-1);setActiveCitation(null)}}>←</button>
       <span>{page} / {activeDoc?.pages.length??0}</span>
       <button type="button" aria-label="Nächste PDF-Seite" disabled={page>=(activeDoc?.pages.length??0)} onClick={()=>{setPageNo(n=>n+1);setActiveCitation(null)}}>→</button>
       <button type="button" aria-label="PDF herunterladen" disabled={!activeDoc} onClick={downloadPdf}>↓</button>
      </div>
     </header>
     <PageView document={activeDoc} page={page}/>
     <div className="mission-highlight">
      <div><span>EXACT PAGE SPAN</span><strong>{selectedAnchor?selectedAnchor.id+' · Seite '+selectedAnchor.page:'Quelle auswählen ↑'}</strong></div>
      <p>{selectedAnchor?validSelected?<>
       {currentText.slice(Math.max(0,selectedAnchor.offset-30),selectedAnchor.offset)}
       <mark>{selectedAnchor.quote}</mark>
       {currentText.slice(selectedAnchor.offset+selectedAnchor.quote.length,
         Math.min(currentText.length,selectedAnchor.offset+selectedAnchor.quote.length+42))}
      </>:<span className="mission-invalid">Textstelle manipuliert – keine gültige Fundstelle.</span>
       :'Klicke links auf einen Quellenbeleg. Sein exakter Text erscheint hier neben der echten PDF-Seite.'}</p>
     </div>
    </section>
    <aside className="mission-decision">
     <header><small>04 / THE OPERATOR DECISION</small><h3>Evidence before action.</h3></header>
     <div className="mission-verdict">
      <span>DETERMINISTISCHER SICHERHEITSCHECK</span><ShortStatus status={result.status}/>
      <p>{result.rationale}</p>
     </div>
     <div className="mission-review-steps">
      <div><span className={!result.missingRoles.length?'green':'red'}>{!result.missingRoles.length?'✓':'×'}</span><p><strong>Dokumenttypen vorhanden</strong><small>{result.missingRoles.length?'Fehlt: '+result.missingRoles.join(', '):'Meldung · Police · Rechnung'}</small></p></div>
      <div><span className={exact===citations.length&&exact>0?'green':'red'}>{exact===citations.length&&exact>0?'✓':'×'}</span><p><strong>Quellenanker wortgleich</strong><small>{exact} von {citations.length} lokalen Textspannen</small></p></div>
      <div><span className="amber">!</span><p><strong>Fachliche Richtigkeit</strong><small>Bis zur unabhängigen Begutachtung nicht belegt</small></p></div>
      <div><span className="red">×</span><p><strong>Automatische Regulierung</strong><small>Immer blockiert · Keine externen Aktionen</small></p></div>
     </div>
     <div className="mission-action"><span>NEXT BEST HUMAN ACTION</span><strong>{result.nextStep}</strong>
       <button type="button" disabled={busy} onClick={()=>setLocallyReviewed(true)}>
         {locallyReviewed?'✓ Als Demo geprüft':'Interne Prüfung simulieren'} <span>↗</span>
       </button><small>{locallyReviewed?'Nur als lokale Demo-Aktion markiert.':'Kein echter Fallstatus wird verändert.'}</small>
     </div>
     <div className="mission-model">
       <div><span>05 / OPTIONAL REAL MODEL</span><strong>Claude AI extractor</strong></div>
       <p>Der serverseitige Claude-Agent erhält ausschliesslich die drei öffentlichen Beispieldossiers. Seine Zitate werden unabhängig geprüft; über Auszahlung oder Ablehnung entscheidet er nie.</p>
       <button type="button" disabled={busy||stress!=='none'||agent.mode==='running'}
        onClick={()=>void askAgent()}>
        {agent.mode==='running'?'Agent wird geprüft …':'Live-Agent aufrufen'} <span>✳</span>
       </button>
       <p className="mission-model-status" role="status">
         <span className={agent.mode==='live'?'live':agent.mode==='running'?'waiting':'off'}/>
         {agent.mode==='idle'?onStatic?'Statische GitHub-Pages-Version · Serveragent nicht aktiviert.':agent.message:agent.message}
       </p>
       {agent.mode==='live'&&agent.draft&&<div className="mission-ai-findings">
         <small>{agent.model} · {agent.usage}</small>
         <h4>{agent.draft.summary}</h4>
         {agent.draft.findings.map((finding,i)=>{
          const anchor=packetAnchor(documents,finding.citation)
          return <button key={i} disabled={!anchor} type="button" onClick={()=>{if(anchor)jumpTo(anchor)}}>
           <span>BELEG {i+1} · {finding.citation.documentId} / S. {finding.citation.page}</span>
           <strong>{finding.label}</strong>
           <small>{finding.interpretation}</small>
           <em>{anchor?'Original öffnen ↗':'Quellenbeleg nicht auffindbar'}</em>
          </button>
         })}
       </div>}
     </div>
    </aside>
   </section>
   <section className="mission-stress">
    <div><span>06 / BREAK IT ON PURPOSE</span><h2>Can it say <em>stop?</em></h2><p>Provoziere einen Fehler. Wenn der Quellenbeleg fehlt oder verändert wird, muss die Entscheidungskette unterbrochen werden.</p></div>
    <div className="mission-stress-choices">
      {([{id:'none',name:'Normalbetrieb',detail:'Alle Dokumente unverändert'},
        {id:'no_invoice',name:'Rechnung entfernen',detail:'Primärquelle fehlt'},
        {id:'fabricated_quote',name:'Beleg manipulieren',detail:'Zitat stimmt nicht'}] as {id:Stress;name:string;detail:string}[]).map(x=><button type="button"
        key={x.id} className={stress===x.id?'active':''} aria-pressed={stress===x.id}
        onClick={()=>{setStress(x.id);setActiveCitation(null);setAgent(emptyAgent)}}>
        <strong>{x.name}</strong><small>{x.detail}</small></button>)}
      <div className="mission-stress-status"><span>RESULT</span><strong>{result.status.startsWith('STOP')?'STOP. Human review required.':'Human review remains required.'}</strong></div>
    </div>
   </section>
   <section className="mission-evaluation">
     <div className="mission-eval-copy"><span>07 / MEASURE THE REAL THING</span><h2>Tests are not<br/><em>business impact.</em></h2>
      <p>Wir machen den Unterschied ausdrücklich sichtbar: Unsere automatisch erzeugten Szenarien testen Schutzmechanismen, nicht die Genauigkeit eines KI-Modells auf unbekannten Versicherungsfällen.</p>
      <div className="mission-eval-link"><a href="https://github.com/mikelninh/inca-demo/actions" target="_blank" rel="noopener noreferrer">CI und Browser-Tests ansehen ↗</a><a href={import.meta.env.BASE_URL+'?study=1'}>Reviewer-Studie ansehen ↗</a></div>
     </div>
     <div className="mission-eval-score">
       <small>REPRODUCIBLE SCRIPTED REGRESSION</small>
       <div><strong>{regression.passed}</strong><span>/{regression.total}</span></div>
       <p>{regression.total-regression.passed} fehlgeschlagene vorgegebene Regel-Checks. {regression.criticalGateMisses} übersehene STOP-Fälle in der synthetischen Suite.</p>
       <div className="mission-eval-bars">{['Complete water file','Motor discrepancy','Missing document','Altered citation','Unreadable PDF page'].map(type=>{
        const items=regression.rows.filter(x=>x.category===type)
        const pass=items.filter(x=>x.passed).length
        return <div key={type}><span>{type}</span><div><span style={{width:(pass/items.length*100)+'%'}}/></div><strong>{pass}/{items.length}</strong></div>
       })}</div>
       <div className="mission-eval-truth"><span>NOT YET MEASURED</span><strong>0 unabhängige Expertenlabels · 0 reale Reviews · keine belegte Zeitersparnis</strong></div>
     </div>
   </section>
   <footer className="mission-footer"><span>INCA CLAIM OPERATIONS LAB</span><p>Independent work sample by Michael Ninh. Fictional cases only. Not affiliated with inca. No autonomous settlement.</p><a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">Open source ↗</a></footer>
  </main>
 </div>
}
