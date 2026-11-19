import {PDFDocument,StandardFonts,rgb} from 'pdf-lib'
import type {DocumentRole} from './pdfEvidence'

type SampleFile={role:DocumentRole;name:string;pages:{heading:string;lines:string[]}[]}
type Scenario={id:string;label:string;tagline:string;expected:'REVIEW_DISCREPANCY'|'REVIEW_READY'|'STOP_MISSING_SOURCE';files:SampleFile[]}
export const scenarios:Scenario[]=[
  {id:'parking',label:'01 / Parkrempler',tagline:'Widerspruch zwischen Meldung und Rechnung · 3 PDF-Dateien',expected:'REVIEW_DISCREPANCY',
    files:[
      {role:'claim',name:'Schadenmeldung_KFZ-A17.pdf',pages:[{heading:'Schadenmeldung KFZ-A17',lines:[
        'Eingang: 10. Mai 2026 | Schaden: 09. Mai 2026',
        'Fiktive Meldung - zur Demonstration entwickelt.',
        'Beim Ausparken bin ich leicht gegen eine Mauer gestossen.',
        'Nach meiner Beobachtung ist die hintere Stossstange betroffen.',
        'Die Werkstatt berechnet neben der Stossstange weitere Reparaturen.',
        'Bitte um Pruefung des Reparaturumfangs.',
      ]}]},
      {role:'policy',name:'Vertrag_KFZ-A17.pdf',pages:[
        {heading:'Vollkasko - fiktive Vertragsregeln',lines:[
          'POLICE KFZ-2026-DEMO | Blatt 1',
          'Versichert sind selbstverschuldete Unfallschaeden.',
          'Selbstbeteiligung: EUR 500 pro Schadenfall.',
          'Schadenspositionen muessen mit dem Unfallhergang vereinbar sein.',
          'Fortsetzung mit Ausschluessen und Obliegenheiten auf Seite 2.',
        ]},
        {heading:'Ausschluesse und Pruefpflichten',lines:[
          'POLICE KFZ-2026-DEMO | Blatt 2',
          'Vorschaden und nicht unfallbedingte Maengel sind ausgeschlossen.',
          'Bei uneinheitlichem Schadenbild erfolgt manuelle Pruefung.',
          'Diese Beispielregel ist keine verbindliche Versicherungsbedingung.',
        ]}
      ]},
      {role:'invoice',name:'Werkstattrechnung_KFZ-A17.pdf',pages:[{heading:'Werkstattrechnung A17 (fiktiv)',lines:[
        'Position 1: Stossstange hinten - 1.200 EUR',
        'Position 2: Heckklappe - 1.800 EUR',
        'Position 3: Auspuffanlage - 1.200 EUR',
        'Summe: 4.200 EUR',
        'Fiktive Werkstattrechnung. Keine echte Forderung.',
      ]}]}
    ]
  },
  {id:'water',label:'02 / Leitungswasser',tagline:'Vollstaendige Belegmappe ohne markierte Auffaelligkeit · 3 PDF-Dateien',expected:'REVIEW_READY',
    files:[
      {role:'claim',name:'Schadenmeldung_HR-B21.pdf',pages:[{heading:'Schadenmeldung HR-B21',lines:[
        'Wasserschaden in der Kueche am 03. November 2026.',
        'Ein Zulaufschlauch unter der Spuele ist gerissen.',
        'Der Boden im Flur und in der Kueche wurde durchnaesst.',
        'Die Ursache wurde laut Meldung noch am selben Tag behoben.',
      ]}]},
      {role:'policy',name:'Vertrag_HR-B21.pdf',pages:[{heading:'Hausrat - fiktive Vertragsregeln',lines:[
        'Leitungswasser ist in diesem Beispiel mitversichert.',
        'Die genaue Bewertung von Ersatz und Abzuegen erfolgt manuell.',
        'Selbstbeteiligung: 150 EUR.',
      ]}]},
      {role:'invoice',name:'Rechnung_HR-B21.pdf',pages:[{heading:'Bodenrechnung HR-B21',lines:[
        'Position: Laminatboden Kueche und Flur - 23 qm.',
        'Neuverlegung und Material: 1.840 EUR.',
        'Fiktiver Rechnungsbeleg fuer einen Testfall.',
      ]}]},
    ]
  },
  {id:'burglary',label:'03 / Einbruch',tagline:'Bewusst unvollstaendige Akte · 2 PDF-Dateien',expected:'STOP_MISSING_SOURCE',
    files:[
      {role:'claim',name:'Schadenmeldung_HR-C09.pdf',pages:[{heading:'Schadenmeldung HR-C09',lines:[
        'Einbruchdiebstahl laut Versicherungsnehmerin.',
        'Aus der Wohnung fehlen ein Laptop und eine Kamera.',
        'Die Polizeianzeige ist laut Meldung noch offen.',
        'Die genaue Aufstellung der Einzelwerte ist nicht beigelegt.',
      ]}]},
      {role:'policy',name:'Vertrag_HR-C09.pdf',pages:[{heading:'Hausrat - Einbruch',lines:[
        'Einbruchdiebstahl ist grundsaetzlich versichert.',
        'Zur abschliessenden Pruefung ist ein polizeiliches Aktenzeichen erforderlich.',
        'Rechnungen und Nachweise zu geltend gemachten Positionen werden geprueft.',
      ]}]},
    ]
  }
]
const paperInk=rgb(.18,.22,.27)
const stone=rgb(.46,.49,.52)
const lineGrey=rgb(.83,.84,.83)
const accent=rgb(.49,.39,.28)
const pale=rgb(.965,.958,.941)
function lineWrap(s:string,font:any,size:number,maxWidth:number){
 const lines:string[]=[],words=s.split(' ');let current=''
 for(const word of words){
  const next=current?current+' '+word:word
  if(font.widthOfTextAtSize(next,size)>maxWidth&&current){lines.push(current);current=word}
  else current=next
 }
 if(current)lines.push(current)
 return lines
}
/** Real browser-generated text-based PDF specimens; all details fictional.
 * Their exact source text is preserved for independent page-span verification. */
