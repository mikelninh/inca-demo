import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {ChangeEvent} from 'react'
import {createScenarioPdfs,scenarios} from '../doclab/samples'
import {MAX_PDF_BYTES,parsePdfBytes,drawPdfPage} from '../doclab/pdfReader'
import {checkCitation,sniffRole} from '../doclab/pdfEvidence'
import type {DocumentRole,ParsedDocument,PageCitation} from '../doclab/pdfEvidence'
import {allowedActions,appendDocuments,exportDeskAudit,makeDeskCase,recordReview,reopenCase,retagDocument,reviewLabels,safeFileGroup,severityLabels,sortedQueue,summarizeDesk} from '../desk/deskCore'
import type {DeskCase,ReviewAction} from '../desk/deskCore'
import {narrativeReceipt,sceneCitation,sceneLabels,storyFor} from './story'
import type {Scene} from './story'
import WorkPanel from '../v8/WorkPanel'
import './cinematic.css'
import '../v8/experience.css'

const roles:Record<DocumentRole,string>={
 claim:'Schadenmeldung',policy:'Police',invoice:'Rechnung',unknown:'Nicht zugeordnet'
}
const sampleIds:Record<string,string>={parking:'KFZ-A17',water:'HR-B21',burglary:'HR-C09'}
const sampleNames:Record<string,string>={parking:'Parkrempler · Umfang prüfen',water:'Leitungswasser · Boden',burglary:'Einbruch · Beleg fehlt'}
type QueueFilter='all'|'exceptions'|'waiting'|'done'
function fmtDuration(ms:number){
 if(ms<=0)return '—'
 if(ms<60_000)return (ms/1000).toFixed(1).replace('.',',')+' s'
 return (ms/60_000).toFixed(1).replace('.',',')+' Min.'
}
function downloadSession(data:unknown){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}))
 const link=document.createElement('a')
 link.href=url;link.download='claim-os-7-session-audit.json'
 document.body.append(link);link.click();link.remove()
 window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
