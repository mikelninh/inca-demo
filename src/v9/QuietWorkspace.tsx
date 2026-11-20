import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {ChangeEvent} from 'react'
import {createScenarioPdfs,scenarios} from '../doclab/samples'
import {parsePdfBytes,MAX_PDF_BYTES} from '../doclab/pdfReader'
import {checkCitation,sniffRole} from '../doclab/pdfEvidence'
import type {DocumentRole,ParsedDocument,PageCitation} from '../doclab/pdfEvidence'
import {allowedActions,appendDocuments,exportDeskAudit,makeDeskCase,recordReview,reopenCase,retagDocument,reviewLabels,safeFileGroup,severityLabels,sortedQueue} from '../desk/deskCore'
import type {DeskCase,ReviewAction} from '../desk/deskCore'
import QuietPdf from './QuietPdf'
import {caseCopy,caseTone,firstSource,displaySources,keySources,roles} from './quietCopy'
import './quiet.css'

const ids:Record<string,string>={parking:'KFZ-A17',water:'HR-B21',burglary:'HR-C09'}
const names:Record<string,string>={parking:'Parkrempler',water:'Leitungswasser',burglary:'Einbruch'}
const actionLabels:Record<ReviewAction,string>={request_documents:'Nachforderung vormerken',refer_specialist:'Fachprüfung vormerken',ready_for_expert:'Fachprüfung vormerken'}
type Filter='all'|'open'|'waiting'|'reviewed'
const tabs:{id:Filter;name:string}[]=[
 {id:'all',name:'Alle'},{id:'open',name:'Offen'},{id:'waiting',name:'Wartet'},{id:'reviewed',name:'Vorgemerkt'}
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
 const pdfDialog=useRef<HTMLDialogElement>(null)
 const caseHeading=useRef<HTMLHeadingElement>(null)
 const caseMenu=useRef<HTMLButtonElement>(null)
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
 const selected=cases.find(c=>c.id===caseId)??null
 const intro=selected?caseCopy(selected):null
 const shownCitations=useMemo(()=>selected?displaySources(selected):[],[selected])
 const featured=selected?keySources(selected,shownCitations):[]
 const otherSources=shownCitations.filter(c=>!featured.some(source=>source.id===c.id))
 const selectedDoc=selected?.documents.find(d=>d.id===docId)??selected?.documents[0]??null
 const currentPage=Math.max(1,Math.min(page,selectedDoc?.pages.length??1))
 const active=shownCitations.find(c=>c.id===citationId&&c.documentId===selectedDoc?.id&&c.page===currentPage)??null
 const valid=selected&&active&&checkCitation(selected.documents,active)?active:null
 const sourcePage=selectedDoc?.pages.find(p=>p.page===currentPage)
 const focusOffset=valid?.focusOffset
 const sourceLine=focusOffset===undefined?null:sourcePage?.rects?.find(r=>r.start<=focusOffset&&focusOffset<r.end)
 const excerpt=sourceLine&&sourcePage?sourcePage.text.slice(sourceLine.start,sourceLine.end):valid?.quote
 const available=selected?allowedActions(selected):[]
 const next=queue.find(c=>c.id!==caseId&&c.stage==='open')??null
 const displayedQueue=queue.filter(c=>{
  if(filter!=='all'&&c.stage!==filter)return false
  const q=search.trim().toLowerCase()
  return !q||(c.id+' '+c.title).toLowerCase().includes(q)
 })
 useEffect(()=>{
  if(!selected)return
  const source=firstSource(selected),fallback=selected.documents[0]
  setDocId(source?.documentId??fallback?.id??'')
  setPage(source?.page??1);setCitationId(source?.id??'')
  setZoom(1);setNote('');started.current=performance.now()
 },[caseId,selected?.documents])
 useEffect(()=>{
  if(fullPdf)pdfDialog.current?.showModal()
 },[fullPdf])
 useEffect(()=>{
  if(!sidebarOpen)return
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){setSidebarOpen(false);caseMenu.current?.focus()}
  }
  window.addEventListener('keydown',onKey)
  return()=>window.removeEventListener('keydown',onKey)
 },[sidebarOpen])
 function chooseCase(id:string){
  if(id!==caseId){setCaseId(id);setDocId('');setCitationId('');setPage(1);started.current=performance.now()}
  setSidebarOpen(false);setNotice('')
  if(sidebarOpen)requestAnimationFrame(()=>caseHeading.current?.focus())
 }
 function chooseDocument(id:string){
  setDocId(id);setPage(1)
  const cite=shownCitations.find(c=>c.documentId===id&&c.page===1&&selected&&checkCitation(selected.documents,c))
  setCitationId(cite?.id??'')
 }
 function chooseSource(c:PageCitation){
  setDocId(c.documentId);setPage(c.page);setCitationId(c.id)
  if(window.matchMedia('(max-width: 790px)').matches)setFullPdf(true)
 }
 function setNewPage(n:number){setPage(n);setCitationId('')}
 function review(action:ReviewAction){
  if(!selected)return
  try{
   const ms=Math.min(24*3600*1000,Math.max(0,performance.now()-started.current))
   const updated=recordReview(selected,action,note,ms)
   setCases(cs=>cs.map(c=>c.id===selected.id?updated:c))
   setNote('');setNotice('')
   started.current=performance.now()
  }catch(e){setError(e instanceof Error?e.message:'Aktion blockiert.')}
 }
 function reopen(){
  if(!selected)return
  setCases(cs=>cs.map(c=>c.id===selected.id?reopenCase(c,'Manuell erneut geöffnet'):c))
  started.current=performance.now();setNotice('Fall wieder geöffnet.')
 }
 function retag(id:string,role:DocumentRole){
  if(!selected)return
  setCases(cs=>cs.map(c=>c.id===selected.id?retagDocument(c,id,role):c))
  setNotice('Dokumentart geändert. Unterlagen erneut geprüft.')
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
   setCases(cs=>[...cs,...imported]);chooseCase(imported[0].id)
   setNotice(imported.length===1?'Ein Fall importiert.':`${imported.length} Fälle importiert.`)
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
   setNotice('PDFs ergänzt. Der Fall ist wieder offen.')
  }catch(e){if(ticket===pending.current)setError(e instanceof Error?e.message:'Datei konnte nicht ergänzt werden.')}
  finally{if(ticket===pending.current)setBusy(false)}
 }
 const primaryAction:ReviewAction|null=selected?.stage!=='open'?null:
  selected.assessment.status==='REVIEW_READY'?'ready_for_expert':
  selected.assessment.status==='REVIEW_DISCREPANCY'?'refer_specialist':'request_documents'
 const sourceButton=(source:PageCitation,showLabel=false)=><button type="button" key={source.id}
  className="quiet-citation" aria-pressed={valid?.id===source.id} onClick={()=>chooseSource(source)}>
  <span>{showLabel?source.label:roles[source.role]}</span>
  <small>{showLabel?`${roles[source.role]} · `:''}Seite {source.page}</small>
 </button>
 return <div className="quiet">
  <a href="#quiet-content" className="quiet-skip">Zur Fallbearbeitung springen</a>
  <header className="quiet-topbar">
   <a href={import.meta.env.BASE_URL} className="quiet-brand" aria-label="CLAIM OS – Quiet Workspace">
    <span className="quiet-brand-symbol" aria-hidden="true">◇</span><strong>CLAIM<span> / </span>OS</strong>
   </a>
   <span className="quiet-top-spacer"/>
   <span className="quiet-local">Lokale Demo</span>
   <button className="quiet-mobile-menu" type="button" ref={caseMenu} onClick={()=>setSidebarOpen(!sidebarOpen)} aria-label="Arbeitsliste öffnen" aria-expanded={sidebarOpen} aria-controls="quiet-cases">Fälle <span aria-hidden="true">≡</span></button>
  </header>
  <div className="quiet-body">
   {sidebarOpen&&<button type="button" className="quiet-sidebar-backdrop" tabIndex={-1} aria-label="Arbeitsliste schließen" onClick={()=>{setSidebarOpen(false);caseMenu.current?.focus()}}/>}
   <aside id="quiet-cases" className={'quiet-sidebar'+(sidebarOpen?' is-open':'')} aria-label="Arbeitsliste">
    <div className="quiet-sidebar-heading">
     <h2>Fälle</h2>
     <button className="quiet-mobile-close" type="button" aria-label="Arbeitsliste schließen" onClick={()=>{setSidebarOpen(false);caseMenu.current?.focus()}}>×</button>
    </div>
    <details className="quiet-queue-filter">
     <summary>Fälle filtern{filter!=='all'||search?' · aktiv':''}</summary>
     <input type="search" placeholder="Fall suchen" aria-label="Fall suchen" value={search} onChange={e=>setSearch(e.target.value)}/>
     <div className="quiet-filters" role="group" aria-label="Fallfilter">
      {tabs.map(t=><button type="button" key={t.id} aria-pressed={filter===t.id} onClick={()=>setFilter(t.id)}>{t.name}</button>)}
     </div>
    </details>
    <div className="quiet-case-list" aria-label="Fälle">
     {displayedQueue.map(c=><button type="button" key={c.id} className="quiet-case" aria-current={c.id===caseId?'true':undefined} onClick={()=>chooseCase(c.id)}>
      <strong>{c.title}</strong>
      <span className="quiet-case-status"><i className={'quiet-dot '+caseTone(c)} aria-hidden="true"/>{c.stage==='reviewed'?'Fachprüfung vorgemerkt':c.stage==='waiting'?'Wartet auf Unterlagen':severityLabels[c.assessment.status]}</span>
     </button>)}
     {!displayedQueue.length&&<p className="quiet-empty">{busy?'Fälle werden geladen …':'Keine passenden Fälle.'}</p>}
    </div>
    <button type="button" className="quiet-import" disabled={busy} onClick={()=>upload.current?.click()}>+ PDFs importieren</button>
    <input type="file" multiple hidden key={revision} accept=".pdf,application/pdf" ref={upload} aria-label="Mehrere PDFs importieren" onChange={e=>void importFiles(e)}/>
    <details className="quiet-side-footer">
     <summary>Demo-Optionen</summary>
     <button type="button" onClick={()=>saveAudit(cases)} disabled={!cases.length}>Sitzungsbericht exportieren</button>
     <button type="button" disabled={busy} onClick={()=>{
      if(cases.some(c=>c.source==='local_upload'||c.events.length)&&!window.confirm('Lokale Fälle und Bearbeitungsverlauf zurücksetzen?'))return
      void loadDemo()
     }}>Demo zurücksetzen</button>
     <a href={import.meta.env.BASE_URL+'?v8=1'}>v8 ansehen ↗</a>
    </details>
   </aside>
   <main className="quiet-content" id="quiet-content">
    {error&&<div role="alert" className="quiet-alert">{error}<button type="button" aria-label="Fehler schließen" onClick={()=>setError('')}>×</button></div>}
    {notice&&<div role="status" className="quiet-notice">{notice}<button type="button" aria-label="Hinweis schließen" onClick={()=>setNotice('')}>×</button></div>}
    {selected&&intro?<div className="quiet-case-heading">
     <p className="quiet-case-name">{selected.title} <span>· {selected.id}</span></p>
     <h1 ref={caseHeading} tabIndex={-1}>{intro.heading}</h1>
     {intro.description&&<p className="quiet-case-context">{intro.description}</p>}
    </div>:<div className="quiet-case-heading"><h1>{error?'Fall konnte nicht geladen werden':'Fall wird geladen …'}</h1></div>}
    {selected&&intro&&<div className="quiet-workspace">
     <section className="quiet-findings" aria-label="Belege und nächster Schritt">
      <h2>Belege</h2>
      {featured.length>0?<div className="quiet-citations">{featured.map(source=>sourceButton(source))}</div>:
       <p className="quiet-empty">PDF manuell prüfen.</p>}
      <button type="button" className="quiet-all-pdfs" onClick={()=>setFullPdf(true)}>Alle PDFs öffnen</button>
      <div className="quiet-next">
       <h2>Nächster Schritt</h2>
       {primaryAction&&available.includes(primaryAction)?<>
        <p>{intro.next}</p>
        <button type="button" className="quiet-primary-action" disabled={busy} onClick={()=>review(primaryAction)}>{actionLabels[primaryAction]}</button>
        <small className="quiet-action-note">Wird nur in dieser Sitzung gespeichert.</small>
       </>:<div className="quiet-done" role="status">
        <strong>{selected.stage==='waiting'?'Nachforderung vorgemerkt.':'Fachprüfung vorgemerkt.'}</strong>
        <p>Nur in dieser Sitzung gespeichert.</p>
        {next&&<button type="button" className="quiet-primary-action" onClick={()=>chooseCase(next.id)}>Nächster offener Fall</button>}
        <button type="button" className="quiet-secondary-action" onClick={reopen}>Fall wieder öffnen</button>
       </div>}
      </div>
      <details className="quiet-extra" key={selected.id}>
       <summary>Falldetails</summary>
       <p>{selected.assessment.rationale}</p>
       {excerpt&&<p className="quiet-quote">«{excerpt}»</p>}
       {otherSources.length>0&&<details>
        <summary>Weitere Fundstellen</summary>
        <div className="quiet-citations">{otherSources.map(source=>sourceButton(source,true))}</div>
       </details>}
       {selected.stage==='open'&&<>
        <label className="quiet-note-label" htmlFor="quiet-note">Notiz zur Fachprüfung</label>
        <textarea className="quiet-note" id="quiet-note" value={note} onChange={e=>setNote(e.target.value)} maxLength={600} rows={2}/>
        <div className="quiet-alternatives">
         {primaryAction!=='request_documents'&&available.includes('request_documents')&&<button type="button" className="quiet-secondary-action" disabled={busy} onClick={()=>review('request_documents')}>Nachforderung vormerken</button>}
         {primaryAction!=='refer_specialist'&&available.includes('refer_specialist')&&<button type="button" className="quiet-secondary-action" disabled={busy} onClick={()=>review('refer_specialist')}>Spezialprüfung vormerken</button>}
        </div>
       </>}
       <button className="quiet-secondary-action" type="button" onClick={()=>add.current?.click()} disabled={busy}>Weitere PDFs ergänzen</button>
       <details><summary>Dokumentarten korrigieren</summary>
        {selected.documents.map(d=><label className="quiet-role" key={d.id}><span title={d.name}>{d.name}</span><select aria-label={'Dokumentart für '+d.name} value={d.role} onChange={e=>retag(d.id,e.target.value as DocumentRole)}>{Object.entries(roles).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>)}
       </details>
       {!!selected.events.length&&<details><summary>Bearbeitungsverlauf</summary>
        {selected.events.slice().reverse().map((e,i)=><p key={i} className="quiet-history">{e.kind==='reopened'?'Wieder geöffnet':e.action?reviewLabels[e.action]:'Prüfung'} <span>{e.kind==='review'?(e.durationMs/1000).toFixed(0)+' s bis zur Aktion':'Neu geprüft'}</span></p>)}
       </details>}
      </details>
     </section>
     <section className="quiet-evidence" aria-label="Originaldokumente">
      <div className="quiet-panel-top">
       <h2>Original-PDF</h2>
       <button type="button" className="quiet-fullscreen" onClick={()=>setFullPdf(true)} aria-label="Original-PDF im Vollbild öffnen">Vollbild</button>
      </div>
      <div className="quiet-document-tabs" role="group" aria-label="Dokument auswählen">
       {selected.documents.map(d=><button type="button" key={d.id} title={d.name} aria-pressed={selectedDoc?.id===d.id} onClick={()=>chooseDocument(d.id)}>{roles[d.role]}</button>)}
      </div>
      <div className="quiet-docbar">
       <span title={selectedDoc?.name}>{selectedDoc?.name??'Kein PDF gewählt'}</span>
       <PdfControls current={selectedDoc} page={currentPage} zoom={zoom} onPage={setNewPage} onZoom={setZoom}/>
      </div>
      <QuietPdf key={caseId+'-'+(selectedDoc?.id??'none')+'-'+currentPage} document={selectedDoc} page={currentPage} citation={valid} zoom={zoom} caseId={caseId}/>
     </section>
    </div>}
    <input type="file" multiple hidden accept=".pdf,application/pdf" ref={add} aria-label="Dokumente zu diesem Fall ergänzen" onChange={e=>void attach(e)}/>
    <footer className="quiet-footer"><span>Unabhängige Arbeitsprobe mit fiktiven Fällen</span><a href="https://github.com/mikelninh/inca-demo" rel="noreferrer noopener" target="_blank">Quellcode ↗</a></footer>
   </main>
  </div>
  {fullPdf&&<dialog ref={pdfDialog} className="quiet-modal" aria-label="Original-PDF Vollbild" onClose={()=>setFullPdf(false)}>
   <div className="quiet-modal-header">
    <strong title={selectedDoc?.name}>{selectedDoc?.name??'Original-PDF'}</strong>
    <button type="button" onClick={()=>pdfDialog.current?.close()}>Schließen</button>
   </div>
   <div className="quiet-modal-toolbar">
    <div className="quiet-document-tabs" role="group" aria-label="Dokument im Vollbild auswählen">
     {selected?.documents.map(d=><button key={d.id} type="button" title={d.name} aria-pressed={selectedDoc?.id===d.id} onClick={()=>chooseDocument(d.id)}>{roles[d.role]}</button>)}
    </div>
    <PdfControls current={selectedDoc} page={currentPage} zoom={zoom} onPage={setNewPage} onZoom={setZoom}/>
   </div>
   <QuietPdf key={'modal-'+caseId+'-'+(selectedDoc?.id??'none')+'-'+currentPage} document={selectedDoc} page={currentPage} citation={valid} zoom={zoom} caseId={caseId} large/>
   {excerpt&&<p className="quiet-modal-quote">«{excerpt}»</p>}
  </dialog>}
 </div>
}