export async function createScenarioPdfs(id:string):Promise<{
 scenario:Scenario;docs:{id:string;name:string;role:DocumentRole;bytes:Uint8Array}[]
}>{
 const scenario=scenarios.find(s=>s.id===id)
 if(!scenario)throw Error('Unknown synthetic scenario.')
 const docs=[]
 for(let fileIndex=0;fileIndex<scenario.files.length;fileIndex++){
  const source=scenario.files[fileIndex]
  const pdf=await PDFDocument.create()
  pdf.setTitle(source.name+' — Fictional sample')
  pdf.setAuthor('CLAIM / OS — Independent research demonstration')
  pdf.setSubject('Invented test material, not an official contract or invoice')
  const regular=await pdf.embedFont(StandardFonts.Helvetica)
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold)
  const typeName=source.role==='claim'?'SCHADENANZEIGE':source.role==='policy'?'VERTRAGSAUSZUG':source.role==='invoice'?'RECHNUNGSBELEG':'UNTERLAGE'
  const sectionName=source.role==='claim'?'01 / MELDUNG':source.role==='policy'?'02 / VERTRAG':source.role==='invoice'?'03 / POSITIONEN':'04 / ANHANG'
  for(let pageIndex=0;pageIndex<source.pages.length;pageIndex++){
   const section=source.pages[pageIndex]
   const p=pdf.addPage([595,842]),{width:w,height:h}=p.getSize()
   // Warm editorial document specimen: precise document hierarchy, no legacy lab teal.
   p.drawRectangle({x:0,y:0,width:w,height:h,color:rgb(.99,.988,.981)})
   p.drawRectangle({x:0,y:h-9,width:w,height:9,color:paperInk})
   p.drawText('MUSTERAKTE',{x:42,y:h-44,font:bold,size:12,color:paperInk,characterSpacing:1.1})
   p.drawText('NICHT RECHTSVERBINDLICH',{x:385,y:h-42,font:bold,size:7.5,color:accent})
   p.drawLine({start:{x:42,y:h-57},end:{x:w-42,y:h-57},thickness:.8,color:lineGrey})
   p.drawText(sectionName,{x:42,y:h-91,font:bold,size:9,color:accent,characterSpacing:.6})
   p.drawText('DOKUMENT '+String(fileIndex+1).padStart(2,'0'),{x:424,y:h-91,font:bold,size:9,color:stone})
   p.drawText(typeName,{x:42,y:h-131,font:bold,size:29,color:paperInk})
   p.drawText(section.heading,{x:43,y:h-162,font:regular,size:12,color:stone,maxWidth:480})
   p.drawLine({start:{x:42,y:h-186},end:{x:w-42,y:h-186},thickness:1,color:paperInk})
   // A structured document body retains the original, test-verifiable line text.
   if(source.role==='invoice'){
    p.drawRectangle({x:42,y:h-239,width:w-84,height:30,color:paperInk})
    p.drawText('LEISTUNGSBESCHREIBUNG',{x:54,y:h-229,font:bold,size:9,color:rgb(.96,.95,.91)})
    p.drawText('BELEG / EUR',{x:465,y:h-229,font:bold,size:8,color:rgb(.96,.95,.91)})
    let y=h-271
    for(let i=0;i<section.lines.length;i++){
     const entry=section.lines[i]
     const wrapped=lineWrap(entry,regular,11.1,w-119)
     if(i%2===0)p.drawRectangle({x:42,y:y-11,width:w-84,height:Math.max(34,wrapped.length*19+11),color:pale})
     for(const part of wrapped){p.drawText(part,{x:54,y,font:regular,size:11.1,color:paperInk});y-=19}
     p.drawLine({start:{x:42,y:y-3},end:{x:w-42,y:y-3},thickness:.5,color:lineGrey})
     y-=23
    }
   }else{
    const sub=source.role==='policy'?'VERSICHERUNGSUMFANG UND HINWEISE':'ANGABEN ZUM SCHADENEREIGNIS'
    p.drawText(sub,{x:43,y:h-225,font:bold,size:9,color:accent,characterSpacing:.6})
    let y=h-258
    for(let i=0;i<section.lines.length;i++){
     const entry=section.lines[i]
     const wrapped=lineWrap(entry,regular,11.35,w-126)
     p.drawText(String(i+1).padStart(2,'0'),{x:43,y,font:bold,size:9,color:rgb(.57,.60,.61)})
     for(const part of wrapped){p.drawText(part,{x:75,y,font:regular,size:11.35,color:paperInk});y-=19}
     y-=18
     if(i===0||i===section.lines.length-1)p.drawLine({start:{x:75,y:y+8},end:{x:w-42,y:y+8},thickness:.45,color:lineGrey})
    }
   }
   p.drawLine({start:{x:42,y:113},end:{x:w-42,y:113},thickness:1,color:lineGrey})
   p.drawRectangle({x:42,y:62,width:w-84,height:38,color:rgb(.958,.946,.919)})
   p.drawText('FIKTIVES TESTDOKUMENT',{x:53,y:85,font:bold,size:8.2,color:accent,characterSpacing:.5})
   p.drawText('Alle Angaben sind frei erfunden. Keine echten Kundendaten.',{x:53,y:71,font:regular,size:8,color:stone})
   p.drawText('CLAIM / OS   ·   UNABHAENGIGE ARBEITSPROBE',{x:43,y:30,font:bold,size:7.5,color:stone})
   p.drawText('SEITE '+(pageIndex+1)+' / '+source.pages.length,{x:473,y:30,font:bold,size:7.5,color:stone})
  }
  docs.push({id:'DOC-'+(fileIndex+1),name:source.name,role:source.role,bytes:await pdf.save()})
 }
 return {scenario,docs}
}
