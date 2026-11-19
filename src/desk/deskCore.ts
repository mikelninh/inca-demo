import {assessDossier,checkCitation,createCitations} from '../doclab/pdfEvidence'
import type {ParsedDocument,PageCitation,DossierAssessment,DocumentRole} from '../doclab/pdfEvidence'

export type ReviewAction='request_documents'|'refer_specialist'|'ready_for_expert'
export type DeskStage='open'|'waiting'|'reviewed'
export type DeskEvent={
 kind:'review'|'reopened';action?:ReviewAction;durationMs:number;at:string;
 note?:string;reason?:string
}
export type DeskCase={
 id:string;title:string;source:'synthetic'|'local_upload';documents:ParsedDocument[];
 citations:PageCitation[];assessment:DossierAssessment;stage:DeskStage;
 events:DeskEvent[];createdAt:string
}
export type DeskSummary={
 total:number;unresolved:number;exceptions:number;waiting:number;reviewed:number;
 reviewedWithMeasuredTime:number;measuredActiveMs:number;
 timeSavedAgainstBaseline:null;expertValidated:false
}
export const reviewLabels:Record<ReviewAction,string>={
 request_documents:'Unterlagen nachfordern',
 refer_specialist:'An Fachprüfung übergeben',
 ready_for_expert:'Zur regulären Fachprüfung',
}
export const severityLabels:Record<DossierAssessment['status'],string>={
 STOP_MISSING_SOURCE:'Unterlagen fehlen',
 STOP_UNREADABLE:'Quelle nicht lesbar',
 STOP_CITATION_INVALID:'Beleg ungültig',
 REVIEW_DISCREPANCY:'Widerspruch prüfen',
 REQUEST_EVIDENCE:'Nachweis anfordern',
 REVIEW_READY:'Prüfbereit',
}
export function makeDeskCase(
 id:string,title:string,documents:ParsedDocument[],source:DeskCase['source']='synthetic'
):DeskCase{
 const citations=createCitations(documents)
 const assessment=assessDossier(documents,citations)
 return {id,title,documents,citations,assessment,source,stage:'open',events:[],createdAt:new Date().toISOString()}
}
export function priority(c:DeskCase):number{
 if(c.stage==='reviewed')return 9
 if(c.stage==='waiting')return 8
 switch(c.assessment.status){
  case 'STOP_CITATION_INVALID':return 0
  case 'STOP_UNREADABLE':return 0
  case 'STOP_MISSING_SOURCE':return 1
  case 'REVIEW_DISCREPANCY':return 2
  case 'REQUEST_EVIDENCE':return 3
  case 'REVIEW_READY':return 4
 }
}
export function sortedQueue(cases:DeskCase[]):DeskCase[]{
 return [...cases].sort((a,b)=>priority(a)-priority(b)||a.id.localeCompare(b.id))
}
export function allowedActions(c:DeskCase):ReviewAction[]{
 const actions:ReviewAction[]=['request_documents','refer_specialist']
 // A complete, text-readable, citation-verified dossier can enter expert review;
 // this is never a claim payment approval or insurance coverage decision.
 if(c.assessment.status==='REVIEW_READY')actions.push('ready_for_expert')
 return actions
}
export function recordReview(c:DeskCase,action:ReviewAction,note:string,durationMs:number,at=new Date().toISOString()):DeskCase{
 if(!allowedActions(c).includes(action))throw Error('Die Quellenprüfung erlaubt diesen nächsten Schritt nicht.')
 if(c.stage==='reviewed')throw Error('Fall ist bereits an eine Fachprüfung übergeben. Zur Korrektur erneut öffnen.')
 if(!Number.isFinite(durationMs)||durationMs<0||durationMs>24*3600*1000)throw Error('Ungültige aktive Bearbeitungsdauer.')
 if(note.length>600)throw Error('Notiz zu lang (maximal 600 Zeichen).')
 const stage:DeskStage=action==='request_documents'?'waiting':'reviewed'
 return {...c,stage,events:[...c.events,{kind:'review',action,note:note.trim(),durationMs:Math.round(durationMs),at}]}
}
export function reopenCase(c:DeskCase,reason:string):DeskCase{
 if(c.stage==='open')return c
 return {...c,stage:'open',events:[...c.events,{kind:'reopened',reason,durationMs:0,at:new Date().toISOString()}]}
}
export function retagDocument(c:DeskCase,docId:string,role:DocumentRole):DeskCase{
 if(!c.documents.some(d=>d.id===docId))throw Error('Dokument nicht gefunden.')
 const documents=c.documents.map(d=>d.id===docId?{...d,role}:d)
 const reopened=reopenCase(c,'Dokumentenart geändert; vorheriger Review nicht mehr freigegeben.')
 return {...reopened,documents,citations:createCitations(documents),assessment:assessDossier(documents,createCitations(documents)),stage:'open'}
}
export function summarizeDesk(cases:DeskCase[]):DeskSummary{
 const actions=cases.flatMap(c=>c.events.filter(e=>e.kind==='review'))
 return {
  total:cases.length,unresolved:cases.filter(c=>c.stage==='open').length,
  exceptions:cases.filter(c=>c.stage==='open'&&c.assessment.status!=='REVIEW_READY').length,
  waiting:cases.filter(c=>c.stage==='waiting').length,
  reviewed:cases.filter(c=>c.stage==='reviewed').length,
  reviewedWithMeasuredTime:actions.length,
  measuredActiveMs:actions.reduce((sum,e)=>sum+e.durationMs,0),
  timeSavedAgainstBaseline:null,expertValidated:false
 }
}
export function exportDeskAudit(cases:DeskCase[]){
 return {
  schema:'claim-os-6-operator-audit-v1',
  data_origin:'browser_session_only',
  no_production_integration:true,
  no_ai_model_calls:true,
  no_autonomous_payments:true,
  measured_human_time_saving:null,
  human_review_events:cases.reduce((n,c)=>n+c.events.filter(e=>e.kind==='review').length,0),
  cases:cases.map((c,index)=>({
   // Never export uploaded filenames, raw document text, quotes, user notes or customer names.
   case_key:'CASE-'+String(index+1).padStart(3,'0'),
   source:c.source,stage:c.stage,
   engine_status:c.assessment.status,
   roles:c.documents.map(d=>d.role),
   page_count:c.documents.reduce((sum,d)=>sum+d.pages.length,0),
   citations_valid:c.citations.filter(x=>checkCitation(c.documents,x)).length,
   citations_total:c.citations.length,
   transitions:c.events.map(e=>({
    kind:e.kind,action:e.action??null,active_review_ms:e.durationMs,at:e.at,
   }))
  })),
  privacy:'No uploaded file names, file bytes, raw PDF text, quotes, free-text notes or identifiers included.'
 }
}
export function safeFileGroup(name:string){
 // A deliberate filename convention supports batch intake without guessing
 // whether different customers' documents belong to the same claim.
 // e.g. CASE-104__Meldung.pdf and CASE-104__Rechnung.pdf
 const match=/^(CASE-[A-Za-z0-9]{2,12})__/i.exec(name)
 return match?match[1].toUpperCase():null
}
