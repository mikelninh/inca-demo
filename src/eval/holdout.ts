import type {DossierStatus,DocumentRole,ParsedDocument,PageCitation} from '../doclab/pdfEvidence'
import {assessDossier,createCitations} from '../doclab/pdfEvidence'

export type HoldoutCase={
 id:string; family:string; variation:string; severity:'critical'|'routine';
 docs:ParsedDocument[]; expected:DossierStatus; fault:'none'|'tamper_quote';
 note:string
}
const claimVariants=[
 ['Beim Ausparken bin ich leicht gegen eine Mauer gestossen. Die Stossstange wurde beschädigt.','Werkstattrechnung: Stossstange EUR 1.200, Heckklappe EUR 1.800 und Auspuffanlage EUR 1.200.'],
 ['Bei einem leichten Parkmanöver habe ich das Heck berührt.','Rechnung: Stoßstange hinten EUR 950, Heckklappe EUR 1.700, Abgasanlage EUR 900.'],
 ['Beim Rangieren rollte das Fahrzeug sachte gegen eine Mauer; am Heck war nur ein Kratzer sichtbar.','Kostenvoranschlag: hintere Stoßstange EUR 1.000, Heckklappe EUR 2.000.'],
 ['Unfallmeldung: Bei geringfügiger Geschwindigkeit kam es zu einem Stoss.','Invoice: rear bumper 980 EUR, tailgate 1.750 EUR and exhaust 500 EUR.'],
 ['Beim Rückwärtsfahren leichter Rempler, Schaden laut Erstmeldung nur an der Stoßstange.','Rechnung: Stoßstange 700 EUR, Heckklappe 1400 EUR.'],
 ['I hit a wall while parking at low speed; only the bumper appeared damaged.','Invoice: rear bumper 1,000 EUR, tailgate 2,300 EUR, exhaust 900 EUR.']
] as const
const policyVariants=[
 'Vollkasko. Vorschäden und nicht unfallbedingte Reparaturen sind ausgeschlossen.',
 'Versicherungsschutz für Kollision. Kosten für Vorschaden werden nicht ersetzt.',
 'Vollkaskovertrag: Vorschaden gesondert prüfen, nicht unfallbedingte Mängel ausschliessen.',
 'Policy includes collision, excludes pre-existing damage and repairs not caused by accident.',
 'Unfallversicherung: nicht unfallbedingte Reparaturen werden nicht übernommen.',
 'Collision cover. Excludes pre-existing damage unrelated to this incident.'
]
function doc(id:string,role:DocumentRole,text:string,empty=false):ParsedDocument{
 return {id,name:'Fiktive_'+role+'_'+id+'.pdf',role,origin:'generated_sample',
  pages:[{page:1,text:empty?'':text}],sizeBytes:0,bytes:new Uint8Array()}
}
export function buildHoldout():HoldoutCase[]{
 const result:HoldoutCase[]=[]
 for(let i=0;i<6;i++){
  const [claim,invoice]=claimVariants[i]
  result.push({
   id:'H-REPAIR-'+(i+1).toString().padStart(2,'0'),
   family:'Repair discrepancy',variation:'Phrase '+(i+1),severity:'critical',
   expected:'REVIEW_DISCREPANCY',fault:'none',
   docs:[doc('C','claim',claim),doc('P','policy',policyVariants[i]),doc('I','invoice',invoice)],
   note:'Synthetic author intent: plausible low-impact vs broad repair discrepancy. Requires expert review, not automatic decline.'
  })
 }
 const missingRoles:DocumentRole[]=['invoice','policy','claim','invoice','policy','claim']
 for(let i=0;i<6;i++){
  const absent=missingRoles[i]
  const docs=[
   doc('C','claim','Schadenmeldung: Wasserschaden nach Rohrbruch.'),
   doc('P','policy','Leitungswasser kann versichert sein; individuelle Klauseln prüfen.'),
   doc('I','invoice','Rechnung: Bodenreparatur EUR 1.100.')
  ].filter(x=>x.role!==absent)
  result.push({id:'H-MISSING-'+(i+1).toString().padStart(2,'0'),
   family:'Missing source',variation:'Missing '+absent,severity:'critical',expected:'STOP_MISSING_SOURCE',
   fault:'none',docs,note:'At least one mandatory document class is missing.'})
 }
 for(let i=0;i<6;i++){
  const docs=[
   doc('C','claim','Schadenmeldung: Einbruchdiebstahl gemeldet.',i===0),
   doc('P','policy','Police: Einbruchdiebstahl unter Umständen versichert.',i===1||i===4),
   doc('I','invoice','Rechnung: Laptop EUR 970.',i===2||i===3||i===5)
  ]
  result.push({id:'H-SCAN-'+(i+1).toString().padStart(2,'0'),
   family:'Untextable PDF',variation:'Empty page '+(i+1),severity:'critical',
   expected:'STOP_UNREADABLE',fault:'none',docs,
   note:'Selected page is an image-only scan: no OCR or hallucination permitted.'})
 }
 for(let i=0;i<6;i++){
  const docs=[
   doc('C','claim','Schadenmeldung: Rohrbruch in der Küche, Boden nass.'),
   doc('P','policy','Hausrat: Leitungswasser nach vereinbarten Bedingungen.'),
   doc('I','invoice','Rechnung: Laminatboden EUR 640.')
  ]
  result.push({id:'H-CITATION-'+(i+1).toString().padStart(2,'0'),
   family:'Forged quotation',variation:'Tampered span '+(i+1),severity:'critical',
   expected:'STOP_CITATION_INVALID',fault:'tamper_quote',docs,
   note:'Quote has a fabricated character sequence and must fail validation.'})
 }
 for(let i=0;i<6;i++){
  const c=[
   'Schadenmeldung: Zulaufschlauch defekt. Leitungswasser hat Laminat beschädigt.',
   'Claim: broken hose; water damage to kitchen floor.',
   'Gemeldeter Wasserschaden: undichte Spülmaschine, Küchenboden betroffen.',
   'Ein Leck an einer Wasserleitung wurde gemeldet, Reparatur benötigt.',
   'Unfallmeldung: Steinschlag an der Windschutzscheibe.',
   'Schadenmeldung: Defekte Wasserleitung; Boden durchfeuchtet.'
  ][i]
  const p=i===4?'Teilkasko: Glasbruch versichert, Selbstbeteiligung 150 EUR.':
   'Hausrat: Leitungswasser eingeschlossen, Selbstbeteiligung 150 EUR.'
  const inv=i===4?'Rechnung: Windschutzscheibe EUR 690.':'Rechnung: Boden EUR 950.'
  result.push({id:'H-READY-'+(i+1).toString().padStart(2,'0'),
   family:'Review candidate',variation:'Normal '+(i+1),severity:'routine',
   expected:'REVIEW_READY',fault:'none',
   docs:[doc('C','claim',c),doc('P','policy',p),doc('I','invoice',inv)],
   note:'All three document classes are present; only human review is allowed.'})
 }
 for(let i=0;i<6;i++){
  const c=[
   'Einbruchdiebstahl: Laptop gestohlen. Die Polizei hat den Vorfall aufgenommen.',
   'Schadenmeldung: burglary in apartment, laptop stolen. Police report requested.',
   'Einbruch: mehrere Geräte fehlen, Polizeianzeige in Bearbeitung.',
   'Einbruchdiebstahl angezeigt; das Aktenzeichen wird nachgereicht.',
   'Burglary claim: camera missing, police investigation pending.',
   'Einbruch: Diebstahl gemeldet, Polizei verständigt, Unterlagen folgen.'
  ][i]
  result.push({id:'H-POLICE-'+(i+1).toString().padStart(2,'0'),
   family:'Missing reference number',variation:'Burglary '+(i+1),severity:'routine',
   expected:'REQUEST_EVIDENCE',fault:'none',
   docs:[
    doc('C','claim',c),
    doc('P','policy','Einbruchschutz: Polizei-Aktenzeichen erforderlich.'),
    doc('I','invoice','Rechnung: versicherte Elektronik EUR 1.100.')
   ],note:'An explicit police reference number is not present in the submitted claim statement.'})
 }
 return result
}
export type ScoredCase={
 id:string;family:string;variation:string;severity:'critical'|'routine';
 expected:DossierStatus;actual:DossierStatus;match:boolean;
 validCitations:number;totalCitations:number;
 needsHumanReview:true;autonomousSettlementAllowed:false;note:string
}
export function scoreHoldout(cases:HoldoutCase[]=buildHoldout()){
 return cases.map((item):ScoredCase=>{
  const references=createCitations(item.docs)
  const citations:PageCitation[]=item.fault==='tamper_quote'
    ?references.map((c,i)=>i===0?{...c,quote:c.quote+' [FORGED]'}:c)
    :references
  const outcome=assessDossier(item.docs,citations)
  return {id:item.id,family:item.family,variation:item.variation,severity:item.severity,
   expected:item.expected,actual:outcome.status,match:outcome.status===item.expected,
   validCitations:outcome.validCitations,totalCitations:outcome.totalCitations,
   needsHumanReview:true,autonomousSettlementAllowed:false,note:item.note}
 })
}
export function summariseHoldout(rows:ScoredCase[]){
 const critical=rows.filter(x=>x.severity==='critical')
 const misses=critical.filter(x=>!x.match)
 const byFamily=[...new Set(rows.map(r=>r.family))].map(family=>{
  const items=rows.filter(x=>x.family===family)
  return {family,n:items.length,correct:items.filter(x=>x.match).length}
 })
 return {
  n:rows.length,labelsMatched:rows.filter(x=>x.match).length,
  criticalTotal:critical.length,criticalScenarioMismatches:misses.length,
  matchedQuoteSpans:rows.reduce((n,r)=>n+r.validCitations,0),
  totalQuoteSpans:rows.reduce((n,r)=>n+r.totalCitations,0),
  byFamily,
  estimatedTimeSaved:null,
  expertGroundTruth:false,
  liveModelRuns:0,
  statement:'This is an authored synthetic behavioural regression suite, not an independently labelled external benchmark.'
 }
}
