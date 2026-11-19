import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {ChangeEvent} from 'react'
import {createScenarioPdfs,scenarios} from '../doclab/samples'
import {MAX_PDF_BYTES,parsePdfBytes,drawPdfPage} from '../doclab/pdfReader'
import {checkCitation,sniffRole} from '../doclab/pdfEvidence'
import type {ParsedDocument,PageCitation,DocumentRole} from '../doclab/pdfEvidence'
import {allowedActions,exportDeskAudit,makeDeskCase,recordReview,reopenCase,retagDocument,reviewLabels,safeFileGroup,severityLabels,sortedQueue,summarizeDesk} from './deskCore'
import type {DeskCase,ReviewAction} from './deskCore'
import './desk.css'

type Pane='queue'|'source'|'decision'
type CaseFilter='all'|'exceptions'|'open'|'waiting'|'reviewed'
const roles:Record<DocumentRole,string>={claim:'Schadenmeldung',policy:'Vertrag / Police',invoice:'Rechnung',unknown:'Unbekannt'}
const demoNames:Record<string,string>={parking:'Parkrempler · Umfang prüfen',water:'Leitungswasser · Boden',burglary:'Einbruch · Beleg fehlt'}
const demoIds:Record<string,string>={parking:'KFZ-A17',water:'HR-B21',burglary:'HR-C09'}
const maxFiles=12
function formatDuration(ms:number){if(ms<=0)return '—';return ms<60_000?(ms/1000).toFixed(1).replace('.',',')+' s':(ms/60000).toFixed(1).replace('.',',')+' Min.'}
function downloadJson(data:unknown,name:string){
 const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'})
 const url=URL.createObjectURL(blob),a=document.createElement('a')
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()
 window.setTimeout(()=>URL.revokeObjectURL(url),900)
}
function riskTone(c:DeskCase){
 if(c.stage==='reviewed')return 'done'
 if(c.stage==='waiting')return 'waiting'
 return c.assessment.status.startsWith('STOP')?'stop':c.assessment.status==='REVIEW_READY'?'ready':'risk'
}
function PdfOriginal({document,page,quote,zoom}:{document:ParsedDocument|null;page:number;quote:PageCitation|null;zoom:number}){
 const canvas=useRef<HTMLCanvasElement>(null)
 const viewport=useRef<HTMLDivElement>(null)
 const [ready,setReady]=useState(false)
 const [error,setError]=useState('')
 const pageInfo=document?.pages.find(x=>x.page===page)
 const rects=useMemo(()=>{
  if(!document||!pageInfo||!quote||document.id!==quote.documentId||page!==quote.page)return []
  if(!checkCitation([document],quote))return []
  return (pageInfo.rects??[]).filter(r=>r.start<quote.offset+quote.quote.length&&r.end>quote.offset).slice(0,16)
 },[document,pageInfo,quote,page])
 useEffect(()=>{
  let stale=false
  setReady(false);setError('')
  if(!canvas.current||!document)return
  const node=canvas.current
  void drawPdfPage(document.bytes,page,node).then(()=>{if(!stale)setReady(true)}).catch(e=>{
   if(!stale)setError(e instanceof Error?e.message:'Original-PDF konnte nicht gerendert werden.')
  })
  return()=>{stale=true}
 },[document,page])
 useEffect(()=>{
  if(!ready||!rects.length||!viewport.current)return
  const el=viewport.current,stage=el.querySelector('.desk-page-stage')
  if(!stage)return
  const r=rects[0]
  const containerTop=(stage as HTMLElement).offsetTop
  const t=requestAnimationFrame(()=>el.scrollTo({
   top:Math.max(0,containerTop+(stage as HTMLElement).clientHeight*r.top-el.clientHeight*.35),
   left:Math.max(0,(stage as HTMLElement).clientWidth*r.left-el.clientWidth*.25),
   behavior:'smooth'
  }))
  return()=>cancelAnimationFrame(t)
 },[ready,rects,zoom])
 return <div className="desk-preview" ref={viewport} aria-label="Original-PDF" data-testid="desk-original-pdf">
  {document?<div className="desk-page-stage" style={{width:(zoom*100)+'%'}}>
   <canvas ref={canvas} aria-label={'Original-PDF Seite '+page}/>
   {ready&&rects.map((r,i)=><span key={i} className="desk-anchor-rect" aria-label="Verifizierte Originalfundstelle" role="img"
     style={{left:(r.left*100)+'%',top:(r.top*100)+'%',width:(r.width*100)+'%',height:(r.height*100)+'%'}}/>)}
   {!ready&&!error&&<p className="desk-pdf-state">Original-PDF wird gerendert …</p>}
   {error&&<p role="alert" className="desk-pdf-state">{error}</p>}
  </div>:<p className="desk-pdf-state">Kein Dokument ausgewählt.</p>}
 </div>
}
async function buildSyntheticDesk():Promise<DeskCase[]>{
 const mapped=await Promise.all(scenarios.map(async scenario=>{
  const result=await createScenarioPdfs(scenario.id)
  const documents:ParsedDocument[]=[]
  for(let i=0;i<result.docs.length;i++){
   const d=result.docs[i]
   documents.push(await parsePdfBytes(d.bytes,scenario.id+'-D'+(i+1),d.name,d.role,'generated_sample'))
  }
  return makeDeskCase(demoIds[scenario.id],demoNames[scenario.id],documents)
 }))
 return mapped
}
export default function OperatorDesk(){
 const [cases,setCases]=useState<DeskCase[]>([])
 const [selectedId,setSelectedId]=useState('KFZ-A17')
 const [docId,setDocId]=useState('')
 const [page,setPage]=useState(1)
 const [citationId,setCitationId]=useState('')
 const [note,setNote]=useState('')
 const [pane,setPane]=useState<Pane>('source')
 const [filter,setFilter]=useState<CaseFilter>('all')
 const [search,setSearch]=useState('')
 const [zoom,setZoom]=useState(1)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [inputRevision,setInputRevision]=useState(0)
 const loaded=useRef(false)
 const pending=useRef(0)
 const openedAt=useRef(performance.now())
 const selectedRef=useRef(selectedId)
 const files=useRef<HTMLInputElement|null>(null)
 const loadDemo=useCallback(async()=>{
  const ticket=++pending.current
  setBusy(true);setError('');setMessage('')
  try{
   const fresh=await buildSyntheticDesk()
   if(ticket!==pending.current)return
   setCases(fresh);setSelectedId('KFZ-A17');selectedRef.current='KFZ-A17'
   setPane('source');setFilter('all');setSearch('');setNote('')
   setInputRevision(x=>x+1)
   openedAt.current=performance.now()
  }catch(e){if(ticket===pending.current)setError(e instanceof Error?e.message:'Demofälle konnten nicht vorbereitet werden.')}
  finally{if(ticket===pending.current)setBusy(false)}
 },[])
 useEffect(()=>{
  if(loaded.current)return
  loaded.current=true
  void loadDemo()
  return()=>{pending.current++}
 },[loadDemo])
 const ordered=useMemo(()=>sortedQueue(cases),[cases])
 const counts=useMemo(()=>summarizeDesk(cases),[cases])
 const listed=useMemo(()=>ordered.filter(c=>{
  const needle=search.trim().toLowerCase()
  if(needle&&!([c.id,c.title].join(' ').toLowerCase().includes(needle)))return false
  if(filter==='exceptions')return c.stage==='open'&&c.assessment.status!=='REVIEW_READY'
  if(filter==='open')return c.stage==='open'
  return filter==='all'||c.stage===filter
 }),[ordered,filter,search])
 const selected=cases.find(c=>c.id===selectedId)??null
 useEffect(()=>{
  if(!selected)return
  const first=selected.documents[0]??null
  setDocId(first?.id??'');setPage(1)
  setCitationId(selected.citations.find(c=>c.documentId===first?.id)?.id??'')
  setNote('')
  openedAt.current=performance.now()
 },[selectedId,selected?.documents])
 // Review events must not reset page selection or the review clock; reclassifying a document intentionally does.
 // A separate effect triggered solely by selection handles opening time.
 const changeCase=(id:string)=>{
  if(id===selectedRef.current)return
  selectedRef.current=id
  setSelectedId(id);setDocId('');setPage(1);setCitationId('');setPane('source')
  openedAt.current=performance.now()
 }
 const doc=selected?.documents.find(d=>d.id===docId)??selected?.documents[0]??null
 const safePage=Math.max(1,Math.min(page,doc?.pages.length??1))
 const anchor=selected?.citations.find(c=>c.id===citationId&&c.documentId===doc?.id&&c.page===safePage)??null
 const validAnchor=selected&&anchor&&checkCitation(selected.documents,anchor)?anchor:null
 const actions=selected?allowedActions(selected):[]
 const nextOpen=ordered.find(c=>c.id!==selectedId&&c.stage==='open')??null
 async function ingest(event:ChangeEvent<HTMLInputElement>){
  const selectedFiles=Array.from(event.currentTarget.files??[])
  event.currentTarget.value=''
  if(!selectedFiles.length)return
  const ticket=++pending.current
  setBusy(true);setError('');setMessage('')
  try{
   if(selectedFiles.length>maxFiles)throw Error('Maximal 12 PDFs je Stapel, damit keine Dateien unbemerkt verloren gehen.')
   if(selectedFiles.some(f=>f.size>MAX_PDF_BYTES||f.size<10))throw Error('Jede Datei muss zwischen 10 Byte und 8 MB groß sein.')
   if(selectedFiles.some(f=>!(/\.pdf$/i.test(f.name)||f.type==='application/pdf')))throw Error('Nur PDF-Dateien werden verarbeitet.')
   const matches=selectedFiles.map(f=>safeFileGroup(f.name))
   if(matches.some(Boolean)&&matches.some(x=>!x))
    throw Error('Stapel gemischt: entweder ALLE Dateien mit CASE-104__... benennen oder ohne Fallkennung gemeinsam als einen Fall importieren.')
   const groups=new Map<string,File[]>()
   for(let i=0;i<selectedFiles.length;i++){
    const key=matches[i]??'UNGROUPED'
    groups.set(key,[...(groups.get(key)??[]),selectedFiles[i]])
   }
   // Keep a finite number of distinct claim groups to bound browser memory.
   if(groups.size>6)throw Error('Maximal sechs separate Dossiers gleichzeitig importieren.')
   const imported:DeskCase[]=[]
   let index=0
   for(const [key,group] of groups){
    const docs:ParsedDocument[]=[]
    for(let i=0;i<group.length;i++){
     const file=group[i],bytes=new Uint8Array(await file.arrayBuffer())
     docs.push(await parsePdfBytes(bytes,'FILE-'+(index+1)+'-'+(i+1),file.name,sniffRole(file.name),'user_upload'))
    }
    const id='LOCAL-'+String(Date.now()%100000)+'-'+(index+1)
    const title=key==='UNGROUPED'?'Importiertes Dossier':key+' · Import'
    imported.push(makeDeskCase(id,title,docs,'local_upload'))
    index++
   }
   if(ticket!==pending.current)return
   setCases(current=>[...current,...imported])
   changeCase(imported[0].id)
   setMessage(imported.length+' Dossier(s) lokal importiert. Dokumentarten prüfen: unbekannte Typen erfordern eine manuelle Zuordnung. Keine Daten übertragen.')
  }catch(e){if(ticket===pending.current)setError(e instanceof Error?e.message:'Import fehlgeschlagen.')}
  finally{if(ticket===pending.current)setBusy(false)}
 }
 function visitCitation(c:PageCitation){
  setDocId(c.documentId);setPage(c.page);setCitationId(c.id);setPane('source')
 }
 function submit(action:ReviewAction){
  if(!selected)return
  try{
   const observed=Math.max(0,Math.min(24*3600*1000,performance.now()-openedAt.current))
   const updated=recordReview(selected,action,note,observed)
   setCases(current=>current.map(c=>c.id===selected.id?updated:c))
   openedAt.current=performance.now()
   setMessage('Aktion protokolliert: '+reviewLabels[action]+'. Keine echte Nachricht verschickt, kein Versicherungsentscheid getroffen.')
   setNote('')
  }catch(e){setError(e instanceof Error?e.message:'Aktion nicht zulässig.')}
 }
 function openAgain(){
  if(!selected)return
  setCases(cs=>cs.map(c=>c.id===selected.id?reopenCase(c,'Menschlich wieder geöffnet'):c))
  openedAt.current=performance.now()
  setMessage('Fall erneut geöffnet. Bisherige Schritte bleiben im lokalen Audit erhalten.')
 }
 function changeRole(documentId:string,role:DocumentRole){
  if(!selected)return
  setCases(cs=>cs.map(c=>c.id===selected.id?retagDocument(c,documentId,role):c))
  setCitationId('');openedAt.current=performance.now()
  setMessage('Dokumentart geändert. Vorprüfung neu berechnet; frühere Freigaben wurden widerrufen.')
 }
 function exportAudit(){
  downloadJson(exportDeskAudit(cases),'claim-os-6-operator-audit.json')
  setMessage('Anonymisiertes Sitzungsprotokoll heruntergeladen – ohne Dokumentinhalte, Dateinamen und Freitextnotizen.')
 }
 return <div className="desk">
  <a href="#desk-main" className="desk-skip">Zum Operator-Arbeitsplatz</a>
  <header className="desk-topbar">
   <div className="desk-top-inner">
    <a href={import.meta.env.BASE_URL} className="desk-logo"><span className="desk-logo-icon">⌁</span><b>CLAIM<span>/</span>OS</b><small>6.0</small></a>
    <nav aria-label="Arbeitsbereiche">
     <a href={import.meta.env.BASE_URL} aria-current="page">Operator Desk</a>
     <a href={import.meta.env.BASE_URL+'?lab=1'}>Evidence Workbench</a>
     <a href={import.meta.env.BASE_URL+'?evaluation=1'}>Evaluation</a>
     <a href={import.meta.env.BASE_URL+'?ops=1'}>Control Tower</a>
    </nav>
    <div className="desk-demo-label"><span className="desk-live-dot"/> LOCAL RESEARCH · NO LIVE CLAIMS</div>
   </div>
  </header>
  <main id="desk-main">
   <section className="desk-welcome">
    <div>
     <div className="desk-eyebrow"><span className="desk-eyebrow-dot"/> THE OPERATOR WORKSPACE <span>· NOV 2026</span></div>
     <h1>Cases in. <em>Clarity out.</em></h1>
     <p>Dokumente automatisch vorprüfen. Ausnahmen zuerst. Originalbelege an einem Ort. Jede nächste Aktion bleibt in menschlicher Hand.</p>
    </div>
    <div className="desk-hero-actions">
     <button type="button" className="desk-upload-btn" onClick={()=>files.current?.click()} disabled={busy}><span aria-hidden="true">↑</span> PDFs als Stapel importieren</button>
     <input key={inputRevision} ref={files} type="file" accept=".pdf,application/pdf" multiple hidden onChange={e=>void ingest(e)} aria-label="Mehrere PDFs importieren"/>
     <button type="button" className="desk-reset" disabled={busy} onClick={()=>{
      if(cases.some(c=>c.source==='local_upload'||c.events.length)&&!window.confirm('Alle lokalen Dossiers, Notizen und Review-Einträge zurücksetzen?'))return
      void loadDemo()
     }}>Demo zurücksetzen ↺</button>
    </div>
   </section>
   <section className="desk-metrics" aria-label="Arbeitslisten-Status">
    <div><span>VORLIEGENDE FÄLLE</span><strong>{counts.total}</strong><small>Diese Browser-Sitzung</small></div>
    <div><span>OFFENE AUSNAHMEN</span><strong className="desk-metric-alert">{counts.exceptions}</strong><small>Manuell priorisiert</small></div>
    <div><span>BELEGE ANGEFORDERT</span><strong>{counts.waiting}</strong><small>Wartet auf neue Unterlagen</small></div>
    <div><span>ÜBERGEBEN</span><strong className="desk-metric-good">{counts.reviewed}</strong><small>Nur an menschliche Fachprüfung</small></div>
    <div className="desk-metric-time"><span>GEMESSENE FALLZEIT</span><strong>{formatDuration(counts.measuredActiveMs)}</strong><small>Bis zur Aktion · kein Zeitersparnis-Nachweis</small></div>
   </section>
   <div className="desk-context-bar">
    <div><span className="desk-green-pip"/> <strong>{busy?'Verarbeite Dokumente …':'Lokale Analyse bereit'}</strong><span>PDF.js · deterministische Regeln · unabhängige Seitenanker</span></div>
    <div><span>Synthetische Startfälle</span><b>03</b><i/> <span>Live-Modellaufrufe</span><b>00</b></div>
   </div>
   {error&&<div role="alert" className="desk-alert" onClick={()=>setError('')}>{error} <button type="button" onClick={()=>setError('')}>Schließen ×</button></div>}
   {message&&<div role="status" className="desk-message">{message} <button type="button" onClick={()=>setMessage('')}>×</button></div>}
   <div className="desk-mobile-nav" role="tablist" aria-label="Operator-Bereiche">
    <button type="button" role="tab" aria-selected={pane==='queue'} className={pane==='queue'?'selected':''} onClick={()=>setPane('queue')}>01 · Eingang</button>
    <button type="button" role="tab" aria-selected={pane==='source'} className={pane==='source'?'selected':''} onClick={()=>setPane('source')}>02 · Beleg</button>
    <button type="button" role="tab" aria-selected={pane==='decision'} className={pane==='decision'?'selected':''} onClick={()=>setPane('decision')}>03 · Aktion</button>
   </div>
   <section className={'desk-work desk-pane-'+pane}>
    <aside className="desk-queue" aria-label="Schadenfall-Warteschlange">
     <div className="desk-panel-head">
      <div><span>01 / WORK QUEUE</span><h2>Eingang <small>{cases.length}</small></h2></div>
      <button type="button" onClick={()=>{setFilter('all');setSearch('')}} title="Filter zurücksetzen">↻</button>
     </div>
     <div className="desk-queue-tools">
      <label className="desk-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Fall suchen …" aria-label="Fall suchen" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <div className="desk-filter-chips" role="group" aria-label="Filter">
       {([{value:'all',label:'Alle'},{value:'exceptions',label:'Ausnahmen'},{value:'waiting',label:'Wartet'},{value:'reviewed',label:'Erledigt'}] as {value:CaseFilter;label:string}[]).map(x=>
        <button type="button" key={x.value} aria-pressed={filter===x.value} onClick={()=>setFilter(x.value)}>{x.label}</button>)}
      </div>
     </div>
     <div className="desk-queue-list">
      {listed.length?listed.map(c=><button type="button" className={'desk-case '+(selected?.id===c.id?'is-selected':'')} key={c.id} onClick={()=>changeCase(c.id)}>
       <span className="desk-case-top"><b>{c.id}</b><i className={'desk-severity-dot '+riskTone(c)}/></span>
       <strong>{c.title}</strong>
       <span className="desk-case-bottom"><small>{c.documents.length} Dokumente</small><small className={'desk-priority '+riskTone(c)}>{c.stage==='reviewed'?'Übergeben':c.stage==='waiting'?'Warten':severityLabels[c.assessment.status]}</small></span>
      </button>):<p className="desk-empty">Keine Fälle unter diesem Filter.</p>}
     </div>
     <div className="desk-queue-foot"><b>PRIORITY ENGINE</b><p>Kritische Quellenlücken vor prüfbereiten Fällen. Keine automatische Entscheidung über den Versicherungsschutz.</p></div>
    </aside>
    <section className="desk-source" aria-label="Originaldokument und Fundstellen">
     {selected&&doc?<><div className="desk-panel-head desk-source-head">
      <div><span>02 / EVIDENCE READER <i>·</i> {selected.id}</span><h2>Original &amp; Belege</h2></div>
      <span className={'desk-status-label '+riskTone(selected)}>{severityLabels[selected.assessment.status]}</span>
     </div>
     <div className="desk-document-strip" role="group" aria-label="Dokumente wählen">
      {selected.documents.map(d=><button key={d.id} type="button" className={doc.id===d.id?'current':''} onClick={()=>{setDocId(d.id);setPage(1);setCitationId(selected.citations.find(c=>c.documentId===d.id)?.id??'')}}>
       <span aria-hidden="true">▤</span><strong>{roles[d.role]}</strong><small>{d.pages.length} S.</small>
      </button>)}
     </div>
     <div className="desk-pdf-toolbar">
       <span title={doc.name}>{doc.name}</span>
       <div className="desk-page-controls"><button type="button" aria-label="Vorherige PDF-Seite" disabled={safePage===1} onClick={()=>{setPage(p=>p-1);setCitationId('')}}>‹</button><b>{safePage} / {doc.pages.length}</b><button type="button" aria-label="Nächste PDF-Seite" disabled={safePage>=doc.pages.length} onClick={()=>{setPage(p=>p+1);setCitationId('')}}>›</button></div>
       <div className="desk-zoom"><button type="button" aria-label="PDF verkleinern" disabled={zoom<=.75} onClick={()=>setZoom(v=>Math.max(.75,v-.25))}>−</button><output>{Math.round(zoom*100)}%</output><button type="button" aria-label="PDF vergrößern" disabled={zoom>=2} onClick={()=>setZoom(v=>Math.min(2,v+.25))}>+</button></div>
     </div>
     <PdfOriginal document={doc} page={safePage} quote={validAnchor} zoom={zoom}/>
     <div className="desk-citations">
      <div className="desk-citation-heading"><span>QUELLENANKER <b>{selected.citations.length}</b></span><small>{selected.assessment.validCitations}/{selected.assessment.totalCitations} wortgleich</small></div>
      <div className="desk-citation-list">
       {selected.citations.length?selected.citations.map(c=><button key={c.id} type="button" className={citationId===c.id?'current':''} onClick={()=>visitCitation(c)}>
        <span className="desk-cite-dot"/><span><strong>{c.label}</strong><small>{c.id} · {roles[c.role]} · S. {c.page}</small></span><b>{checkCitation(selected.documents,c)?'↗':'!'}</b>
       </button>):<p className="desk-empty">Keine lesbaren Seitenanker. Manuelle Prüfung erforderlich.</p>}
      </div>
      <div className="desk-citation-quote">
       {validAnchor?<><span>VERIFIZIERTE WÖRTLICHE FUNDSTELLE</span><p>„{validAnchor.quote}“</p></>:
         <><span>KEINE GÜLTIGE FUNDSTELLE</span><p>Wähle eine geprüfte Quelle; Dokumentinhalt allein ist kein Deckungsnachweis.</p></>}
      </div>
     </div>
     </>:<div className="desk-loading">{busy?'Originaldokumente werden eingelesen …':'Kein Fall ausgewählt.'}</div>}
    </section>
    <aside className="desk-decision" aria-label="Menschliche Entscheidung">
     {selected?<><div className="desk-panel-head"><div><span>03 / DECISION SUPPORT</span><h2>Nächste Aktion</h2></div><span className="desk-human-label">HUMAN IN CONTROL</span></div>
      <div className={'desk-decision-card '+riskTone(selected)}>
       <div className="desk-decision-overline"><span className={'desk-alert-icon '+riskTone(selected)}>{selected.assessment.status==='REVIEW_READY'?'✓':'!'}</span><small>TECHNISCHER PRÜFSTATUS</small></div>
       <h3>{selected.assessment.headline}</h3>
       <p>{selected.assessment.rationale}</p>
      </div>
      <div className="desk-next-action"><span>EMPFOHLENER NÄCHSTER SCHRITT</span><p>{selected.assessment.nextStep}</p></div>
      <div className="desk-checks">
       <div><span className={selected.assessment.missingRoles.length?'fail':'pass'}>{selected.assessment.missingRoles.length?'×':'✓'}</span><p><b>Pflichtdokumente</b><small>{selected.assessment.missingRoles.length?'Es fehlen: '+selected.assessment.missingRoles.map(x=>roles[x]).join(', '):'Meldung, Vertrag, Rechnung vorhanden'}</small></p></div>
       <div><span className={selected.assessment.scannedOrEmptyPages?'fail':'pass'}>{selected.assessment.scannedOrEmptyPages?'×':'✓'}</span><p><b>Lesbarkeit</b><small>{selected.assessment.scannedOrEmptyPages?selected.assessment.scannedOrEmptyPages+' Seiten ohne Text':'Alle vorhandenen Seiten lesbar'}</small></p></div>
       <div><span className={selected.assessment.validCitations!==selected.assessment.totalCitations||!selected.assessment.totalCitations?'fail':'pass'}>{selected.assessment.validCitations!==selected.assessment.totalCitations||!selected.assessment.totalCitations?'×':'✓'}</span><p><b>Original-Fundstellen</b><small>{selected.assessment.validCitations} / {selected.assessment.totalCitations} exakt verifiziert</small></p></div>
       <div><span className="hold">→</span><p><b>Fachliche Prüfung</b><small>Bleibt beim Menschen; nicht automatisch entschieden</small></p></div>
      </div>
      <div className="desk-role-editor"><details><summary>Dokumentarten korrigieren</summary><p>Eine Änderung startet die Vorprüfung neu und öffnet bereits bearbeitete Fälle wieder.</p>
       {selected.documents.map(d=><label key={d.id}><span title={d.name}>{d.name}</span><select value={d.role} aria-label={'Dokumentart für '+d.name} onChange={e=>changeRole(d.id,e.target.value as DocumentRole)}>
        {Object.entries(roles).map(([key,name])=><option key={key} value={key}>{name}</option>)}
       </select></label>)}
      </details></div>
      <div className="desk-action-form">
       <label htmlFor="desk-review-note">OPERATOREN-NOTIZ <span>· optional, nur in dieser Sitzung</span></label>
       <textarea id="desk-review-note" rows={3} value={note} maxLength={600} onChange={e=>setNote(e.target.value)} placeholder="Was muss der nächste Mensch wissen?"/>
       {selected.stage==='reviewed'?<div className="desk-action-locked"><strong>✓ An Fachprüfung übergeben</strong><p>Keine Zahlung oder Ablehnung erfolgt. Du kannst die Akte für Korrekturen erneut öffnen.</p><button type="button" onClick={openAgain}>Fall erneut öffnen</button>{nextOpen&&<button type="button" className="desk-next-case" onClick={()=>changeCase(nextOpen.id)}>Nächsten offenen Fall →</button>}</div>:<>
        {selected.stage==='waiting'?<div className="desk-action-locked"><strong>⏳ Wartet auf weitere Unterlagen</strong><p>Die Dokumentenanforderung ist nur lokal protokolliert. Wurde Material ergänzt, öffne den Fall erneut.</p><button type="button" onClick={openAgain}>Fall erneut öffnen</button>{nextOpen&&<button type="button" className="desk-next-case" onClick={()=>changeCase(nextOpen.id)}>Nächsten offenen Fall →</button>}</div>:<div className="desk-action-buttons">
         {actions.includes('ready_for_expert')&&<button type="button" className="desk-action-primary" onClick={()=>submit('ready_for_expert')}>✓ Zur Fachprüfung <span>↗</span></button>}
         {actions.includes('refer_specialist')&&<button type="button" className="desk-action-primary" onClick={()=>submit('refer_specialist')}>→ An Spezialist:in <span>↗</span></button>}
         {actions.includes('request_documents')&&<button type="button" className="desk-action-secondary" onClick={()=>submit('request_documents')}>＋ Unterlagen nachfordern</button>}
        </div>}
       </>}
       <small className="desk-action-safety">Keine E-Mail wird versendet. Es findet keine automatisierte Regulierung statt.</small>
      </div>
      <div className="desk-review-history">
       <div><span>REVIEW HISTORY</span><b>{selected.events.length}</b></div>
       {selected.events.length?selected.events.slice().reverse().map((e,i)=><p key={i}><span>{e.kind==='reopened'?'↺':e.action==='request_documents'?'＋':'✓'}</span><b>{e.kind==='reopened'?'Wieder geöffnet':e.action?reviewLabels[e.action]:'Review'}</b><small>{e.kind==='review'?formatDuration(e.durationMs):'Neubewertung'}</small></p>):
        <p className="desk-no-history">Noch keine menschliche Aktion protokolliert.</p>}
      </div>
     </>:<div className="desk-loading">Prüfung wird vorbereitet …</div>}
    </aside>
   </section>
   <section className="desk-bottom">
    <div><span>04 / AUDIT & RESPONSIBILITY</span><h2>Was wurde wirklich erledigt?</h2><p>Jede Entscheidung wird lokal protokolliert. Exportiert werden nur pseudonyme Fallnummern, Belegzahlen, Status und Bearbeitungsdauer – keine PDF-Inhalte, Dateinamen oder Freitextnotizen.</p></div>
    <button type="button" onClick={exportAudit} disabled={!cases.length}>Sitzungsbericht exportieren <span>↓</span></button>
   </section>
   <footer className="desk-footer"><strong>CLAIM <span>/</span> OS 6.0</strong><span>Research prototype · No live integrations · No AI model calls · Not affiliated with inca</span><a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">Code & Tests ↗</a></footer>
  </main>
 </div>
}
