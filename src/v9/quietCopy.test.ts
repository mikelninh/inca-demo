import {describe,it,expect} from 'vitest'
import {caseCopy,caseTone,firstSource} from './quietCopy'
import {makeDeskCase,recordReview} from '../desk/deskCore'
import type {ParsedDocument,DocumentRole} from '../doclab/pdfEvidence'
import {checkCitation} from '../doclab/pdfEvidence'
function doc(id:string,role:DocumentRole,text:string):ParsedDocument{
 return {id,role,name:id+'.pdf',origin:'generated_sample',pages:[{page:1,text}],bytes:new Uint8Array([37,80,68,70]),sizeBytes:4}
}
describe('v9 Quiet Workspace: conservative presentation',()=>{
 const parking=()=>makeDeskCase('KFZ-A17','Parking',[
  doc('claim','claim','Beim Ausparken leicht gestossen.'),
  doc('policy','policy','Vorschaden und nicht unfallbedingte Reparaturen sind ausgeschlossen.'),
  doc('invoice','invoice','Rechnung: Heckklappe und Auspuffanlage.')
 ])
 it('shows an unresolved question for a discrepancy; never an automatic fraud or coverage verdict',()=>{
  const c=parking()
  expect(c.assessment.status).toBe('REVIEW_DISCREPANCY')
  expect(caseCopy(c).heading).toBe('Ein Detail verdient Aufmerksamkeit.')
  expect(caseCopy(c).finding).toContain('könnte')
  expect(caseTone(c)).toBe('warning')
 })
 it('opens the actual invoice source and checks its literal span',()=>{
  const c=parking(),best=firstSource(c)
  expect(best?.role).toBe('invoice')
  expect(best?.label).toBe('Reparaturumfang')
  expect(best&&checkCitation(c.documents,best)).toBe(true)
 })
 it('shows a proper stop if invoice is absent, never an expert-ready verdict',()=>{
  const c=makeDeskCase('C','Burglary',[
   doc('claim','claim','Einbruchdiebstahl, Polizei wurde informiert.'),
   doc('policy','policy','Ein polizeiliches Aktenzeichen ist notwendig.')
  ])
  expect(c.assessment.status).toBe('STOP_MISSING_SOURCE')
  expect(caseCopy(c).heading).toBe('Eine Unterlage fehlt.')
  expect(caseTone(c)).toBe('blocked')
  expect(firstSource(c)).not.toBeNull()
 })
 it('does not mistake document-complete technical status for insurance approval',()=>{
  const c=makeDeskCase('W','Water',[
   doc('claim','claim','Wasserschaden Küche.'),
   doc('policy','policy','Leitungswasser versichert'),
   doc('invoice','invoice','Rechnung Reparatur')
  ])
  expect(c.assessment.status).toBe('REVIEW_READY')
  expect(caseCopy(c).description).toContain('Noch keine Entscheidung')
  const done=recordReview(c,'ready_for_expert','',1500)
  expect(caseTone(done)).toBe('done')
  expect(done.assessment.autonomousSettlementAllowed).toBe(false)
 })
})
