/**
 * Local PDF evidence engine — transparent deterministic baseline, NOT an AI model.
 * Sources and citations are made from actual extracted PDF page text. The only
 * evidence validity claim is an exact character-span match in that page text.
 * No legal coverage decisions, external document transfers, or auto-payments.
 */
export type DocumentRole='claim'|'policy'|'invoice'|'unknown'
export type DocumentOrigin='generated_sample'|'user_upload'
export type PageText={page:number;text:string;rects?:TextRect[]}
export type TextRect={start:number;end:number;left:number;top:number;width:number;height:number}
export type ParsedDocument={
  id:string;name:string;role:DocumentRole;origin:DocumentOrigin;
  pages:PageText[];sizeBytes:number;bytes:Uint8Array
}
export type PageCitation={
  id:string;documentId:string;page:number;offset:number;quote:string;
  label:string;role:DocumentRole;origin:DocumentOrigin;
}
export type DossierStatus='STOP_MISSING_SOURCE'|'STOP_UNREADABLE'|'STOP_CITATION_INVALID'|
  'REVIEW_DISCREPANCY'|'REQUEST_EVIDENCE'|'REVIEW_READY'
export type DossierAssessment={
  status:DossierStatus;
  headline:string;
  rationale:string;
  nextStep:string;
  requiredRoles:DocumentRole[];
  missingRoles:DocumentRole[];
  scannedOrEmptyPages:number;
  validCitations:number;
  totalCitations:number;
  realWorldAccuracy:null;
  verifiedByIndependentExpert:false;
  autonomousSettlementAllowed:false;
  requiresHumanReview:true;
  observations:string[];
}
const needs=['claim','policy','invoice'] as const
const cues=[
  {name:'Reparaturumfang',pattern:/\b(heckklappe|auspuffanlage|abgasanlage|stoßstange|stossstange|exhaust|tailgate)\b/i},
  {name:'Schadenshergang',pattern:/\b(leicht|geringfügig|ausparken|parking|bumper)\b/i},
  {name:'Deckungsgrenze',pattern:/\b(vorschaden|vorschäden|nicht unfallbedingt|ausgeschlossen|selbstbeteiligung|deductible)\b/i},
  {name:'Fehlender Nachweis',pattern:/\b(aktenzeichen|polizeianzeige|polizei|fehlend|nicht vorgelegt|missing)\b/i},
  {name:'Leitungswasser',pattern:/\b(leitungswasser|zulaufschlauch|wasserschaden|water damage|leak)\b/i},
  {name:'Rechnungsbeleg',pattern:/\b(rechnung|invoice|reparatur|werks?tatt|kosten)\b/i}
]
function sniffRole(name:string):DocumentRole{
  if(/policy|police|vertrag|bedingungen/i.test(name))return 'policy'
  if(/rechnung|invoice|werkstatt|kosten/i.test(name))return 'invoice'
  if(/meldung|claim|schadenbericht|fnol|incident/i.test(name))return 'claim'
  return 'unknown'
}
export {sniffRole}
export function createCitations(docs:ParsedDocument[],max=24):PageCitation[]{
  const result:PageCitation[]=[]
  for(const doc of docs){
    for(const pg of doc.pages){
      if(!pg.text.trim())continue
      let hits=0
      for(const cue of cues){
        const match=cue.pattern.exec(pg.text)
        if(!match)continue
        const start=Math.max(0,match.index-28)
        const end=Math.min(pg.text.length,match.index+match[0].length+66)
        result.push({
          id:'S'+(result.length+1).toString().padStart(2,'0'),
          documentId:doc.id,page:pg.page,offset:start,
          quote:pg.text.slice(start,end),
          label:cue.name,role:doc.role,origin:doc.origin
        })
        if(++hits>=2||result.length>=max)break
      }
      if(hits===0){
        result.push({
          id:'S'+(result.length+1).toString().padStart(2,'0'),
          documentId:doc.id,page:pg.page,offset:0,
          quote:pg.text.slice(0,Math.min(100,pg.text.length)),
          label:'Dokumentenanfang',role:doc.role,origin:doc.origin
        })
      }
      if(result.length>=max)return result
    }
  }
  return result
}
export function checkCitation(docs:ParsedDocument[],c:PageCitation):boolean{
  const doc=docs.find(x=>x.id===c.documentId)
  const page=doc?.pages.find(x=>x.page===c.page)
  return !!page && c.offset>=0 && c.quote.length>0 &&
    doc?.role===c.role && doc.origin===c.origin &&
    page.text.slice(c.offset,c.offset+c.quote.length)===c.quote
}
export function assessDossier(docs:ParsedDocument[],citations:PageCitation[]):DossierAssessment{
  const missing=needs.filter(role=>!docs.some(x=>x.role===role))
  const empty=docs.reduce((n,d)=>n+d.pages.filter(p=>!p.text.trim()).length,0)
  const valid=citations.filter(c=>checkCitation(docs,c)).length
  const total=citations.length
  const corpus=(role:DocumentRole)=>docs.filter(d=>d.role===role)
    .flatMap(d=>d.pages.map(p=>p.text)).join(' ').toLowerCase()
  const claim=corpus('claim'), invoice=corpus('invoice'),policy=corpus('policy')
  const repairMismatch=/(leicht|ausparken|geringfügig|parking|bumper)/i.test(claim) &&
    /(heckklappe|auspuff|abgasanlage|exhaust|tailgate)/i.test(invoice) &&
    /(vorschaden|vorschäden|unfallbedingt|pre.existing)/i.test(policy)
  const missingBurglaryDetails=/(einbruch|burglary)/i.test(claim) &&
    /(aktenzeichen|polizei|police)/i.test(policy) &&
    !/(aktenzeichen[:\s]+\S{5,}|\bAZ[-\s]?[0-9]{4,}\b)/i.test(claim)
  let status:DossierStatus='REVIEW_READY'
  let headline='Prüfung vorbereiten'
  let rationale='Die Dokumente sind lokal lesbar; ein automatischer Entscheid ist nicht zulässig.'
  let nextStep='Die vorgeschlagene Bearbeitung anhand der Policen- und Rechnungsunterlagen fachlich überprüfen.'
  if(missing.length){
    status='STOP_MISSING_SOURCE';headline='Fehlende Primärunterlagen'
    rationale='Es fehlt mindestens eine erforderliche Dokumentart für die vollständige Erstprüfung.'
    nextStep='Fehlende Dokumente anfordern und die Dokumentart korrekt zuordnen.'
  } else if(empty){
    status='STOP_UNREADABLE';headline='PDF nicht vollständig lesbar'
    rationale='Mindestens eine PDF-Seite enthält keinen extrahierbaren Text. OCR wurde nicht durchgeführt.'
    nextStep='Originaldokument und ggf. menschlich geprüftes OCR nachfordern.'
  } else if(total===0||valid!==total){
    status='STOP_CITATION_INVALID';headline='Quellenkette unterbrochen'
    rationale='Mindestens ein Quellenzitat stimmt nicht wortgetreu mit der extrahierten PDF-Seite überein.'
    nextStep='Fundstellen neu aufbauen und menschlich gegen die PDF-Seite prüfen.'
  } else if(repairMismatch){
    status='REVIEW_DISCREPANCY';headline='Möglicher Widerspruch im Reparaturumfang'
    rationale='Der geschilderte leichte Anstoß und weitere Reparaturpositionen sollten zusammen geprüft werden. Dies ist kein Betrugsnachweis.'
    nextStep='Kfz-Sachverständige um Prüfung der geltend gemachten Positionen und eventueller Vorschäden bitten.'
  } else if(missingBurglaryDetails){
    status='REQUEST_EVIDENCE';headline='Fehlende Angabe im Einbruchfall'
    rationale='Die Beispielpolice verlangt einen polizeilichen Nachweis. Im Meldungstext wurde kein eindeutiges Aktenzeichen erkannt.'
    nextStep='Aktenzeichen und relevante Unterlagen durch Menschen ergänzen oder bestätigen lassen.'
  }
  const observations=[
    'PDF-Inhalte lokal im Browser extrahiert, keine automatische Übermittlung.',
    'Wörtliche Seitenanker sind technisch überprüft, nicht unabhängig als fachlich stützend bestätigt.',
    'Regulierung, Ablehnung und externe Kommunikation sind immer deaktiviert.'
  ]
  return {status,headline,rationale,nextStep,
    requiredRoles:[...needs],missingRoles:missing,
    scannedOrEmptyPages:empty,validCitations:valid,totalCitations:total,
    realWorldAccuracy:null,verifiedByIndependentExpert:false,
    autonomousSettlementAllowed:false,requiresHumanReview:true,observations}
}
export function exportSafeAudit(docs:ParsedDocument[],a:DossierAssessment){
  return {
    schema:'inca-document-lab-audit-v0.3',
    status:a.status,
    document_inventory:docs.map((d,index)=>({
      id:'D'+(index+1),role:d.role,pages:d.pages.length,
      source:d.origin,parsed_text_pages:d.pages.filter(p=>!!p.text.trim()).length
    })),
    provenance:{citations_checked:a.totalCitations,exact_page_spans:a.validCitations,
      independent_support_review:false},
    human_review_required:true,
    autonomous_payment_allowed:false,
    measured_worker_time_saving:null,
    raw_source_text_exported:false,
    note:'No document texts, raw filenames, document bytes or identifying facts are exported.'
  }
}