async function generateCases(){
 return Promise.all(scenarios.map(async s=>{
  const result=await createScenarioPdfs(s.id)
  const documents:ParsedDocument[]=[]
  for(let i=0;i<result.docs.length;i++){
   const file=result.docs[i]
   documents.push(await parsePdfBytes(file.bytes,s.id+'-D'+(i+1),file.name,file.role,'generated_sample'))
  }
  return makeDeskCase(sampleIds[s.id],sampleNames[s.id],documents)
 }))
}
function PdfStage({document,page,citation,zoom,caseId}:{document:ParsedDocument|null;page:number;citation:PageCitation|null;zoom:number;caseId:string}){
 const canvas=useRef<HTMLCanvasElement>(null)
 const scroller=useRef<HTMLDivElement>(null)
 const [ready,setReady]=useState(false)
 const [failure,setFailure]=useState('')
 const pageInfo=document?.pages.find(x=>x.page===page)
 const marks=useMemo(()=>{
  if(!document||!citation||!pageInfo||citation.documentId!==document.id||citation.page!==page||!checkCitation([document],citation))return []
  // Spotlight only the exact literal cue, not the entire contextual quotation.
  // PDF coordinates still come solely from PDF.js's original text runs.
  const start=citation.focusOffset??citation.offset
  const finish=start+(citation.focusText?.length??citation.quote.length)
  return (pageInfo.rects??[]).filter(r=>r.start<finish&&r.end>start).slice(0,8)
 },[document,citation,page,pageInfo])
 useEffect(()=>{
  let discarded=false
  setReady(false);setFailure('')
  if(!document||!canvas.current)return
  const dest=canvas.current
  void drawPdfPage(document.bytes,page,dest).then(()=>{if(!discarded)setReady(true)}).catch(e=>{
   if(!discarded)setFailure(e instanceof Error?e.message:'PDF-Vorschau nicht möglich.')
  })
  return()=>{discarded=true}
 },[document,page])
 useEffect(()=>{
  if(!ready||!marks.length||!scroller.current)return
  const outer=scroller.current,inner=outer.querySelector('.cine-paper')
  if(!inner)return
  const r=marks[0],stage=inner as HTMLElement
  const frame=requestAnimationFrame(()=>outer.scrollTo({
   top:Math.max(0,stage.offsetTop+stage.clientHeight*r.top-outer.clientHeight*.39),
   left:Math.max(0,stage.clientWidth*r.left-outer.clientWidth*.3),
   behavior:'smooth'
  }))
  return()=>cancelAnimationFrame(frame)
 },[ready,marks,zoom])
 return <div className="cine-document-viewport" ref={scroller} aria-label="Original-PDF" data-testid="v7-pdf">
  {!document?<p className="cine-pdf-loading">Keine PDF ausgewählt.</p>:
   <div className="cine-paper" style={{width:zoom*100+'%'}}>
    <canvas ref={canvas} aria-label={'Original-PDF Seite '+page+' Fall '+caseId}/>
    {ready&&marks.map((r,i)=><span key={i} className="cine-source-highlight" role="img" aria-label="Original-Fundstelle nach wortgleicher Prüfung" style={{
     left:r.left*100+'%',top:r.top*100+'%',width:r.width*100+'%',height:r.height*100+'%'
    }}/>)}
    {!ready&&!failure&&<p className="cine-pdf-loading">Dokument wird geladen …</p>}
    {failure&&<p className="cine-pdf-loading" role="alert">{failure}</p>}
   </div>}
 </div>
}
export default function CinematicDesk(){
 const [cases,setCases]=useState<DeskCase[]>([])
 const [caseId,setCaseId]=useState('KFZ-A17')
 const [scene,setScene]=useState<Scene>(0)
 const [mode,setMode]=useState<'story'|'work'>(()=>new URLSearchParams(window.location.search).get('mode')==='work'?'work':'story')
 const [fullPdf,setFullPdf]=useState(false)
 const [documentId,setDocumentId]=useState('')
 const [page,setPage]=useState(1)
 const [citationId,setCitationId]=useState('')
 const [zoom,setZoom]=useState(1)
 const [drawer,setDrawer]=useState(false)
 const [filter,setFilter]=useState<QueueFilter>('all')
 const [search,setSearch]=useState('')
 const [note,setNote]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [reloadKey,setReloadKey]=useState(0)
 const activeRun=useRef(0)
 const startedAt=useRef(performance.now())
 const inputFiles=useRef<HTMLInputElement|null>(null)
 const attachFiles=useRef<HTMLInputElement|null>(null)
 const sourcesRef=useRef<HTMLDivElement>(null)
 const fullPdfClose=useRef<HTMLButtonElement>(null)
 const readCase=useCallback(async()=>{
  const run=++activeRun.current
  setBusy(true);setError('');setNotice('')
  try{
   const docs=await generateCases()
   if(run!==activeRun.current)return
   setCases(docs);setCaseId('KFZ-A17');setScene(0);setDrawer(false);setFullPdf(false)
   setSearch('');setFilter('all');setNote('');setReloadKey(k=>k+1)
   setDocumentId('');setPage(1);setCitationId('');setZoom(1)
   startedAt.current=performance.now()
  }catch(e){if(run===activeRun.current)setError(e instanceof Error?e.message:'Demofälle nicht lesbar.')}
  finally{if(run===activeRun.current)setBusy(false)}
 },[])
 useEffect(()=>{
  void readCase()
  return()=>{activeRun.current++}
 },[readCase])
 const ordered=useMemo(()=>sortedQueue(cases),[cases])
 const selected=cases.find(c=>c.id===caseId)??null
 const totals=useMemo(()=>summarizeDesk(cases),[cases])
 const narrative=selected?storyFor(selected):null
 const receipt=selected?narrativeReceipt(selected):null
 const doc=selected?.documents.find(d=>d.id===documentId)??selected?.documents[0]??null
 const displayedPage=Math.max(1,Math.min(page,doc?.pages.length??1))
 const citation=selected?.citations.find(c=>c.id===citationId&&c.documentId===doc?.id&&c.page===displayedPage)??null
 const valid=selected&&citation&&checkCitation(selected.documents,citation)?citation:null
 const status=selected?.assessment.status??'STOP_MISSING_SOURCE'
 const actions=selected?allowedActions(selected):[]
 const next=ordered.find(c=>c.id!==caseId&&c.stage==='open')??null
 const visible=ordered.filter(c=>{
  const q=search.trim().toLowerCase()
  if(q&&!(''+c.id+' '+c.title).toLowerCase().includes(q))return false
  if(filter==='exceptions')return c.stage==='open'&&c.assessment.status!=='REVIEW_READY'
  if(filter==='waiting')return c.stage==='waiting'
  if(filter==='done')return c.stage==='reviewed'
  return true
 })
 const modeLabel=selected?.stage==='reviewed'?'Übergeben':selected?.stage==='waiting'?'Wartet':status.startsWith('STOP')?'Stopp':status==='REVIEW_READY'?'Prüfbereit':'Prüfen'
 useEffect(()=>{
  if(!selected)return
  const original=selected.documents[0]
  const initial=mode==='work'?sceneCitation(selected):null
  setDocumentId(initial?.documentId??original?.id??'');setPage(initial?.page??1);setCitationId(initial?.id??'');setZoom(1)
  setNote('');startedAt.current=performance.now()
 },[caseId,selected?.documents])
 function selectCase(id:string){
  if(id===caseId){setDrawer(false);return}
  setCaseId(id);setScene(0);setDocumentId('');setCitationId('');setFullPdf(false)
  startedAt.current=performance.now();setDrawer(false);setNotice('')
 }
 function openScene(nextScene:Scene){
  setScene(nextScene)
  if(nextScene===1&&selected){
   const best=sceneCitation(selected)
   if(best){setDocumentId(best.documentId);setPage(best.page);setCitationId(best.id)}
  }
 }
 function visit(c:PageCitation){
  if(mode==='story')setScene(1)
  setDocumentId(c.documentId);setPage(c.page);setCitationId(c.id)
 }
 function chooseMode(nextMode:'story'|'work'){
  setMode(nextMode)
  const url=new URL(window.location.href)
  if(nextMode==='work')url.searchParams.set('mode','work')
  else url.searchParams.delete('mode')
  window.history.replaceState(null,'',url.pathname+url.search+url.hash)
  if(nextMode==='work'&&selected){
   const highlight=sceneCitation(selected)
   if(highlight){setDocumentId(highlight.documentId);setPage(highlight.page);setCitationId(highlight.id)}
  }
  setFullPdf(false)
 }
 function chooseDoc(id:string){
  setDocumentId(id);setPage(1)
  const hit=selected?.citations.find(c=>c.documentId===id)
  setCitationId(hit?.id??'')
 }
 function commit(action:ReviewAction){
  if(!selected)return
  try{
   const ms=Math.max(0,Math.min(24*3600*1000,performance.now()-startedAt.current))
   const newCase=recordReview(selected,action,note,ms)
   setCases(prev=>prev.map(c=>c.id===selected.id?newCase:c))
   startedAt.current=performance.now();setNote('')
   setNotice('Schritt protokolliert: '+reviewLabels[action]+'. Keine echte Nachricht versendet.')
  }catch(e){setError(e instanceof Error?e.message:'Aktion durch Quellenprüfung verhindert.')}
 }
 function reopen(){
  if(!selected)return
  setCases(prev=>prev.map(c=>c.id===selected.id?reopenCase(c,'Manuell korrigiert / erneut geöffnet'):c))
  startedAt.current=performance.now()
  setNotice('Fall erneut geöffnet. Vorherige Einträge bleiben im lokalen Sitzungsverlauf.')
 }
 function changeRole(id:string,role:DocumentRole){
  if(!selected)return
  setCases(prev=>prev.map(c=>c.id===selected.id?retagDocument(c,id,role):c))
  startedAt.current=performance.now();setCitationId('')
  setNotice('Dokumenttyp geändert. Belegprüfung wurde zurückgesetzt und neu berechnet.')
 }
 async function importBatch(event:ChangeEvent<HTMLInputElement>){
  const chosen=Array.from(event.currentTarget.files??[])
  event.currentTarget.value=''
  if(!chosen.length)return
  const run=++activeRun.current
  setBusy(true);setError('');setNotice('')
  try{
   if(chosen.length>12)throw Error('Maximal 12 PDFs auf einmal.')
   const groups=new Map<string,File[]>()
   const tags=chosen.map(f=>safeFileGroup(f.name))
   if(tags.some(Boolean)&&tags.some(x=>!x))throw Error('Bitte alle Dateien mit CASE-123__... benennen oder alle ohne Kennung importieren.')
   for(let i=0;i<chosen.length;i++){
    const file=chosen[i],key=tags[i]??'SINGLE'
    if(file.size<10||file.size>MAX_PDF_BYTES||(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'))
     throw Error('Nur PDFs von 10 Byte bis 8 MB sind erlaubt.')
    groups.set(key,[...(groups.get(key)??[]),file])
   }
   if(groups.size>6)throw Error('Bitte maximal 6 Dossiers pro Stapel.')
   const imported:DeskCase[]=[]
   let groupIndex=0
   for(const [key,files] of groups){
    const docs:ParsedDocument[]=[]
    for(let i=0;i<files.length;i++){
     const f=files[i],id='NEW-'+Date.now()+'-'+groupIndex+'-'+i
     docs.push(await parsePdfBytes(new Uint8Array(await f.arrayBuffer()),id,f.name,sniffRole(f.name),'user_upload'))
    }
    const id='LOCAL-'+Date.now()+'-'+groupIndex
    imported.push(makeDeskCase(id,key==='SINGLE'?'Eigenes Dossier':key+' · Import',docs,'local_upload'))
    groupIndex++
   }
   if(run!==activeRun.current)return
   setCases(current=>[...current,...imported])
   selectCase(imported[0].id);setCaseId(imported[0].id)
   setNotice('PDFs lokal importiert. Dokumentarten und Aussagen müssen menschlich geprüft werden.')
  }catch(e){if(run===activeRun.current)setError(e instanceof Error?e.message:'PDF-Import nicht möglich.')}
  finally{if(run===activeRun.current)setBusy(false)}
 }
 async function appendBatch(event:ChangeEvent<HTMLInputElement>){
  const chosen=Array.from(event.currentTarget.files??[])
  event.currentTarget.value=''
  if(!chosen.length||!selected)return
  const key=selected.id,run=++activeRun.current
  setBusy(true);setError('');setNotice('')
  try{
   if(chosen.length>4||selected.documents.length+chosen.length>12)throw Error('Maximal 4 neue und insgesamt 12 PDFs pro Fall.')
   const additions:ParsedDocument[]=[]
   for(let i=0;i<chosen.length;i++){
    const f=chosen[i]
    if(f.size<10||f.size>MAX_PDF_BYTES||(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'))
     throw Error('Nur gültige PDFs bis 8 MB.')
    additions.push(await parsePdfBytes(new Uint8Array(await f.arrayBuffer()),'ATT-'+Date.now()+'-'+i,f.name,sniffRole(f.name),'user_upload'))
   }
   if(run!==activeRun.current)return
   setCases(prev=>prev.map(c=>c.id===key?appendDocuments(c,additions):c))
   setScene(1);setCitationId('');startedAt.current=performance.now()
   setNotice('Dokumente ergänzt. Quellencheck erneut ausgeführt; der Fall ist wieder offen.')
  }catch(e){if(run===activeRun.current)setError(e instanceof Error?e.message:'Neue Quelle nicht lesbar.')}
  finally{if(run===activeRun.current)setBusy(false)}
 }
 useEffect(()=>{
  if(scene!==1||!citationId)return
  const rail=sourcesRef.current,active=rail?.querySelector<HTMLElement>('button.active')
  if(!rail||!active)return
  const relative=active.offsetLeft-rail.offsetLeft
  rail.scrollLeft=Math.max(0,relative-rail.clientWidth/2+active.clientWidth/2)
 },[scene,citationId,caseId])
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement|null
   if(target?.closest('input,textarea,select,[contenteditable="true"]'))return
   if(event.key==='Escape'){setDrawer(false);setFullPdf(false);return}
   if(drawer||fullPdf||mode==='work'||event.metaKey||event.ctrlKey||event.altKey)return
   if(event.key==='1'||event.key==='2'||event.key==='3'){
    event.preventDefault();openScene((Number(event.key)-1) as Scene)
   }
  }
  window.addEventListener('keydown',handler)
  return()=>window.removeEventListener('keydown',handler)
 // Keyboard transition uses currently selected case's verified citation.
 },[drawer,selected,fullPdf,mode])
 useEffect(()=>{
  if(fullPdf)fullPdfClose.current?.focus()
 },[fullPdf])
 return <div className={'cine cine-v8 cine-mode-'+mode}>
  <a href="#cine-stage" className="cine-skip">Zur Fallansicht</a>
  <header className="cine-topbar">
   <a className="cine-wordmark" href={import.meta.env.BASE_URL}><span className="cine-symbol" aria-hidden="true">◈</span> CLAIM<span className="cine-slash">/</span>OS <span className="cine-edition">8</span></a>
   <div className="cine-top-center" aria-label="Demo-Modus"><span className="cine-pulse"/> An independent evidence workspace <span className="cine-top-separator">/</span> LOCAL DEMO</div>
   <div className="cine-top-actions">
    <div className="cine-view-switch" role="group" aria-label="Ansicht wählen">
     <button type="button" aria-pressed={mode==='story'} onClick={()=>chooseMode('story')}>Story</button>
     <button type="button" aria-pressed={mode==='work'} onClick={()=>chooseMode('work')}>Work</button>
    </div>
    <a href={import.meta.env.BASE_URL+'?classic=1'} className="cine-quiet-link">v6</a>
    <button type="button" className="cine-queue-toggle" onClick={()=>setDrawer(true)} aria-label="Fallliste öffnen">
     <span aria-hidden="true">☷</span> <span>Fälle</span> <b>{totals.unresolved}</b>
    </button>
   </div>
  </header>
  <main>
   <div className="cine-meta">
    <div className="cine-crumbs"><span>THE WORKBENCH</span><span aria-hidden="true">/</span><strong>{selected?.id??'LADE…'}</strong><span className={'cine-case-status '+(status==='REVIEW_READY'?'okay':'warning')}>{modeLabel}</span></div>
    <div className="cine-meta-right"><span>{cases.length} Dossiers</span><span aria-hidden="true">·</span><span>{totals.exceptions} Ausnahmen</span><span aria-hidden="true">·</span><button type="button" disabled={busy} onClick={()=>inputFiles.current?.click()}>+ PDF importieren</button></div>
   </div>
   <input ref={inputFiles} key={reloadKey} type="file" accept=".pdf,application/pdf" multiple hidden aria-label="Mehrere PDFs importieren" onChange={e=>void importBatch(e)}/>
   <input ref={attachFiles} type="file" multiple accept=".pdf,application/pdf" hidden aria-label="Dokumente zu diesem Fall ergänzen" onChange={e=>void appendBatch(e)}/>
   {error&&<div role="alert" className="cine-alert">{error}<button type="button" aria-label="Fehler schließen" onClick={()=>setError('')}>×</button></div>}
   {notice&&<div role="status" className="cine-toast">{notice}<button type="button" aria-label="Meldung schließen" onClick={()=>setNotice('')}>×</button></div>}
   {mode==='story'&&<nav className="cine-scene-nav" role="tablist" aria-label="Drei Szenen der Prüfung">
    {sceneLabels.map((name,i)=><button type="button" role="tab" key={name} aria-selected={scene===i} className={scene===i?'current':''}
     onClick={()=>openScene(i as Scene)}><span>0{i+1}</span><strong>{name}</strong>{i===scene&&<span className="cine-current-marker"/>}</button>)}
    <span className="cine-scenes-counter">SHOT 0{scene+1}<span> / 03</span></span>
   </nav>}
   <section className={'cine-main-stage '+(mode==='work'?'cine-work-stage':'')+(mode==='story'&&scene===1?' cine-evidence-reveal':'')} id="cine-stage" aria-label="Filmischer Beleg-Arbeitsplatz">
    <div className="cine-stage-left">
     <div className="cine-stage-header">
      <div><span className="cine-overline">ORIGINAL SOURCE</span><strong>{mode==='work'?'Quelle & Nachweis':scene===0?'Das Geschehene.':scene===1?'Der Beweis.':'Der Kontext.'}</strong></div>
      <div className="cine-stage-header-actions"><span className="cine-document-number">{doc?.name??'PDF wird vorbereitet'}</span>
       <button type="button" className="cine-open-pdf" aria-label="Original-PDF im Vollbild öffnen" onClick={()=>setFullPdf(true)}>Vollbild ↗</button>
      </div>
     </div>
     <div className="cine-document-tools">
      <div className="cine-document-tabs" role="group" aria-label="Originaldokument auswählen">
       {selected?.documents.map(d=><button key={d.id} type="button" aria-pressed={doc?.id===d.id} className={doc?.id===d.id?'selected':''}
        onClick={()=>chooseDoc(d.id)}>{roles[d.role]} <span>{d.pages.length}</span></button>)}
      </div>
      <div className="cine-page-controls">
       <button type="button" aria-label="Vorherige PDF-Seite" disabled={displayedPage<=1} onClick={()=>{setPage(p=>p-1);setCitationId('')}}>‹</button>
       <output>{displayedPage} <span>/ {doc?.pages.length??0}</span></output>
       <button type="button" aria-label="Nächste PDF-Seite" disabled={displayedPage>=(doc?.pages.length??0)} onClick={()=>{setPage(p=>p+1);setCitationId('')}}>›</button>
       <span className="cine-tool-divider"/>
       <button type="button" aria-label="PDF verkleinern" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}>−</button>
       <output>{Math.round(zoom*100)}%</output>
       <button type="button" aria-label="PDF vergrößern" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}>+</button>
      </div>
     </div>
     <PdfStage key={caseId+'-'+(doc?.id??'none')+'-'+displayedPage} document={doc} page={displayedPage} citation={mode==='work'||scene>0?valid:null} zoom={zoom} caseId={caseId}/>
     <button type="button" className="cine-mobile-fullscreen" onClick={()=>setFullPdf(true)} aria-label="Originaldokument gross ansehen">Originaldokument öffnen <span>↗</span></button>
     <div className="cine-source-foot">
      <div className="cine-foot-ident"><span aria-hidden="true">↗</span><span>PDF-Original · lokal gerendert</span></div>
      <span>{valid&&scene>0?'Fundstelle wortgleich verifiziert':'Original ohne KI-Interpretation'}</span>
     </div>
    </div>
    <div className={'cine-stage-right cine-scene-'+scene} key={mode+'-'+scene+'-'+caseId}>
     {mode==='work'&&selected?<WorkPanel current={selected} citationId={citationId} note={note}
        onNote={setNote} onCitation={visit} onAction={commit} onReopen={reopen}
        onNext={()=>{if(next)selectCase(next.id)}} hasNext={!!next}
        onAdd={()=>attachFiles.current?.click()} onViewPdf={()=>setFullPdf(true)} onRole={changeRole}
        onExport={()=>downloadSession(exportDeskAudit(cases))}/>
      :selected&&narrative?<div className="cine-story">
      <div className="cine-story-top"><div className="cine-story-dot"/><span>{scene===0?'THE CASE':scene===1?'THE EVIDENCE':'THE HUMAN DECISION'}</span><span>0{scene+1} / 03</span></div>
      {scene===0&&<>
       <div className="cine-story-body">
        <div className="cine-issue-label"><span className={'cine-issue-pulse '+narrative.accent}/>{narrative.eyebrow}</div>
        <h1>{narrative.headline}</h1>
        <p className="cine-lede">{narrative.subhead}</p>
        <div className="cine-rule"/>
        <div className="cine-facts"><div><span>CASE</span><b>{selected.id}</b></div><div><span>DOCUMENTS</span><b>{selected.documents.length} Originale</b></div><div><span>CHECK</span><b>{receipt?.count} von {receipt?.total} Zitaten</b></div></div>
       </div>
       <div className="cine-story-actions">
        <button type="button" className="cine-primary" onClick={()=>openScene(1)}>Beleg entdecken <span>↗</span></button>
        <p>Die nächste Szene zeigt eine tatsächlich auffindbare Textstelle – keine behauptete KI-Gewissheit.</p>
        <button type="button" className="cine-mobile-source-link" onClick={()=>setFullPdf(true)}>Originaldokument als Vollbild ansehen ↗</button>
       </div>
      </>}
      {scene===1&&<>
       <div className="cine-story-body">
        <div className="cine-issue-label"><span className={'cine-issue-pulse '+narrative.accent}/>{narrative.eyebrow}</div>
        <h1 className="cine-finding-title">{narrative.findingTitle}</h1>
        <p className="cine-lede">{narrative.findingSubtitle}</p>
        <div className="cine-evidence-section">
         <div className="cine-section-name"><span>SELECT A SOURCE</span><b>{receipt?.count}/{receipt?.total} EXACT</b></div>
         <div className="cine-evidence-list" ref={sourcesRef}>
          {selected.citations.length?selected.citations.map(c=><button type="button" key={c.id} className={valid?.id===c.id?'active':''} onClick={()=>visit(c)}>
           <span className="cine-evidence-index">{c.id}</span><span className="cine-evidence-name"><strong>{c.label}</strong><small>{roles[c.role]} · Seite {c.page}</small></span><span className={'cine-evidence-valid '+(checkCitation(selected.documents,c)?'yes':'no')}>{checkCitation(selected.documents,c)?'↗':'!'}</span>
          </button>):<p className="cine-empty-citations">Keine lesbaren Quellenanker. Fachprüfung erforderlich.</p>}
         </div>
         <div className={'cine-quote '+(valid?'valid':'invalid')}>
          <span>{valid?'WORTGLEICH IM ORIGINAL':'KEIN GÜLTIGER BELEG'}</span>
          <p>{valid?'“'+valid.quote+'”':'Ohne gültige Originalfundstelle wird keine Quellenbestätigung angezeigt.'}</p>
         </div>
         <button type="button" className="cine-mobile-source-link" onClick={()=>setFullPdf(true)}>Fundstelle im Original-PDF sehen ↗</button>
        </div>
       </div>
       <div className="cine-story-actions">
        <button type="button" className="cine-primary" onClick={()=>openScene(2)}>Nächste Handlung <span>↗</span></button>
        <p>{narrative.progressHint}</p>
       </div>
      </>}
      {scene===2&&<>
       <div className="cine-story-body">
        <div className="cine-issue-label"><span className={'cine-issue-pulse '+narrative.accent}/>{narrative.eyebrow}</div>
        <h1 className="cine-action-title">The decision stays human.</h1>
        <p className="cine-lede">{selected.assessment.nextStep}</p>
        <div className="cine-action-gate">
         <div className="cine-section-name"><span>BEFORE YOU ACT</span><b>MANUAL REVIEW</b></div>
         <div className="cine-gate-row"><span className={selected.assessment.missingRoles.length?'cross':'tick'}>{selected.assessment.missingRoles.length?'×':'✓'}</span><span>Pflichtdokumente</span><b>{selected.assessment.missingRoles.length?'Fehlen':'Vorhanden'}</b></div>
         <div className="cine-gate-row"><span className={selected.assessment.scannedOrEmptyPages?'cross':'tick'}>{selected.assessment.scannedOrEmptyPages?'×':'✓'}</span><span>Lesbare Seiten</span><b>{selected.assessment.scannedOrEmptyPages?'Prüfen':'Lesbar'}</b></div>
         <div className="cine-gate-row"><span className={!receipt?.complete?'cross':'tick'}>{receipt?.complete?'✓':'!'}</span><span>Exakte Quellenanker</span><b>{receipt?.count}/{receipt?.total}</b></div>
        </div>
        <div className="cine-note-area">
         <label htmlFor="cine-operator-note">OPERATOR-NOTIZ <span>· nur in dieser Sitzung</span></label>
         <textarea id="cine-operator-note" rows={3} value={note} maxLength={600} onChange={e=>setNote(e.target.value)} placeholder="Was muss eine Fachperson wissen?"/>
        </div>
        {selected.stage==='reviewed'||selected.stage==='waiting'?<div className="cine-completed">
         <strong>{selected.stage==='reviewed'?'Schritt dokumentiert.':'Unterlagen ausstehend.'}</strong>
         <p>Keine Nachricht versandt, kein Anspruch entschieden. Frühere Einträge bleiben im lokalen Audit.</p>
         <div className="cine-completed-actions"><button type="button" onClick={reopen}>Fall erneut öffnen</button>{next&&<button type="button" onClick={()=>selectCase(next.id)}>Nächster Fall ↗</button>}</div>
        </div>:<div className="cine-review-actions">
         {actions.includes('ready_for_expert')&&<button type="button" className="cine-primary" onClick={()=>commit('ready_for_expert')}>Zur Fachprüfung <span>↗</span></button>}
         {actions.includes('refer_specialist')&&<button type="button" className="cine-primary" onClick={()=>commit('refer_specialist')}>An Spezialist:in <span>↗</span></button>}
         {actions.includes('request_documents')&&<button type="button" className="cine-secondary" onClick={()=>commit('request_documents')}>Unterlagen nachfordern <span>＋</span></button>}
        </div>}
        <div className="cine-technical-tools">
         <button type="button" disabled={busy} onClick={()=>attachFiles.current?.click()}>＋ Neue Dokumente ergänzen</button>

         <details><summary>Dokumentarten prüfen & korrigieren</summary>
          {selected.documents.map(d=><label key={d.id}><span title={d.name}>{d.name}</span><select value={d.role} aria-label={'Dokumentart für '+d.name} onChange={e=>changeRole(d.id,e.target.value as DocumentRole)}>{Object.entries(roles).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>)}
         </details>
        </div>
        <div className="cine-audit-history">
         <span>LOKALE ENTSCHEIDUNGSSPUR <b>{selected.events.length}</b></span>
         {selected.events.slice().reverse().map((e,i)=><p key={i}>{e.kind==='reopened'?'Wieder geöffnet':e.action?reviewLabels[e.action]:'Prüfung'} <small>{e.kind==='review'?fmtDuration(e.durationMs):'Neu bewertet'}</small></p>)}
        </div>
       </div>
       <div className="cine-story-actions">
        <button type="button" className="cine-ghost-action" onClick={()=>downloadSession(exportDeskAudit(cases))}>Sitzungsbericht ohne Rohdaten ↓</button>
        <p>Weder Auszahlung noch Ablehnung, E-Mail oder Systemeintrag wird automatisch ausgeführt.</p>
       </div>
      </>}
     </div>:<div className="cine-story-loading">{busy?'Die Akte wird vorbereitet …':'Kein Fall geladen.'}</div>}
    </div>
   </section>
   {fullPdf&&<div className="cine-pdf-overlay" role="dialog" aria-modal="true" aria-label="Originaldokument Vollbild">
    <div className="cine-pdf-modal">
     <div className="cine-pdf-modal-top">
      <div><span>ORIGINAL / {caseId}</span><strong>{doc?.name??'Keine Datei'}</strong></div>
      <button ref={fullPdfClose} type="button" className="cine-pdf-dismiss" onClick={()=>setFullPdf(false)}>Schließen ×</button>
     </div>
     <div className="cine-pdf-modal-tools">
      <div className="cine-document-tabs" role="group" aria-label="Dokumente im Vollbild">
       {selected?.documents.map(d=><button key={d.id} type="button" className={doc?.id===d.id?'selected':''} onClick={()=>chooseDoc(d.id)}>{roles[d.role]}</button>)}
      </div>
      <div className="cine-page-controls">
       <button type="button" aria-label="Vollbild vorherige Seite" disabled={displayedPage<=1} onClick={()=>{setPage(p=>p-1);setCitationId('')}}>‹</button>
       <output>{displayedPage} / {doc?.pages.length??0}</output>
       <button type="button" aria-label="Vollbild nächste Seite" disabled={displayedPage>=(doc?.pages.length??0)} onClick={()=>{setPage(p=>p+1);setCitationId('')}}>›</button>
       <button type="button" aria-label="Vollbild PDF verkleinern" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}>−</button>
       <output>{Math.round(zoom*100)}%</output>
       <button type="button" aria-label="Vollbild PDF vergrößern" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}>+</button>
      </div>
     </div>
     <PdfStage key={'full-'+caseId+'-'+(doc?.id??'none')+'-'+displayedPage} document={doc} page={displayedPage} citation={mode==='work'||scene>0?valid:null} zoom={zoom} caseId={caseId}/>
     <p className="cine-pdf-modal-note">Original-PDF · lokale Textprüfung · keine automatische Deckungsentscheidung</p>
    </div>
   </div>}
   <div className="cine-bottom-rail">
    <div><span className="cine-bottom-orbit"/> THE EVIDENCE REMAINS THE HERO</div>
    <div><button type="button" onClick={()=>setDrawer(true)}>Alle Fälle ansehen <span>↗</span></button><span>1 / 2 / 3: Szene wechseln</span></div>
   </div>
   <footer className="cine-footer">
    <div><span>CLAIM / OS — INDEPENDENT WORK SAMPLE</span><p>Fiktive Daten. Regelbasierte Prüfung, keine Live-KI, kein produktiver Versicherungsprozess. Wortgleich ≠ fachlich bestätigt.</p></div>
    <div><button type="button" disabled={busy} onClick={()=>{
     if(cases.some(c=>c.source==='local_upload'||c.events.length)&&!window.confirm('Lokale Fälle, Notizen und Review-Verlauf zurücksetzen?'))return
     void readCase()
    }}>Demo zurücksetzen ↺</button><a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">Source / tests ↗</a></div>
   </footer>
  </main>
  {drawer&&<div className="cine-drawer-layer">
   <button type="button" className="cine-drawer-scrim" aria-label="Fallliste schließen" onClick={()=>setDrawer(false)}/>
   <aside className="cine-drawer" role="dialog" aria-modal="true" aria-label="Fallliste">
    <div className="cine-drawer-head"><div><span>THE QUEUE</span><h2>Every case has a story.</h2></div><button type="button" aria-label="Fallliste schließen" onClick={()=>setDrawer(false)}>×</button></div>
    <label className="cine-queue-search"><span>⌕</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Fall suchen …" aria-label="Fall suchen"/></label>
    <div className="cine-queue-filter" role="group" aria-label="Fallfilter">
     {([{id:'all',label:'Alle'},{id:'exceptions',label:'Ausnahmen'},{id:'waiting',label:'Wartet'},{id:'done',label:'Übergeben'}] as {id:QueueFilter;label:string}[]).map(f=><button key={f.id} type="button" aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}>{f.label}</button>)}
    </div>
    <div className="cine-queue-list">
     {visible.map((c,i)=><button key={c.id} className={c.id===caseId?'selected':''} type="button" onClick={()=>selectCase(c.id)}>
      <span>0{i+1} <b>{c.id}</b><i className={c.assessment.status==='REVIEW_READY'?'green':'amber'}/></span>
      <strong>{c.title}</strong><small>{c.stage==='waiting'?'Unterlagen ausstehend':c.stage==='reviewed'?'An Fachprüfung übergeben':severityLabels[c.assessment.status]} · {c.documents.length} Dokumente</small>
     </button>)}
     {!visible.length&&<p className="cine-queue-empty">Keine Fälle für diesen Filter.</p>}
    </div>
    <div className="cine-drawer-foot"><span>{totals.unresolved} offen · {totals.waiting} wartet · {totals.reviewed} übergeben</span><button type="button" onClick={()=>{setDrawer(false);inputFiles.current?.click()}}>+ PDF importieren</button></div>
   </aside>
  </div>}
 </div>
}
