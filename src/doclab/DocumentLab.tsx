import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {ChangeEvent} from 'react'
import {scenarios,createScenarioPdfs} from './samples'
import {MAX_PDF_BYTES,parsePdfBytes,drawPdfPage} from './pdfReader'
import {assessDossier,checkCitation,createCitations,exportSafeAudit,sniffRole} from './pdfEvidence'
import type {ParsedDocument,DocumentRole,PageCitation} from './pdfEvidence'
import './documentLab.css'

type Fault='none'|'drop_invoice'|'tamper_quote'
function downloadBlob(blob:Blob,name:string){
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),2000)
}
function PdfPreview({document,page}:{document:ParsedDocument|null;page:number}){
  const canvas=useRef<HTMLCanvasElement>(null)
  const [error,setError]=useState('')
  const [ready,setReady]=useState(false)
  useEffect(()=>{
    let cancelled=false
    setReady(false);setError('')
    if(!document||!canvas.current)return
    const target=canvas.current
    void drawPdfPage(document.bytes,page,target)
      .then(()=>{if(!cancelled)setReady(true)})
      .catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'PDF-Vorschau fehlgeschlagen.')})
    return()=>{cancelled=true}
  },[document,page])
  return <div className="doclab-preview-frame">
    {!document&&<p>Keine PDF ausgewählt.</p>}
    {document&&<><canvas ref={canvas} aria-label={'Gerenderte PDF-Seite '+page} className="doclab-pdf-canvas"/>
      {!ready&&!error&&<div className="doclab-pdf-wait">PDF-Seite wird lokal gerendert …</div>}
      {error&&<p role="alert" className="doclab-error">{error}</p>}
    </>}
  </div>
}
const roleNames:Record<DocumentRole,string>={claim:'Schadenmeldung',policy:'Police / Vertrag',invoice:'Rechnung',unknown:'Noch zuordnen'}
const statusNames:Record<string,string>={
  STOP_MISSING_SOURCE:'STOP / Fehlende Unterlagen',
  STOP_UNREADABLE:'STOP / Nicht lesbar',
  STOP_CITATION_INVALID:'STOP / Fundstelle ungültig',
  REVIEW_DISCREPANCY:'REVIEW / Widerspruch',
  REQUEST_EVIDENCE:'REVIEW / Angaben fehlen',
  REVIEW_READY:'REVIEW / Prüffähig'
}
function Highlight({pageText,citation}:{pageText:string;citation:PageCitation|null}){
  if(!citation)return <span>Wähle eine Fundstelle, um den exakten Textanker zu sehen.</span>
  const text=pageText
  const from=citation.offset
  const to=from+citation.quote.length
  if(text.slice(from,to)!==citation.quote)
    return <span>Warnung: Der Textanker ist nicht mehr gültig.</span>
  return <>
    <span>{text.slice(Math.max(0,from-48),from)}</span>
    <mark>{citation.quote}</mark>
    <span>{text.slice(to,Math.min(text.length,to+65))}</span>
  </>
}
export default function DocumentLab(){
  const [docs,setDocs]=useState<ParsedDocument[]>([])
  const [activeId,setActiveId]=useState('')
  const [activePage,setActivePage]=useState(1)
  const [activeCitationId,setActiveCitationId]=useState('')
  const [loading,setLoading]=useState(false)
  const [failure,setFailure]=useState('')
  const [scenarioId,setScenarioId]=useState('parking')
  const [fault,setFault]=useState<Fault>('none')
  const [notice,setNotice]=useState('')
  const runCounter=useRef(0)
  const loadScenario=useCallback(async(id:string)=>{
    const run=++runCounter.current
    setLoading(true);setFailure('');setFault('none');setNotice('')
    try{
      const collection=await createScenarioPdfs(id)
      const parsed:ParsedDocument[]=[]
      for(const source of collection.docs){
        const doc=await parsePdfBytes(source.bytes,source.id,source.name,source.role,'generated_sample')
        parsed.push(doc)
      }
      if(run!==runCounter.current)return
      setDocs(parsed);setScenarioId(id);setActiveId(parsed[0]?.id??'');setActivePage(1);setActiveCitationId('')
    }catch(e){if(run===runCounter.current)setFailure(e instanceof Error?e.message:String(e))}
    finally{if(run===runCounter.current)setLoading(false)}
  },[])
  useEffect(()=>{void loadScenario('parking');return()=>{runCounter.current++}},[loadScenario])
  async function openUploads(event:ChangeEvent<HTMLInputElement>){
    const files=Array.from(event.currentTarget.files??[])
    if(!files.length)return
    event.currentTarget.value=''
    const run=++runCounter.current
    setLoading(true);setFailure('');setNotice('');setFault('none')
    try{
      if(files.length>4)throw Error('Bitte maximal vier PDFs gleichzeitig auswählen.')
      const parsed:ParsedDocument[]=[]
      for(let i=0;i<files.length;i++){
        const file=files[i]
        if(file.size>MAX_PDF_BYTES)throw Error(file.name+': größer als 8 MB.')
        if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf')
          throw Error('Nur PDF-Dateien erlaubt.')
        const raw=new Uint8Array(await file.arrayBuffer())
        parsed.push(await parsePdfBytes(raw,'UPLOAD-'+(i+1),file.name,sniffRole(file.name),'user_upload'))
      }
      if(run!==runCounter.current)return
      setDocs(parsed);setScenarioId('upload');setActiveId(parsed[0]?.id??'');setActivePage(1);setActiveCitationId('')
      setNotice('Dateien ausschliesslich lokal geöffnet. Prüfe die Dokumenttypen und Quellenzitate.')
    }catch(e){if(run===runCounter.current)setFailure(e instanceof Error?e.message:String(e))}
    finally{if(run===runCounter.current)setLoading(false)}
  }
  const effectiveDocs=useMemo(()=>fault==='drop_invoice'?docs.filter(d=>d.role!=='invoice'):docs,[docs,fault])
  const originalCitations=useMemo(()=>createCitations(effectiveDocs),[effectiveDocs])
  const citations=useMemo(()=>{
    if(fault!=='tamper_quote'||!originalCitations.length)return originalCitations
    return originalCitations.map((c,i)=>i===0?{...c,quote:c.quote+' [ERFUNDEN]'}:c)
  },[fault,originalCitations])
  const assessment=useMemo(()=>assessDossier(effectiveDocs,citations),[effectiveDocs,citations])
  const currentDoc=effectiveDocs.find(x=>x.id===activeId)??effectiveDocs[0]??null
  const safePage=Math.max(1,Math.min(activePage,currentDoc?.pages.length??1))
  const currentCitation=citations.find(x=>x.id===activeCitationId)??null
  const activeAnchor=currentCitation&&currentCitation.documentId===currentDoc?.id&&
    currentCitation.page===safePage?currentCitation:null
  const pageContent=currentDoc?.pages.find(x=>x.page===safePage)?.text??''
  const isValid=activeAnchor?checkCitation(effectiveDocs,activeAnchor):null
  const exactCount=citations.filter(x=>checkCitation(effectiveDocs,x)).length
  const activeScenario=scenarios.find(s=>s.id===scenarioId)
  function visitCitation(c:PageCitation){
    setActiveCitationId(c.id);setActiveId(c.documentId);setActivePage(c.page)
    setNotice('Fundstelle '+c.id+' auf Seite '+c.page+' geöffnet. Textanker: '+(checkCitation(effectiveDocs,c)?'wortgleich':'UNGUELTIG')+'.')
  }
  function chooseDoc(id:string){
    setActiveId(id);setActivePage(1);setActiveCitationId('')
  }
  function changeRole(id:string,role:DocumentRole){
    setDocs(old=>old.map(x=>x.id===id?{...x,role}:x));setFault('none')
    setActiveCitationId('')
  }
  function exportAudit(){
    const json=JSON.stringify(exportSafeAudit(effectiveDocs,assessment),null,2)+'\n'
    downloadBlob(new Blob([json],{type:'application/json'}),'inca-local-pdf-audit.json')
    setNotice('Lokaler Audit-Export gespeichert. Keine Originaltexte, Dateinamen oder PDF-Daten exportiert.')
  }
  function downloadSample(){
    if(!currentDoc||currentDoc.origin!=='generated_sample')return
    const safe=Uint8Array.from(currentDoc.bytes)
    downloadBlob(new Blob([safe.buffer as ArrayBuffer],{type:'application/pdf'}),currentDoc.name)
  }
  return <div className="doclab">
    <a className="doclab-skip" href="#doclab-workspace">Zum PDF-Arbeitsplatz</a>
    <header className="doclab-nav">
      <div className="doclab-nav-inner">
        <a className="doclab-brand" href={import.meta.env.BASE_URL}><span className="doclab-brand-square">i</span>INCA <small>/ EVIDENCE LAB</small></a>
        <div className="doclab-links"><a href={import.meta.env.BASE_URL+'?ops=1'}>Control Tower ↗</a><a href={import.meta.env.BASE_URL+'?study=1'}>Human Study ↗</a><span>v0.3 · RESEARCH PROTOTYPE</span></div>
      </div>
    </header>
    <main>
      <section className="doclab-hero">
        <div className="doclab-hero-inner">
          <div><span className="doclab-overline"><i/> DOCUMENT-TO-DECISION / NEW</span>
            <h1>Read the document.<br/><em>Show the evidence.</em></h1>
            <p>Keine vorbereiteten Textfelder mehr: Diese Version erzeugt echte PDFs, liest deren Seiten im Browser und zeigt jeden überprüfbaren Textbeleg direkt neben dem Original.</p>
          </div>
          <div className="doclab-hero-stamp"><span>PDF</span><strong>→</strong><span>PAGE</span><strong>→</strong><span>REVIEW</span><small>Kein Modellaufruf · Kein Cloud-Upload · Kein Zahlungsauftrag</small></div>
        </div>
      </section>
      <section className="doclab-limit" aria-label="Einsatzgrenzen">
        <strong>Forschungsmodus, nicht produktiv.</strong>
        <span>PDF.js extrahiert Text; regelbasierte Prüfsignale sind keine KI-Entscheidung. Keine OCR, keine Police-Auslegung durch Expert:innen und keine Versichereranbindung.</span>
      </section>
      <section className="doclab-controls" id="doclab-workspace">
        <div className="doclab-control-title"><span>01 / INPUT</span><h2>Ein Dossier einlesen</h2><p>Starte mit drei reproduzierbaren PDF-Fällen oder öffne eigene Unterlagen ausschliesslich lokal.</p></div>
        <div className="doclab-control-row">
          <div className="doclab-scenario-list">
            {scenarios.map(s=><button type="button" key={s.id} onClick={()=>void loadScenario(s.id)}
              className={scenarioId===s.id?'active':''} disabled={loading}>
              <strong>{s.label}</strong><span>{s.tagline}</span></button>)}
          </div>
          <label className="doclab-upload">
            <span>Eigene PDFs prüfen</span><strong><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="21" height="21" aria-hidden="true"><path d="M12 16V3m0 0 4 4m-4-4L8 7M4 17v3h16v-3"/></svg> PDF-Dateien auswählen</strong>
            <small>Max. 4 Dateien · je 8 MB · max. 12 Seiten · keine Übermittlung</small>
            <input type="file" accept=".pdf,application/pdf" multiple onChange={e=>void openUploads(e)}/>
          </label>
        </div>
        {loading&&<p role="status" className="doclab-info">PDFs werden lokal generiert und Seiten extrahiert …</p>}
        {failure&&<p role="alert" className="doclab-error">{failure}</p>}
        <div className="doclab-stats">
          <div><small>Lesbare PDFs</small><strong>{effectiveDocs.length}</strong></div>
          <div><small>Extrahierte Seiten</small><strong>{effectiveDocs.reduce((n,d)=>n+d.pages.length,0)}</strong></div>
          <div><small>Wortgleiche Seitenbelege</small><strong>{exactCount} / {citations.length}</strong></div>
          <div><small>Autonome Auszahlungen</small><strong>0</strong></div>
        </div>
      </section>
      <section className="doclab-workspace">
        <aside className="doclab-files">
          <div className="doclab-panel-heading"><span>02 / DOCUMENTS</span><h3>Quellakte</h3></div>
          {effectiveDocs.map(d=><div className={'doclab-file '+(currentDoc?.id===d.id?'active':'')} key={d.id}>
            <button type="button" onClick={()=>chooseDoc(d.id)}><span className="doclab-file-icon">PDF</span><strong>{d.name}</strong><small>{d.pages.length} Seite(n) · {d.origin==='generated_sample'?'Demo':'Lokal'}</small></button>
            <label htmlFor={'doc-role-'+d.id}>Dokumentart</label>
            <select id={'doc-role-'+d.id} value={d.role} onChange={e=>changeRole(d.id,e.target.value as DocumentRole)}>
              {(Object.keys(roleNames) as DocumentRole[]).map(role=><option key={role} value={role}>{roleNames[role]}</option>)}
            </select>
          </div>)}
          {!effectiveDocs.length&&<p className="doclab-empty">Keine PDF geladen.</p>}
          <p className="doclab-panel-hint">Die Zuordnung ist eine manuell prüfbare Annahme. Deine Dateien bleiben in dieser Browser-Sitzung.</p>
          <div className="doclab-citation-title"><strong>Seiten-Fundstellen</strong><small>{citations.length} Zitate</small></div>
          <div className="doclab-citation-list">
            {citations.map(c=><button type="button" key={c.id} onClick={()=>visitCitation(c)}
              className={activeCitationId===c.id?'active':''}>
              <span>{c.id} · SEITE {c.page} <b>{checkCitation(effectiveDocs,c)?'✓':'×'}</b></span>
              <strong>{c.label}</strong><small>{c.quote.slice(0,78)}{c.quote.length>78?'…':''}</small>
            </button>)}
          </div>
        </aside>
        <section className="doclab-reader">
          <div className="doclab-panel-heading"><span>03 / PAGE VIEWER</span><h3>PDF + überprüfbarer Textanker</h3></div>
          <div className="doclab-reader-toolbar">
            <span>{currentDoc?.name??'Keine Quelle'}</span>
            <div><button type="button" disabled={safePage<=1} onClick={()=>{setActivePage(p=>p-1);setActiveCitationId('')}} aria-label="Vorherige Seite">←</button><strong>{safePage} / {currentDoc?.pages.length??0}</strong><button type="button" disabled={safePage>=(currentDoc?.pages.length??0)} onClick={()=>{setActivePage(p=>p+1);setActiveCitationId('')}} aria-label="Nächste Seite">→</button></div>
            <button type="button" onClick={downloadSample} disabled={!currentDoc||currentDoc.origin!=='generated_sample'}>PDF herunterladen ↓</button>
          </div>
          <PdfPreview document={currentDoc} page={safePage}/>
          <div className="doclab-page-source">
            <div><span>EXTRAHIERTER SEITENTEXT</span><strong>{activeAnchor?'Fundstelle '+activeAnchor.id:isValid===false?'Ungültig':'Wähle einen Quellenanker'}</strong></div>
            <p><Highlight pageText={pageContent} citation={activeAnchor}/></p>
          </div>
        </section>
        <aside className="doclab-review">
          <div className="doclab-panel-heading"><span>04 / CONTROL GATE</span><h3>Nachvollziehbare Übergabe</h3></div>
          <div className={'doclab-status '+(assessment.status.startsWith('STOP')?'stop':assessment.status==='REVIEW_READY'?'neutral':'review')}>
            <small>STATUS · KEINE AUTOMATISCHE REGULIERUNG</small>
            <strong>{statusNames[assessment.status]}</strong>
            <p>{assessment.headline}</p>
          </div>
          <div className="doclab-reason"><span>WARUM?</span><p>{assessment.rationale}</p></div>
          <div className="doclab-checklist">
            <span>BELEGKETTE</span>
            <div><b className={assessment.missingRoles.length?'bad':'good'}>{assessment.missingRoles.length?'×':'✓'}</b><strong>Erforderliche Dokumenttypen</strong><small>{assessment.missingRoles.length?'Fehlt: '+assessment.missingRoles.map(x=>roleNames[x]).join(', '):'Meldung, Vertrag, Rechnung vorhanden'}</small></div>
            <div><b className={assessment.scannedOrEmptyPages?'bad':'good'}>{assessment.scannedOrEmptyPages?'×':'✓'}</b><strong>Seiten mit lesbarem Text</strong><small>{assessment.scannedOrEmptyPages?assessment.scannedOrEmptyPages+' unlesbare Seite(n)':'Alle geladenen PDF-Seiten enthalten Text'}</small></div>
            <div><b className={assessment.validCitations!==assessment.totalCitations||!assessment.totalCitations?'bad':'good'}>{assessment.validCitations!==assessment.totalCitations||!assessment.totalCitations?'×':'✓'}</b><strong>Quellenanker exakt</strong><small>{assessment.validCitations} / {assessment.totalCitations} Zeichenketten stimmen überein</small></div>
            <div><b className="pending">!</b><strong>Unabhängige Sachprüfung</strong><small>Ausstehend · nicht durch einen Textanker ersetzt</small></div>
            <div><b className="bad">×</b><strong>Automatische Freigabe</strong><small>Deaktiviert für alle Fälle</small></div>
          </div>
          <div className="doclab-next"><span>NÄCHSTER ARBEITSSCHRITT</span><p>{assessment.nextStep}</p></div>
          <div className="doclab-fault">
            <span>05 / STRESS TEST · FAIL CLOSED</span>
            <p>Unterbrich absichtlich die Quellenkette. Kein stilles Weiterlaufen.</p>
            <div>
              {([{id:'none',label:'Normal'},{id:'drop_invoice',label:'Rechnung entfernen'},{id:'tamper_quote',label:'Zitat manipulieren'}] as {id:Fault,label:string}[]).map(x=><button type="button" key={x.id} aria-pressed={fault===x.id} className={fault===x.id?'active':''} onClick={()=>{setFault(x.id);setActiveCitationId('');setNotice('Sicherheitsprüfung auf veränderten Testdaten erneut ausgeführt.')}}>{x.label}</button>)}
            </div>
          </div>
          <button type="button" className="doclab-export" onClick={exportAudit}>Prüfquittung ohne Rohdaten exportieren <span>↓</span></button>
          <p role="status" className="doclab-notice">{notice}</p>
        </aside>
      </section>
      <section className="doclab-method">
        <div><span>06 / TRUST BOUNDARY</span><h2>Our standard isn't a confident answer.<br/><em>It's an inspectable one.</em></h2>
        <p>Diese Version verarbeitet echte PDF-Bytes, zeigt Seiten und prüft wortgetreue Textanker. Sie behauptet ausdrücklich **keine** Live-Modellinferenz, verifizierte juristische Begründung oder gemessene Zeitersparnis.</p></div>
        <div className="doclab-method-steps"><div><b>01</b><strong>INPUT</strong><small>PDF-Bytes lokal öffnen</small></div><div><b>02</b><strong>PROVENANCE</strong><small>Seite und exakten Text belegen</small></div><div><b>03</b><strong>HARD GATE</strong><small>Fehlendes oder manipuliertes Beweismaterial stoppen</small></div><div><b>04</b><strong>HUMAN</strong><small>Fachliche Entscheidung verantworten</small></div></div>
      </section>
      <footer className="doclab-footer"><span>INCA DOCUMENT EVIDENCE LAB · Independent prototype</span><span>Keine Originalkunden · Keine Cloud-Anbindung · Kein AI-Modell · Keine automatischen Zahlungen</span><a href="https://github.com/mikelninh/inca-demo" target="_blank" rel="noopener noreferrer">Source & tests ↗</a></footer>
    </main>
  </div>
}
