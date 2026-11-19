import type {DeskCase} from '../desk/deskCore'
import {checkCitation} from '../doclab/pdfEvidence'
import type {PageCitation} from '../doclab/pdfEvidence'
export type QuietTone='warning'|'ready'|'blocked'|'waiting'|'done'
export function caseTone(c:DeskCase):QuietTone{
 if(c.stage==='reviewed')return 'done'
 if(c.stage==='waiting')return 'waiting'
 if(c.assessment.status.startsWith('STOP'))return 'blocked'
 if(c.assessment.status==='REVIEW_READY')return 'ready'
 return 'warning'
}
export function caseCopy(c:DeskCase){
 const status=c.assessment.status
 if(status==='REVIEW_DISCREPANCY')return {
  heading:'Ein Detail verdient Aufmerksamkeit.',
  description:'Die Schadenmeldung beschreibt einen kleineren Vorfall. Weitere Positionen der Reparaturrechnung sollten fachlich geprüft werden.',
  finding:'Der Reparaturumfang könnte über die Schilderung des Schadenereignisses hinausgehen.',
  label:'Mögliche Abweichung'
 }
 if(status==='STOP_MISSING_SOURCE')return {
  heading:'Eine Unterlage fehlt.',
  description:'Die Akte enthält noch nicht alle benötigten Dokumentarten. Eine weitergehende Prüfung wäre verfrüht.',
  finding:'Es fehlen erforderliche Originaldokumente. Ohne diese ist die Vorprüfung unvollständig.',
  label:'Quellenlücke'
 }
 if(status==='STOP_UNREADABLE'||status==='STOP_CITATION_INVALID')return {
  heading:'Die Quelle muss geprüft werden.',
  description:'Mindestens eine Seite ist nicht lesbar oder eine angegebene Textstelle lässt sich nicht exakt nachweisen.',
  finding:'Die technische Belegkette ist unvollständig. Eine manuelle Sichtprüfung ist erforderlich.',
  label:'Belegproblem'
 }
 if(status==='REQUEST_EVIDENCE')return {
  heading:'Ein Nachweis ist noch offen.',
  description:'Die Dokumentarten liegen vor; für die weitere Prüfung fehlt jedoch eine wichtige Angabe.',
  finding:'Ein zusätzlicher Nachweis oder eine Rückfrage ist erforderlich.',
  label:'Rückfrage'
 }
 return {
  heading:'Bereit für die Fachprüfung.',
  description:'Die benötigten Dokumentarten sind lesbar, und die Textstellen lassen sich im Original finden. Noch keine Entscheidung zum Versicherungsschutz.',
  finding:'Die technische Dokumentenprüfung ist abgeschlossen; jetzt ist eine fachliche Bewertung nötig.',
  label:'Vorprüfung vollständig'
 }
}

/** An optional, local-only exact quote for an additional invoiced part. 
 * No model inference: the phrase and coordinates must already exist in the parsed PDF. */
export function additionalInvoiceSource(c:DeskCase):PageCitation|null{
 if(c.assessment.status!=='REVIEW_DISCREPANCY')return null
 const invoice=c.documents.find(d=>d.role==='invoice')
 if(!invoice)return null
 for(const p of invoice.pages){
  const m=/\b(heckklappe|auspuffanlage|abgasanlage|tailgate|exhaust)\b/i.exec(p.text)
  if(!m)continue
  const start=Math.max(0,m.index-22),end=Math.min(p.text.length,m.index+m[0].length+48)
  const ctn:PageCitation={
   id:'FOCUS-'+invoice.id+'-'+p.page,
   documentId:invoice.id,page:p.page,offset:start,
   quote:p.text.slice(start,end),
   label:'Zusatzposition: '+m[0],
   role:invoice.role,origin:invoice.origin,
   focusOffset:m.index,focusText:m[0]
  }
  if(checkCitation(c.documents,ctn))return ctn
 }
 return null
}
export function displaySources(c:DeskCase):PageCitation[]{
 const supplemental=additionalInvoiceSource(c)
 return supplemental?[supplemental,...c.citations]:c.citations
}
export function firstSource(c:DeskCase):PageCitation|null{
 const valid=c.citations.filter(x=>checkCitation(c.documents,x))
 if(!valid.length)return null
 if(c.assessment.status==='REVIEW_DISCREPANCY')
  return additionalInvoiceSource(c)
   ??valid.find(x=>x.role==='invoice'&&x.label==='Reparaturumfang')
   ??valid.find(x=>x.role==='policy'&&x.label==='Deckungsgrenze')
   ??valid[0]
 if(c.assessment.status==='STOP_MISSING_SOURCE'||c.assessment.status==='REQUEST_EVIDENCE')
  return valid.find(x=>x.label==='Fehlender Nachweis')??valid[0]
 return valid.find(x=>x.role==='invoice')??valid[0]
}
