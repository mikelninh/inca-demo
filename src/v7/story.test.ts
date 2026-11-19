import {describe,it,expect} from 'vitest'
import {makeDeskCase} from '../desk/deskCore'
import {storyFor,sceneCitation,narrativeReceipt,sceneLabels} from './story'
import type {DocumentRole,ParsedDocument} from '../doclab/pdfEvidence'
function pdf(role:DocumentRole,text:string):ParsedDocument{
 return {id:role,role,name:'synthetic-'+role+'.pdf',origin:'generated_sample',pages:[{page:1,text}],sizeBytes:40,bytes:new Uint8Array([37,80,68,70])}
}
function base(){
 return [pdf('claim','Einbruchdiebstahl Schadenmeldung. Die Polizeianzeige ist offen.'),
 pdf('policy','Einbruch ist versichert. Polizeiliches Aktenzeichen erforderlich.'),
 pdf('invoice','Rechnung Reparatur: 340 EUR')]
}
describe('cinematic evidence narrative stays grounded',()=>{
 it('has exactly three concise scenes',()=>{
  expect(sceneLabels).toEqual(['Der Fall','Die Fundstelle','Die Handlung'])
 })
 it('never says missing invoice is verified',()=>{
  const c=makeDeskCase('A','Claim',base().slice(0,2))
  expect(c.assessment.status).toBe('STOP_MISSING_SOURCE')
  expect(storyFor(c).headline).toBe('The missing piece.')
  expect(storyFor(c).subhead).toContain('Dokument fehlt')
  expect(narrativeReceipt(c).complete).toBe(false)
 })
 it('labels proof as word-for-word text and not expert validation',()=>{
  const c=makeDeskCase('B','Claim',base())
  expect(c.assessment.status).toBe('REQUEST_EVIDENCE')
  const story=storyFor(c)
  expect(story.findingSubtitle).toContain('Beispielpolice')
  expect(story.progressHint).toContain('Wortgleich')
  const cite=sceneCitation(c)
  expect(cite?.documentId).toBe('claim')
  expect(narrativeReceipt(c).count).toBe(c.citations.length)
 })
 it('chooses a policy exclusion when a repair scope mismatch is raised',()=>{
  const c=makeDeskCase('C','Car accident',[
   pdf('claim','Beim Ausparken gab es einen leichten Parkrempler.'),
   pdf('policy','Vorschaden und nicht unfallbedingte Schäden sind ausgeschlossen.'),
   pdf('invoice','Rechnung für Heckklappe und Auspuffanlage.')
  ])
  expect(c.assessment.status).toBe('REVIEW_DISCREPANCY')
  expect(storyFor(c).headline).toBe("Something doesn't add up.")
  expect(sceneCitation(c)?.role).toBe('policy')
  expect(storyFor(c).findingSubtitle).toContain('Fachperson')
 })
 it('returns no citation if all pages are unreadable',()=>{
  const c=makeDeskCase('D','Blank',[pdf('claim',''),pdf('policy',''),pdf('invoice','')])
  expect(sceneCitation(c)).toBe(null)
  expect(storyFor(c).headline).toBe('Proof, not promises.')
  expect(narrativeReceipt(c).count).toBe(0)
 })
 it('says fully parsable means ready for human review, not approved',()=>{
  const c=makeDeskCase('E','Water',[pdf('claim','Leitungswasser Schaden'),pdf('policy','Leitungswasser ist versichert'),pdf('invoice','Rechnung 100 EUR')])
  expect(c.assessment.status).toBe('REVIEW_READY')
  expect(storyFor(c).headline).toBe('Ready for the human eye.')
  expect(storyFor(c).subhead).toContain('fachliche Entscheidung')
  expect(narrativeReceipt(c).complete).toBe(true)
 })
})
