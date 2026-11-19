import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {ChangeEvent} from 'react'
import {createScenarioPdfs,scenarios} from '../doclab/samples'
import {parsePdfBytes,MAX_PDF_BYTES} from '../doclab/pdfReader'
import {checkCitation,sniffRole} from '../doclab/pdfEvidence'
import type {DocumentRole,ParsedDocument,PageCitation} from '../doclab/pdfEvidence'
import {allowedActions,appendDocuments,exportDeskAudit,makeDeskCase,recordReview,reopenCase,retagDocument,reviewLabels,safeFileGroup,severityLabels,sortedQueue,summarizeDesk} from '../desk/deskCore'
import type {DeskCase,ReviewAction} from '../desk/deskCore'
import QuietPdf from './QuietPdf'
import {caseCopy,caseTone,firstSource} from './quietCopy'
import './quiet.css'

const roles:Record<DocumentRole,string>={claim:'Schadenmeldung',policy:'Vertrag',invoice:'Rechnung',unknown:'Ohne Zuordnung'}
const ids:Record<string,string>={parking:'KFZ-A17',water:'HR-B21',burglary:'HR-C09'}
const names:Record<string,string>={parking:'Parkrempler · Umfang prüfen',water:'Leitungswasser · Boden',burglary:'Einbruch · Nachweis fehlt'}
type Filter='all'|'open'|'waiting'|'reviewed'
const tabs:{id:Filter;name:string}[]=[
 {id:'all',name:'Alle'},{id:'open',name:'Offen'},{id:'waiting',name:'Wartet'},{id:'reviewed',name:'Übergeben'}
]
function saveAudit(cases:DeskCase[]){
 const url=URL.createObjectURL(new Blob([JSON.stringify(exportDeskAudit(cases),null,2)+'\n'],{type:'application/json'}))
 const a=document.createElement('a')
 a.href=url;a.download='claim-os-9-session-audit.json';document.body.appendChild(a);a.click();a.remove()
 window.setTimeout(()=>URL.revokeObjectURL(url),900)
}
async function createDemoCases():Promise<DeskCase[]>{
 return Promise.all(scenarios.map(async s=>{
  const files=await createScenarioPdfs(s.id),documents:ParsedDocument[]=[]
  for(let i=0;i<files.docs.length;i++){
   const f=files.docs[i]
   documents.push(await parsePdfBytes(f.bytes,s.id+'-DOC-'+(i+1),f.name,f.role,'generated_sample'))
  }
  return makeDeskCase(ids[s.id],names[s.id],documents)
 }))
}
type PdfControlsProps={
 current:ParsedDocument|null;page:number;zoom:number;
 onPage:(value:number)=>void;onZoom:(value:number)=>void;
}
function PdfControls({current,page,zoom,onPage,onZoom}:PdfControlsProps){
 const total=current?.pages.length??1
 return <div className="quiet-page-controls" role="group" aria-label="PDF-Seite und Vergrößerung">
  <button type="button" aria-label="Vorherige PDF-Seite" disabled={page<=1} onClick={()=>onPage(Math.max(1,page-1))}>‹</button>
  <output aria-label="Aktuelle Seite">{page} <span>/ {total}</span></output>
  <button type="button" aria-label="Nächste PDF-Seite" disabled={page>=total} onClick={()=>onPage(Math.min(total,page+1))}>›</button>
  <i aria-hidden="true"/>
  <button type="button" aria-label="PDF verkleinern" disabled={zoom<=.75} onClick={()=>onZoom(Math.max(.75,zoom-.25))}>−</button>
  <output aria-label="Vergrößerung">{Math.round(zoom*100)}%</output>
  <button type="button" aria-label="PDF vergrößern" disabled={zoom>=2} onClick={()=>onZoom(Math.min(2,zoom+.25))}>+</button>
 </div>
}
export default function QuietWorkspace(){
 const [cases,setCases]=useState<DeskCase[]>([])
 const [caseId,setCaseId]=useState('KFZ-A17')
 const [docId,setDocId]=useState('')
 const [page,setPage]=useState(1)
 const [citationId,setCitationId]=useState('')
 const [zoom,setZoom]=useState(1)
 const [filter,setFilter]=useState<Filter>('all')
 const [search,setSearch]=useState('')
 const [note,setNote]=useState('')
 const [sidebarOpen,setSidebarOpen]=useState(false)
 const [fullPdf,setFullPdf]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [revision,setRevision]=useState(0)
 const started=useRef(performance.now())
 const pending=useRef(0)
 const upload=useRef<HTMLInputElement>(null)
 const add=useRef<HTMLInputElement>(null)
 const closeFull=useRef<HTMLButtonElement>(null)
 const openFull=useRef<HTMLButtonElement>(null)
 const loadDemo=useCallback(async()=>{
  const ticket=++pending.current
  setBusy(true);setNotice('');setError('')
  try{
   const generated=await createDemoCases()
   if(ticket!==pending.current)return
   setCases(generated);setCaseId('KFZ-A17');setDocId('');setCitationId('');setPage(1)
   setZoom(1);setFilter('all');setSearch('');setNote('');setRevision(v=>v+1)
   setSidebarOpen(false);setFullPdf(false);started.current=performance.now()
  }catch(e){if(ticket===pending.current)setError(e instanceof Error?e.message:'Beispielfälle konnten nicht geladen werden.')}
  finally{if(ticket===pending.current)setBusy(false)}
 },[])
 useEffect(()=>{
  void loadDemo()
  return()=>{pending.current++}
 },[loadDemo])
 const queue=useMemo(()=>sortedQueue(cases),[cases])
 const counts=useMemo(()=>summarizeDesk(cases),[cases])
 const selected=cases.find(c=>c.id===caseId)??null
 const intro=selected?caseCopy(selected):null
 const tone=selected?caseTone(selected):'waiting'
 const selectedDoc=selected?.documents.find(d=>d.id===docId)??selected?.documents[0]??null
 const currentPage=Math.max(1,Math.min(page,selectedDoc?.pages.length??1))
 const active=selected?.citations.find(c=>c.id===citationId&&c.documentId===selectedDoc?.id&&c.page===currentPage)??null
 const valid=selected&&active&&checkCitation(selected.documents,active)?active:null
 const available=selected?allowedActions(selected):[]
 const next=queue.find(c=>c.id!==caseId&&c.stage==='open')??null
 const displayedQueue=queue.filter(c=>{
  if(filter!=='all'&&c.stage!==filter)return false
  const q=search.trim().toLowerCase()
  return !q||(c.id+' '+c.title).toLowerCase().includes(q)
 })
 const statusText=selected?.stage==='reviewed'?'An Fachprüfung übergeben':selected?.stage==='waiting'?'Wartet auf Dokumente':selected?severityLabels[selected.assessment.status]:'Wird geladen'
 useEffect(()=>{
  if(!selected)return
  const source=firstSource(selected),fallback=selected.documents[0]
  setDocId(source?.documentId??fallback?.id??'')
  setPage(source?.page??1);setCitationId(source?.id??'')
  setZoom(1);setNote('');started.current=performance.now()
 },[caseId,selected?.documents])
 useEffect(()=>{
  if(fullPdf)closeFull.current?.focus()
 },[fullPdf])
 useEffect(()=>{
  if(!fullPdf&&!sidebarOpen)return
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){setFullPdf(false);setSidebarOpen(false)}
  }
  window.addEventListener('keydown',onKey)
  return()=>window.removeEventListener('keydown',onKey)
 },[fullPdf,sidebarOpen])
 function chooseCase(id:string){
  if(id!==caseId){setCaseId(id);setDocId('');setCitationId('');setPage(1);started.current=performance.now()}
  setSidebarOpen(false);setNotice('')
 }
 function chooseDocument(id:string){
  setDocId(id);setPage(1)
  const cite=selected?.citations.find(c=>c.documentId===id&&checkCitation(selected.documents,c))
  setCitationId(cite?.id??'')
 }
 function chooseSource(c:PageCitation){
  setDocId(c.documentId);setPage(c.page);setCitationId(c.id)
 }
 function setNewPage(n:number){setPage(n);setCitationId('')}
 function review(action:ReviewAction){
  if(!selected)return
  try{
   const ms=Math.min(24*3600*1000,Math.max(0,performance.now()-started.current))
   const updated=recordReview(selected,action,note,ms)
   setCases(cs=>cs.map(c=>c.id===selected.id?updated:c))
   setNote('');setNotice(reviewLabels[action]+': lokal protokolliert. Keine Nachricht versendet und kein Anspruch entschieden.')
   started.current=performance.now()
  }catch(e){setError(e instanceof Error?e.message:'Aktion blockiert.')}
 }
 function reopen(){
  if(!selected)return
  setCases(cs=>cs.map(c=>c.id===selected.id?reopenCase(c,'Manuell erneut geöffnet'):c))
  started.current=performance.now();setNotice('Fall erneut geöffnet, ursprüngliche Review-Einträge bleiben erhalten.')
 }
 function retag(id:string,role:DocumentRole){
  if(!selected)return
  setCases(cs=>cs.map(c=>c.id===selected.id?retagDocument(c,id,role):c))
  setNotice('Dokumentart korrigiert. Alle Quellen erneut geprüft, bisheriger Übergabestatus aufgehoben.')
 }
 async function importFiles(event:ChangeEvent<HTMLInputElement>){
  const files=Array.from(event.currentTarget.files??[]);event.currentTarget.value=''
  if(!files.length)return
  const ticket=++pending.current
  setBusy(true);setError('');setNotice('')
  try{
   if(files.length>12)throw Error('Maximal 12 PDF-Dateien pro Stapel.')
   if(files.some(f=>f.size<10||f.size>MAX_PDF_BYTES||(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf')))
    throw Error('Nur PDFs zwischen 10 Byte und 8 MB sind zulässig.')
   const groups=files.map(f=>safeFileGroup(f.name))
   if(groups.some(Boolean)&&groups.some(g=>!g))
    throw Error('Entweder alle Dateien als CASE-104__Datei.pdf benennen oder alle ohne Fallkennung importieren.')
   const byCase=new Map<string,File[]>()
   files.forEach((f,i)=>{const key=groups[i]??'OHNE-KENNUNG';byCase.set(key,[...(byCase.get(key)??[]),f])})
   if(byCase.size>6)throw Error('Maximal sechs Dossiers pro Import.')
   const imported:DeskCase[]=[]
   let idx=0
   for(const [group,items] of byCase){
    const docs:ParsedDocument[]=[]
    for(let j=0;j<items.length;j++){
     const f=items[j],bytes=new Uint8Array(await f.arrayBuffer())
     docs.push(await parsePdfBytes(bytes,'FILE-'+Date.now()+'-'+idx+'-'+j,f.name,sniffRole(f.name),'user_upload'))
    }
    imported.push(makeDeskCase('LOCAL-'+Date.now()+'-'+idx,group==='OHNE-KENNUNG'?'Eigenes Dossier':group+' · Import',docs,'local_upload'))
    idx++
   }
   if(ticket!==pending.current)return
   setCases(cs=>[...cs,...imported]);chooseCase(imported[0].id);setCaseId(imported[0].id)
   setNotice(imported.length+' Dossier(s) lokal importiert. Bitte Dokumentarten vor der fachlichen Prüfung kontrollieren.')
  }catch(e){if(ticket===pending.current)setError(e instanceof Error?e.message:'PDF-Import fehlgeschlagen.')}
  finally{if(ticket===pending.current)setBusy(false)}
 }
 async function attach(event:ChangeEvent<HTMLInputElement>){
  const files=Array.from(event.currentTarget.files??[]);event.currentTarget.value=''
  if(!files.length||!selected)return
  const ticket=++pending.current,key=selected.id
  setBusy(true);setError('');setNotice('')
  try{
   if(files.length>4||selected.documents.length+files.length>12)
    throw Error('Maximal 4 neue und insgesamt 12 Dateien pro Dossier.')
   const additions:ParsedDocument[]=[]
   for(let j=0;j<files.length;j++){
    const f=files[j]
    if(f.size<10||f.size>MAX_PDF_BYTES||(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'))
     throw Error('Nur gültige PDFs von maximal 8 MB.')
    additions.push(await parsePdfBytes(new Uint8Array(await f.arrayBuffer()),'ADDED-'+Date.now()+'-'+j,f.name,sniffRole(f.name),'user_upload'))
   }
   if(ticket!==pending.current)return
   setCases(cs=>cs.map(c=>c.id===key?appendDocuments(c,additions):c))
   started.current=performance.now()
   setNotice('Neue Dokumente ergänzt. Quellenprüfung wiederholt; der Fall wurde erneut geöffnet.')
  }catch(e){if(ticket===pending.current)setError(e instanceof Error?e.message:'Datei konnte nicht ergänzt werden.')}
  finally{if(ticket===pending.current)setBusy(false)}
 }
 const primaryAction:ReviewAction|null=selected?.stage!=='open'?null:
  selected?.assessment.status==='REVIEW_READY'?'ready_for_expert':
  selected?.assessment.status==='STOP_MISSING_SOURCE'||selected?.assessment.status==='REQUEST_EVIDENCE'||selected?.assessment.status==='STOP_UNREADABLE'||selected?.assessment.status==='STOP_CITATION_INVALID'?'request_documents':'refer_specialist'
 const primaryLabel=primaryAction==='ready_for_expert'?'Zur Fachprüfung übergeben':
  primaryAction==='request_documents'?'Unterlagen nachfordern':'An Spezialist:in übergeben'
 return <div className="quiet">
  <a href="#quiet-content" className="quiet-skip">Zur Fallbearbeitung springen</a>
  <header className="quiet-topbar">
   <a href={import.meta.env.BASE_URL} className="quiet-brand" aria-label="CLAIM OS – Quiet Workspace">
    <span className="quiet-brand-symbol" aria-hidden="true">◇</span><strong>CLAIM<span> / </span>OS</strong>
   </a>
   <span className="quiet-version">9.0 <span>Quiet Workspace</span></span>
   <span className="quiet-top-spacer"/>
   <span className="quiet-local"><i/> LOKALE DEMO</span>
   <a className="quiet-previous" href={import.meta.env.BASE_URL+'?v8=1'}>v8 vergleichen ↗</a>
   <button className="quiet-mobile-menu" type="button" onClick={()=>setSidebarOpen(true)} aria-label="Arbeitsliste öffnen">☰ <span>Fälle</span></button>
  </header>
  <div className="quiet-body">
   {sidebarOpen&&<button type="button" className="quiet-sidebar-backdrop" aria-label="Arbeitsliste schließen" onClick={()=>setSidebarOpen(false)}/>}
   <aside className={'quiet-sidebar'+(sidebarOpen?' is-open':'')} aria-label="Arbeitsliste">
    <div className="quiet-sidebar-heading">
     <div><span className="quiet-overline">ARBEITSPLATZ</span><h2>Fälle <span>{counts.total}</span></h2></div>
     <button className="quiet-mobile-close" type="button" aria-label="Arbeitsliste schließen" onClick={()=>setSidebarOpen(false)}>×</button>
    </div>
    <button type="button" className="quiet-import" disabled={busy} onClick={()=>upload.current?.click()}><span>＋</span> PDFs importieren</button>
    <input type="file" multiple hidden key={revision} accept=".pdf,application/pdf" ref={upload} aria-label="Mehrere PDFs importieren" onChange={e=>void importFiles(e)}/>
    <label className="quiet-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Fall suchen" aria-label="Fall suchen" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="quiet-filters" role="group" aria-label="Fallfilter">
     {tabs.map(t=><button type="button" key={t.id} aria-pressed={filter===t.id} onClick={()=>setFilter(t.id)}>{t.name}</button>)}
    </div>
    <div className="quiet-case-list" aria-label="Fälle">
     {displayedQueue.map(c=><button type="button" key={c.id} className={'quiet-case '+(c.id===caseId?'is-selected':'')} aria-current={c.id===caseId?'true':undefined} onClick={()=>chooseCase(c.id)}>
      <span className="quiet-case-first"><span><i className={'quiet-dot '+caseTone(c)}/><b>{c.id}</b></span><small>{c.documents.length} PDF</small></span>
      <strong>{c.title}</strong>
      <span className="quiet-case-status">{c.stage==='reviewed'?'Übergeben':c.stage==='waiting'?'Wartet auf Unterlagen':severityLabels[c.assessment.status]}</span>
     </button>)}
     {!displayedQueue.length&&<p className="quiet-empty">Keine Fälle für diesen Filter.</p>}
    </div>
    <div className="quiet-side-footer">
     <p><b>{counts.unresolved}</b> offene Fälle · <b>{counts.waiting}</b> warten</p>
     <button type="button" onClick={()=>saveAudit(cases)} disabled={!cases.length}>Sitzungsbericht exportieren <span>↗</span></button>
     <button type="button" className="quiet-reset" disabled={busy} onClick={()=>{
      if(cases.some(c=>c.source==='local_upload'||c.events.length)&&!window.confirm('Lokale Dossiers, Notizen und Review-Verlauf zurücksetzen?'))return
      void loadDemo()
     }}>Demo zurücksetzen ↺</button>
    </div>
   </aside>
   <main className="quiet-content" id="quiet-content">
    {error&&<div role="alert" className="quiet-alert">{error}<button type="button" aria-label="Fehler schließen" onClick={()=>setError('')}>×</button></div>}
    {notice&&<div role="status" className="quiet-notice">{notice}<button type="button" aria-label="Hinweis schließen" onClick={()=>setNotice('')}>×</button></div>}
    {selected&&intro?<div className="quiet-case-heading">
     <div className="quiet-case-strap"><span>FALL {selected.id}</span><span className={'quiet-status-pill '+tone}><i className={'quiet-dot '+tone}/>{statusText}</span></div>
     <h1>{intro.heading}</h1>
     <p>{intro.description}</p>
    </div>:<div className="quiet-case-heading"><h1>Die Akte wird vorbereitet.</h1><p>{busy?'Originale werden lokal eingelesen …':'Bitte einen Fall öffnen.'}</p></div>}
    {selected&&intro&&<div className="quiet-workspace">
     <section className="quiet-evidence" aria-label="Originaldokumente">
      <div className="quiet-panel-top">
       <div><span className="quiet-overline">ORIGINALQUELLEN</span><h2>Dokumente <span>{selected.documents.length}</span></h2></div>
       <button type="button" className="quiet-fullscreen" ref={openFull} onClick={()=>setFullPdf(true)} aria-label="Original-PDF im Vollbild öffnen">Vollbild <span>↗</span></button>
      </div>
      <div className="quiet-document-tabs" role="group" aria-label="Dokument auswählen">
       {selected.documents.map(d=><button type="button" key={d.id} aria-pressed={selectedDoc?.id===d.id} onClick={()=>chooseDocument(d.id)}>{roles[d.role]}</button>)}
      </div>
      <div className="quiet-docbar">
       <span title={selectedDoc?.name}>{selectedDoc?.name??'Kein PDF gewählt'}</span>
       <PdfControls current={selectedDoc} page={currentPage} zoom={zoom} onPage={setNewPage} onZoom={setZoom}/>
      </div>
      <QuietPdf key={caseId+'-'+(selectedDoc?.id??'none')+'-'+currentPage} document={selectedDoc} page={currentPage} citation={valid} zoom={zoom} caseId={caseId}/>
      <div className="quiet-docfoot"><span><i className="quiet-source-mark"/> PDF-Original · lokal verarbeitet</span><span>{valid?'Textstelle im Original gefunden':'Keine Textstelle ausgewählt'}</span></div>
     </section>
     <section className="quiet-findings" aria-label="Befund und nächste Handlung">
      <div className="quiet-findings-top"><span className="quiet-overline">FACHLICHE VORPRÜFUNG</span><span className={'quiet-finding-tag '+tone}>{intro.label}</span></div>
      <h2>{intro.finding}</h2>
      <div className="quiet-finding-context">{selected.assessment.rationale}</div>
      <div className="quiet-detail-separator"/>
      <div className="quiet-section-title"><h3>Originalfundstellen</h3><span>{selected.citations.filter(c=>checkCitation(selected.documents,c)).length} / {selected.citations.length} Textanker</span></div>
      <div className="quiet-citations" aria-label="Prüfbare Textstellen">
       {selected.citations.length?selected.citations.map(c=><button type="button" key={c.id}
        className={'quiet-citation '+(valid?.id===c.id?'is-active':'')}
        onClick={()=>chooseSource(c)}>
        <span className="quiet-citation-icon" aria-hidden="true">▤</span>
        <span className="quiet-citation-info"><strong>{c.label}</strong><small>{roles[c.role]} · Seite {c.page}</small></span>
        <span className={checkCitation(selected.documents,c)?'quiet-citation-arrow':'quiet-citation-error'}>{checkCitation(selected.documents,c)?'↗':'!'}</span>
       </button>):<p className="quiet-empty">Keine prüfbaren Quellenanker. Original manuell kontrollieren.</p>}
      </div>
      <div className={'quiet-quote'+(valid?' is-verified':'')}>
       <span>{valid?'WORTGLEICH IM ORIGINAL':'QUELLE NICHT VERIFIZIERT'}</span>
       <p>{valid?'„'+valid.quote+'“':'Ohne exakten Textanker lässt sich keine Fundstelle bestätigen.'}</p>
      </div>
      <div className="quiet-detail-separator"/>
      <div className="quiet-section-title"><h3>Nächster Schritt</h3></div>
      <p className="quiet-next-step">{selected.assessment.nextStep}</p>
      <div className="quiet-gate-checks">
       <span className={selected.assessment.missingRoles.length?'needs':'good'}>{selected.assessment.missingRoles.length?'!':'✓'} Pflichtdokumente</span>
       <span className={selected.assessment.scannedOrEmptyPages?'needs':'good'}>{selected.assessment.scannedOrEmptyPages?'!':'✓'} Lesbarkeit</span>
       <span className={selected.assessment.totalCitations===selected.assessment.validCitations&&selected.assessment.totalCitations>0?'good':'needs'}>{selected.assessment.validCitations===selected.assessment.totalCitations&&selected.assessment.totalCitations>0?'✓':'!'} Textanker</span>
      </div>
      <label className="quiet-note-label" htmlFor="quiet-note">Notiz zur Fachprüfung <span>· nur lokal</span></label>
      <textarea className="quiet-note" id="quiet-note" value={note} onChange={e=>setNote(e.target.value)} maxLength={600} rows={2} placeholder="Optionaler Hinweis für die nächste Fachperson"/>
      {selected.stage==='open'?<div className="quiet-actions">
       {primaryAction&&available.includes(primaryAction)&&<button type="button" className="quiet-primary-action" onClick={()=>review(primaryAction)}>{primaryLabel}<span>↗</span></button>}
       {primaryAction!=='request_documents'&&available.includes('request_documents')&&<button type="button" className="quiet-secondary-action" onClick={()=>review('request_documents')}>Unterlagen nachfordern</button>}
       {primaryAction!=='refer_specialist'&&available.includes('refer_specialist')&&<button type="button" className="quiet-secondary-action" onClick={()=>review('refer_specialist')}>An Spezialist:in</button>}
      </div>:<div className="quiet-done" role="status">
       <strong>{selected.stage==='waiting'?'Dokumente angefordert.':'Zur Fachprüfung übergeben.'}</strong>
       <p>Aktion nur in dieser Browser-Sitzung protokolliert. Keine Nachricht wurde versendet.</p>
       <div><button type="button" onClick={reopen}>Erneut öffnen</button>{next&&<button type="button" onClick={()=>chooseCase(next.id)}>Nächster offener Fall ↗</button>}</div>
      </div>}
      <div className="quiet-extra">
       <button type="button" onClick={()=>add.current?.click()} disabled={busy}>＋ Weitere PDFs ergänzen</button>
       <details><summary>Dokumentarten korrigieren</summary>
        {selected.documents.map(d=><label key={d.id}><span title={d.name}>{d.name}</span><select aria-label={'Dokumentart für '+d.name} value={d.role} onChange={e=>retag(d.id,e.target.value as DocumentRole)}>{Object.entries(roles).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>)}
       </details>
       {!!selected.events.length&&<details><summary>Bearbeitungsverlauf · {selected.events.length}</summary>
        {selected.events.slice().reverse().map((e,i)=><p key={i} className="quiet-history">{e.kind==='reopened'?'Wieder geöffnet':e.action?reviewLabels[e.action]:'Prüfung'} <span>{e.kind==='review'?(e.durationMs/1000).toFixed(0)+' s bis zur Aktion':'Neu geprüft'}</span></p>)}
       </details>}
      </div>
      <p className="quiet-disclaimer">Regelbasierte Demo · keine Live-KI · keine automatische Deckungs- oder Leistungsentscheidung.</p>
     </section>
    </div>}
    <input type="file" multiple hidden accept=".pdf,application/pdf" ref={add} aria-label="Dokumente zu diesem Fall ergänzen" onChange={e=>void attach(e)}/>
    <footer className="quiet-footer"><span>CLAIM / OS — unabhängige Arbeitsprobe · ausschliesslich fiktive Testfälle</span><a href="https://github.com/mikelninh/inca-demo" rel="noreferrer noopener" target="_blank">Quellcode & Prüfungen ↗</a></footer>
   </main>
  </div>
  {fullPdf&&<div className="quiet-modal-layer">
   <div className="quiet-modal" role="dialog" aria-modal="true" aria-label="Original-PDF Vollbild">
    <div className="quiet-modal-header"><div><span className="quiet-overline">ORIGINAL · {caseId}</span><strong title={selectedDoc?.name}>{selectedDoc?.name??'PDF'}</strong></div><button ref={closeFull} type="button" onClick={()=>{setFullPdf(false);openFull.current?.focus()}}>Schliessen ×</button></div>
    <div className="quiet-modal-toolbar"><div className="quiet-document-tabs" role="group" aria-label="Dokument im Vollbild auswählen">
     {selected?.documents.map(d=><button key={d.id} type="button" aria-pressed={selectedDoc?.id===d.id} onClick={()=>chooseDocument(d.id)}>{roles[d.role]}</button>)}
    </div><PdfControls current={selectedDoc} page={currentPage} zoom={zoom} onPage={setNewPage} onZoom={setZoom}/></div>
    <QuietPdf key={'modal-'+caseId+'-'+(selectedDoc?.id??'none')+'-'+currentPage} document={selectedDoc} page={currentPage} citation={valid} zoom={zoom} caseId={caseId} large/>
    <p className="quiet-modal-footer">Original aus dem Browser · prüfbare Textstelle, keine automatische Fachentscheidung</p>
   </div>
  </div>}
 </div>
}
