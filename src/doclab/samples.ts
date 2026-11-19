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
const pageColor=rgb(.11,.21,.25)
const muted=rgb(.45,.54,.58)
const green=rgb(.16,.45,.40)
function lineWrap(s:string,font:any,size:number,maxWidth:number){
  const out:string[]=[]
  const words=s.split(' ')
  let cur=''
  for(const word of words){
    const next=cur?cur+' '+word:word
    if(font.widthOfTextAtSize(next,size)>maxWidth&&cur){out.push(cur);cur=word}
    else cur=next
  }
  if(cur)out.push(cur)
  return out
}
/** The PDFs here are GENERATED IN BROWSER. Their labels are not external truth. */
export async function createScenarioPdfs(id:string):Promise<{
  scenario:Scenario;docs:{id:string;name:string;role:DocumentRole;bytes:Uint8Array}[]
}>{
 const scenario=scenarios.find(s=>s.id===id)
 if(!scenario)throw Error('Unknown synthetic scenario.')
 const docs=[]
 for(let index=0;index<scenario.files.length;index++){
   const source=scenario.files[index]
   const pdf=await PDFDocument.create()
   pdf.setTitle(source.name+' - fictional INCA work sample')
   pdf.setAuthor('Independent research prototype')
   const regular=await pdf.embedFont(StandardFonts.Helvetica)
   const bold=await pdf.embedFont(StandardFonts.HelveticaBold)
   for(let pageIndex=0;pageIndex<source.pages.length;pageIndex++){
     const section=source.pages[pageIndex],p=pdf.addPage([595,842])
     const {width,height}=p.getSize()
     p.drawRectangle({x:0,y:height-112,width,height:112,color:pageColor})
     p.drawText('INCA  /  DOCUMENT EVIDENCE LAB',{x:42,y:height-46,font:bold,size:11,color:rgb(.7,.91,.85)})
     p.drawText('INDEPENDENT WORK SAMPLE - FICTITIOUS DOCUMENT',{x:42,y:height-70,font:regular,size:8,color:rgb(.68,.81,.82)})
     p.drawText(section.heading,{x:43,y:height-160,font:bold,size:19,color:pageColor,maxWidth:510})
     p.drawLine({start:{x:43,y:height-177},end:{x:width-43,y:height-177},color:rgb(.86,.90,.90)})
     let y=height-216
     for(const line of section.lines){
       const wrapped=lineWrap(line,regular,11.7,width-90)
       for(const text of wrapped){
         p.drawText(text,{x:46,y,font:regular,size:11.7,color:pageColor})
         y-=21
       }
       y-=12
     }
     p.drawRectangle({x:44,y:45,width:width-88,height:48,color:rgb(.92,.96,.94)})
     p.drawText('BEISPIELDOKUMENT - KEINE ECHTE VERSICHERUNGSUNTERLAGE',
       {x:57,y:72,font:bold,size:9,color:green})
     p.drawText('All data is authored for tests. No customer records.',{x:57,y:57,font:regular,size:8,color:muted})
     p.drawText('Document '+(index+1)+' / '+scenario.files.length+'   |   Page '+(pageIndex+1)+' / '+source.pages.length,
       {x:43,y:24,font:regular,size:8,color:muted})
   }
   docs.push({id:'DOC-'+(index+1),name:source.name,role:source.role,bytes:await pdf.save()})
 }
 return {scenario,docs}
}
