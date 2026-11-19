import {checkCitation} from '../doclab/pdfEvidence'
import type {PageCitation} from '../doclab/pdfEvidence'
import type {DeskCase} from '../desk/deskCore'

export type Scene=0|1|2
export type CinematicStory={
 eyebrow:string;headline:string;subhead:string;
 caseName:string;findingTitle:string;findingSubtitle:string;
 humanPrompt:string;progressHint:string;accent:'amber'|'sage'|'blue';
}

export const sceneLabels=['Der Fall','Die Fundstelle','Die Handlung'] as const

/** Narrative is tied to deterministic test-case classifications, never to imagined model inference. */
export function storyFor(c:DeskCase):CinematicStory{
 const status=c.assessment.status
 if(status==='REVIEW_DISCREPANCY')return {
  eyebrow:'POTENZIELLER WIDERSPRUCH',
  headline:"Something doesn't add up.",
  subhead:'Ein leichter Parkrempler. Reparaturen über den beschriebenen Bereich hinaus. Kein Betrugsnachweis — aber ein klarer Anlass zur Fachprüfung.',
  caseName:c.title,
  findingTitle:'Zwei Geschichten. Eine Akte.',
  findingSubtitle:'Schadenmeldung, Rechnung und mögliche Ausschlüsse zeigen einen prüfbedürftigen Unterschied. Nur eine Fachperson kann das bewerten.',
  humanPrompt:'Prüfung des Reparaturumfangs veranlassen',
  progressHint:'Die markierte Textstelle ist im Original auffindbar; die fachliche Schlussfolgerung bleibt menschlich.',
  accent:'amber'
 }
 if(status==='STOP_MISSING_SOURCE')return {
  eyebrow:'AKTE UNVOLLSTÄNDIG',
  headline:'The missing piece.',
  subhead:'Ein Dokument fehlt. Ohne die Primärquelle wäre die nächste Prüfung nicht belastbar.',
  caseName:c.title,findingTitle:'Ohne Quelle keine Freigabe.',
  findingSubtitle:'Die Akte enthält nicht alle erforderlichen Dokumentarten. Das ist ein Stoppsignal, keine Ablehnung.',
  humanPrompt:'Fehlende Unterlagen anfordern',
  progressHint:'Eine nicht vorhandene Originalquelle kann nicht durch einen KI-Satz ersetzt werden.',
  accent:'amber'
 }
 if(status==='STOP_UNREADABLE'||status==='STOP_CITATION_INVALID')return {
  eyebrow:'QUELLENKETTE UNTERBROCHEN',headline:'Proof, not promises.',
  subhead:'Ein Dokument ist nicht lesbar oder ein Seitenzitat lässt sich nicht exakt wiederfinden.',
  caseName:c.title,findingTitle:'Der Beleg hält nicht stand.',
  findingSubtitle:c.assessment.rationale,humanPrompt:'Quellen erneut menschlich prüfen',
  progressHint:'Ein ungültiger Textanker wird niemals als visuell verifizierter Beleg ausgegeben.',
  accent:'amber'
 }
 if(status==='REQUEST_EVIDENCE')return {
  eyebrow:'NACHWEIS AUSSTEHEND',headline:'One question remains.',
  subhead:'Die Dokumente liegen vor, aber eine für die Fachprüfung wichtige Angabe ist noch offen.',
  caseName:c.title,findingTitle:'Noch nicht entscheidungsreif.',
  findingSubtitle:c.assessment.rationale,humanPrompt:'Offene Angaben nachfordern',
  progressHint:'Wortgleich geprüfte Textstellen beantworten nicht automatisch alle Sachfragen.',
  accent:'amber'
 }
 return {
  eyebrow:'QUELLEN VOLLSTÄNDIG',headline:'Ready for the human eye.',
  subhead:'Die erforderlichen Dokumentarten sind lesbar, und die technischen Fundstellen stimmen wortgleich. Eine fachliche Entscheidung steht noch aus.',
  caseName:c.title,findingTitle:'Die Akte ist prüffähig.',
  findingSubtitle:'Technischer Quellencheck bestanden. Versicherungsschutz, Forderungshöhe und Auszahlung werden hier nicht entschieden.',
  humanPrompt:'Für reguläre Fachprüfung vorbereiten',
  progressHint:'Wortgleich belegbar bedeutet nicht automatisch sachlich oder rechtlich bestätigt.',
  accent:'sage'
 }
}
export function sceneCitation(c:DeskCase):PageCitation|null{
 const valid=c.citations.filter(x=>checkCitation(c.documents,x))
 if(!valid.length)return null
 if(c.assessment.status==='REVIEW_DISCREPANCY'){
  return valid.filter(x=>x.label==='Deckungsgrenze'&&x.role==='policy').at(-1)
    ??valid.find(x=>x.label==='Reparaturumfang'&&x.role==='invoice')
    ??valid.at(-1)??null
 }
 if(c.assessment.status==='REQUEST_EVIDENCE'||c.assessment.status==='STOP_MISSING_SOURCE'){
  return valid.find(x=>x.label==='Fehlender Nachweis')??valid[0]
 }
 return valid.find(x=>x.role==='invoice')??valid[0]
}
export function narrativeReceipt(c:DeskCase){
 const good=c.citations.filter(x=>checkCitation(c.documents,x)).length
 return {count:good,total:c.citations.length,documents:c.documents.length,
  complete:c.assessment.missingRoles.length===0&&c.assessment.scannedOrEmptyPages===0&&
   c.assessment.totalCitations>0&&c.assessment.validCitations===c.assessment.totalCitations}
}
