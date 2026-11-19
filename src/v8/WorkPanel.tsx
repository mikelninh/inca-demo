import type {DocumentRole,PageCitation} from '../doclab/pdfEvidence'
import {checkCitation} from '../doclab/pdfEvidence'
import {allowedActions,reviewLabels,severityLabels} from '../desk/deskCore'
import type {DeskCase,ReviewAction} from '../desk/deskCore'
import {narrativeReceipt,storyFor} from '../v7/story'

const roleLabels:Record<DocumentRole,string>={
 claim:'Schadenmeldung',policy:'Police',invoice:'Rechnung',unknown:'Nicht zugeordnet'
}
type Props={
 current:DeskCase;
 citationId:string;
 note:string;
 onNote:(value:string)=>void;
 onCitation:(value:PageCitation)=>void;
 onAction:(value:ReviewAction)=>void;
 onReopen:()=>void;
 onNext:()=>void;
 hasNext:boolean;
 onAdd:()=>void;
 onViewPdf:()=>void;
 onRole:(id:string,value:DocumentRole)=>void;
 onExport:()=>void;
}
export default function WorkPanel({
 current,citationId,note,onNote,onCitation,onAction,onReopen,onNext,hasNext,onAdd,onViewPdf,onRole,onExport
}:Props){
 const story=storyFor(current)
 const proof=narrativeReceipt(current)
 const actions=allowedActions(current)
 const focus=current.citations.find(c=>c.id===citationId)
 const canVerify=focus?checkCitation(current.documents,focus):false
 const complete=current.assessment.status==='REVIEW_READY'
 const wasDone=current.stage!=='open'
 const primary=complete?'ready':current.assessment.status.startsWith('STOP')?'stop':'review'
 return <div className="cine-work-panel" data-testid="work-mode">
  <div className="cine-work-kicker"><span className={'cine-work-light '+primary}/><span>OPERATOR VIEW · {current.id}</span><span className="cine-work-manual">HUMAN IN CONTROL</span></div>
  <div className="cine-work-summary">
   <span className="cine-work-eyebrow">{story.eyebrow}</span>
   <h1>{story.findingTitle}</h1>
   <p>{current.assessment.rationale}</p>
   <div className="cine-work-context"><span>{severityLabels[current.assessment.status]}</span><span>{current.documents.length} Dokumente</span><span>{proof.count}/{proof.total} Textbelege</span></div>
   <button type="button" className="cine-work-source-cta" onClick={onViewPdf}>Original-PDF mit Fundstelle öffnen <span>↗</span></button>
  </div>
  <div className="cine-work-proof">
   <div className="cine-work-section-line"><strong>01 <span>Quellenprüfung</span></strong><small>Wörtliche Originalfundstellen</small></div>
   <div className="cine-work-citation-grid">
    {current.citations.length>0?current.citations.map(c=><button key={c.id} type="button"
      className={'cine-work-citation '+(citationId===c.id?'active':'')}
      onClick={()=>onCitation(c)}>
      <span>{c.label}</span><small>{roleLabels[c.role]} · S. {c.page}</small><b>{checkCitation(current.documents,c)?'↗':'!'}</b>
    </button>):<p className="cine-work-missing">Keine überprüfbaren Textanker. Menschliche Sichtprüfung erforderlich.</p>}
   </div>
   <div className="cine-work-quote" aria-live="polite">
    <span>{canVerify?'WORTGLEICH IM ORIGINAL':'NOCH KEIN GÜLTIGER ORIGINALBELEG'}</span>
    <p>{canVerify&&focus?'„'+focus.quote+'“':'Wähle einen belegten Textausschnitt oder öffne die vollständige PDF-Quelle.'}</p>
   </div>
  </div>
  <div className="cine-work-decision">
   <div className="cine-work-section-line"><strong>02 <span>Menschliche Handlung</span></strong><small>Kein automatischer Entscheid</small></div>
   <div className="cine-work-next"><span>EMPFOHLENER NÄCHSTER SCHRITT</span><p>{current.assessment.nextStep}</p></div>
   <div className="cine-work-gates">
    <span className={current.assessment.missingRoles.length?'issue':'ok'}>{current.assessment.missingRoles.length?'×':'✓'} Pflichtdokumente</span>
    <span className={current.assessment.scannedOrEmptyPages?'issue':'ok'}>{current.assessment.scannedOrEmptyPages?'×':'✓'} Textlesbarkeit</span>
    <span className={proof.complete?'ok':'issue'}>{proof.complete?'✓':'!'} Quellenanker</span>
   </div>
   <label className="cine-work-note" htmlFor="cine-work-note">Notiz an die Fachprüfung
    <textarea id="cine-work-note" rows={2} value={note} maxLength={600}
     onChange={e=>onNote(e.currentTarget.value)} placeholder="Optional · bleibt nur in dieser Sitzung"/>
   </label>
   {wasDone?<div className="cine-work-finished" role="status">
    <b>{current.stage==='waiting'?'Unterlagen angefordert.':'An Fachprüfung übergeben.'}</b>
    <p>Nur lokal protokolliert. Keine E-Mail oder Versicherungsentscheidung ausgeführt.</p>
    <div><button type="button" onClick={onReopen}>Fall erneut öffnen</button>{hasNext&&<button type="button" onClick={onNext}>Nächster offener Fall ↗</button>}</div>
   </div>:<div className="cine-work-buttons">
    {actions.includes('ready_for_expert')&&<button type="button" className="cine-work-primary" onClick={()=>onAction('ready_for_expert')}>✓ Zur Fachprüfung <span>↗</span></button>}
    {actions.includes('refer_specialist')&&<button type="button" className="cine-work-primary" onClick={()=>onAction('refer_specialist')}>→ An Spezialist:in <span>↗</span></button>}
    {actions.includes('request_documents')&&<button type="button" className="cine-work-secondary" onClick={()=>onAction('request_documents')}>＋ Unterlagen nachfordern</button>}
   </div>}
   <div className="cine-work-tools">
    <button type="button" onClick={onAdd}>+ PDF zu diesem Fall ergänzen</button>
    <details><summary>Dokumentarten korrigieren</summary>
     {current.documents.map(d=><label key={d.id}>
      <span title={d.name}>{d.name}</span>
      <select aria-label={'Dokumentart für '+d.name} value={d.role}
       onChange={e=>onRole(d.id,e.target.value as DocumentRole)}>
       {Object.entries(roleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
     </label>)}
    </details>
    <button type="button" onClick={onExport}>Anonymes Sitzungsprotokoll ↓</button>
   </div>
   {current.events.length>0&&<div className="cine-work-history">
    {current.events.slice().reverse().map((e,i)=><p key={i}><span>{e.kind==='reopened'?'↺':'✓'} {e.kind==='reopened'?'Wieder geöffnet':e.action?reviewLabels[e.action]:'Bearbeitet'}</span><small>{e.kind==='review'?'Lokal protokolliert':'Quelle neu geprüft'}</small></p>)}
   </div>}
  </div>
 </div>
}
