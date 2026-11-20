import type {DeskCase} from '../desk/deskCore'
import {checkCitation} from '../doclab/pdfEvidence'
import type {DocumentRole,PageCitation} from '../doclab/pdfEvidence'
export const roles:Record<DocumentRole,string>={claim:'Schadenmeldung',policy:'Vertrag',invoice:'Rechnung',unknown:'Ohne Zuordnung'}
export type QuietTone='warning'|'ready'|'blocked'|'waiting'|'done'
export function caseTone(c:DeskCase):QuietTone{
 if(c.stage==='reviewed')return 'done'
 if(c.stage==='waiting')return 'waiting'
 if(c.assessment.status.startsWith('STOP'))return 'blocked'
 if(c.assessment.status==='REVIEW_READY')return 'ready'
 return 'warning'
}
export function caseCopy(c:DeskCase){
 const {status,missingRoles}=c.assessment
 const demo=c.source==='synthetic'&&c.documents.every(d=>d.origin==='generated_sample')
 switch(status){
  case 'REVIEW_DISCREPANCY': {
   const parkingDemo=demo&&c.id==='KFZ-A17'&&c.documents.some(d=>d.role==='invoice'&&d.pages.some(p=>p.text.includes('Heckklappe - 1.800 EUR')))
   return {
    heading:parkingDemo?'Heckklappe für 1.800 € berechnet':'Reparaturumfang prüfen',
    description:parkingDemo
     ?'Laut Schadenmeldung war die hintere Stoßstange betroffen.'
     :'Schadenmeldung und Rechnung zusammen prüfen.',
    next:'Fachperson bitten, die zusätzlichen Reparaturen zu prüfen.'
   }
  }
  case 'STOP_MISSING_SOURCE':
   if(demo&&c.id==='HR-C09'&&missingRoles.length===1&&missingRoles[0]==='invoice')return {
    heading:'Wertbelege fehlen',
    description:'Laut Schadenmeldung ist die Polizeianzeige noch offen.',
    next:'Wertbelege und das polizeiliche Aktenzeichen anfragen.'
   }
   return {heading:`Fehlt in der Akte: ${missingRoles.map(role=>roles[role]).join(', ')}`,description:'',next:'Fehlende Dokumente anfragen oder die Dokumentart korrigieren.'}
  case 'STOP_UNREADABLE':
   return {heading:'Eine PDF-Seite lässt sich nicht als Text lesen',description:'',next:'Eine lesbare Fassung anfragen.'}
  case 'STOP_CITATION_INVALID':
   return {heading:'Fundstelle im PDF prüfen',description:'Die Fundstelle konnte nicht bestätigt werden.',next:'Original öffnen und die Stelle prüfen.'}
  case 'REQUEST_EVIDENCE':
   return {heading:'Polizeiliches Aktenzeichen prüfen',description:'In der Meldung ist kein eindeutiges Aktenzeichen auffindbar.',next:'Aktenzeichen anfragen oder im Original prüfen.'}
  case 'REVIEW_READY':
   return {heading:'Alle benötigten Dokumente liegen vor',description:'Die PDFs sind lesbar und die Fundstellen auffindbar.',next:'Eine Fachperson prüft den Schaden anhand der Unterlagen.'}
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
export function keySources(c:DeskCase,sources:PageCitation[]):PageCitation[]{
 const first=firstSource(c)
 if(!first)return []
 const comparisonRole=c.assessment.status==='REVIEW_DISCREPANCY'?'claim':
  c.assessment.status==='STOP_MISSING_SOURCE'||c.assessment.status==='REQUEST_EVIDENCE'?'policy':null
 const comparison=sources.find(s=>s.role===comparisonRole&&s.documentId!==first.documentId&&checkCitation(c.documents,s))
 return comparison?[first,comparison]:[first]
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
