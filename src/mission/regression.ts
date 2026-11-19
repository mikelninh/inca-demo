import {assessDossier,createCitations} from '../doclab/pdfEvidence'
import type {DossierStatus,ParsedDocument} from '../doclab/pdfEvidence'

type Expected='REVIEW_READY'|'REVIEW_DISCREPANCY'|'STOP_MISSING_SOURCE'|'STOP_UNREADABLE'|'STOP_CITATION_INVALID'
export type RegressionRow={id:string;category:string;expected:Expected;actual:DossierStatus;passed:boolean}
const fd=(id:string,role:ParsedDocument['role'],text:string):ParsedDocument=>({
  id,name:id+'.pdf',role,origin:'generated_sample',bytes:new Uint8Array(),sizeBytes:0,
  pages:[{page:1,text}]
})
const claimWater=(i:number)=>fd('C'+i,'claim',
  'Wasserschaden: Ein Zulaufschlauch ist gerissen. Betroffen ist der Boden in Zimmer '+(i+1)+'.')
const policyWater=(i:number)=>fd('P'+i,'policy',
  'Leitungswasser ist eingeschlossen. Selbstbeteiligung '+(100+i*10)+' EUR.')
const invoiceWater=(i:number)=>fd('I'+i,'invoice',
  'Rechnung fuer Trocknung und Boden '+(i+1)+': '+(250+i*45)+' EUR.')
const claimMotor=(i:number)=>fd('C'+i,'claim',
  'Beim Ausparken bin ich leicht gegen ein Hindernis gestossen, die Stossstange ist verformt. Kennung A-'+i)
const policyMotor=(i:number)=>fd('P'+i,'policy',
  'Vollkasko; Vorschaden ist ausgeschlossen. Selbstbeteiligung '+(100+i*10)+' EUR.')
const invoiceMotor=(i:number)=>fd('I'+i,'invoice',
  'Werkstattrechnung: Stossstange und Heckklappe '+(1200+i*100)+' EUR.')
export function runSyntheticRegression():{
  total:number;passed:number;criticalGateMisses:number;
  rows:RegressionRow[];testNature:'scripted_synthetic_regression';humanEffect:null
}{
 const rows:RegressionRow[]=[]
 const check=(id:string,category:string,expected:Expected,docs:ParsedDocument[],tamper=false)=>{
   const citations=createCitations(docs)
   const tested=tamper&&citations[0]?
     citations.map((c,i)=>i===0?{...c,quote:c.quote+' ADDED WITHOUT SOURCE'}:c):citations
   const actual=assessDossier(docs,tested).status
   rows.push({id,category,expected,actual,passed:actual===expected})
 }
 for(let i=0;i<10;i++){
   check('W'+i,'Complete water file','REVIEW_READY',
     [claimWater(i),policyWater(i),invoiceWater(i)])
   check('M'+i,'Motor discrepancy','REVIEW_DISCREPANCY',
     [claimMotor(i),policyMotor(i),invoiceMotor(i)])
   check('D'+i,'Missing document','STOP_MISSING_SOURCE',
     [claimWater(i),policyWater(i)])
 }
 for(let i=0;i<5;i++){
   const docs=[claimMotor(i),policyMotor(i),invoiceMotor(i)]
   check('T'+i,'Altered citation','STOP_CITATION_INVALID',docs,true)
   const empty=[{...claimWater(i),pages:[{page:1,text:''}]},policyWater(i),invoiceWater(i)]
   check('U'+i,'Unreadable PDF page','STOP_UNREADABLE',empty)
 }
 const critical=rows.filter(r=>r.expected.startsWith('STOP'))
 return {
   total:rows.length,passed:rows.filter(x=>x.passed).length,
   criticalGateMisses:critical.filter(x=>!x.passed).length,
   rows,testNature:'scripted_synthetic_regression',humanEffect:null
 }
}
