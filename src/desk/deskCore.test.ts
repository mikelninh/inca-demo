import {describe,it,expect} from 'vitest'
import {makeDeskCase,sortedQueue,allowedActions,recordReview,reopenCase,retagDocument,summarizeDesk,exportDeskAudit,safeFileGroup} from './deskCore'
import type {ParsedDocument,DocumentRole} from '../doclab/pdfEvidence'
function doc(id:string,role:DocumentRole,text:string):ParsedDocument{
 return {id,role,name:'PRIVATE_CUSTOMER_'+role+'_Dokument.pdf',origin:'user_upload',
  pages:[{page:1,text}],sizeBytes:100,bytes:new Uint8Array([37,80,68,70])}
}
const incident='Beim Ausparken bin ich leicht gegen eine Mauer gefahren.'
const policy='Vollkasko. Vorschaden ist ausgeschlossen.'
const invoice='Rechnung: Stossstange 100 EUR, Heckklappe 1700 EUR.'
const ready=()=>makeDeskCase('R1','Water',[
 doc('c','claim','Ein Zulaufschlauch platzte, Wasser auf dem Boden.'),
 doc('p','policy','Leitungswasser ist versichert.'),
 doc('i','invoice','Rechnung Reparatur Boden 850 EUR.')
])
const mismatch=()=>makeDeskCase('A2','Parking',[doc('c','claim',incident),doc('p','policy',policy),doc('i','invoice',invoice)])
const missing=()=>makeDeskCase('M3','Burglary',[doc('c','claim','Einbruch Schadenmeldung'),doc('p','policy','Police: Einbruch versichert.')])

describe('operator daily workflow, no live claims',()=>{
 it('triages the original PDF text and prioritises exceptions over ready cases',()=>{
  const a=ready(),b=mismatch(),c=missing()
  expect(a.assessment.status).toBe('REVIEW_READY')
  expect(b.assessment.status).toBe('REVIEW_DISCREPANCY')
  expect(c.assessment.status).toBe('STOP_MISSING_SOURCE')
  expect(sortedQueue([a,b,c]).map(x=>x.id)).toEqual(['M3','A2','R1'])
 })
 it('never allows missing-document cases to enter expert-ready path',()=>{
  const c=missing()
  expect(allowedActions(c)).not.toContain('ready_for_expert')
  expect(()=>recordReview(c,'ready_for_expert','',2200)).toThrow(/erlaubt/i)
  const waiting=recordReview(c,'request_documents','Please send invoice',1200)
  expect(waiting.stage).toBe('waiting')
  expect(()=>recordReview(waiting,'request_documents','duplicate',300)).toThrow(/wieder öffnen/)
 })
 it('measures actual time in the desk but refuses to equate it with savings',()=>{
  const a=recordReview(ready(),'ready_for_expert','Looks fine',4300)
  const b=recordReview(mismatch(),'refer_specialist','Review mismatch',2100)
  const metrics=summarizeDesk([a,b,missing()])
  expect(metrics.reviewed).toBe(2)
  expect(metrics.measuredActiveMs).toBe(6400)
  expect(metrics.reviewedWithMeasuredTime).toBe(2)
  expect(metrics.timeSavedAgainstBaseline).toBe(null)
  expect(metrics.expertValidated).toBe(false)
 })
 it('does not export names, bytes, source text, quotes or user notes',()=>{
  const c=recordReview(mismatch(),'refer_specialist','Customer name: CLIENT SECRET',1234)
  const data=exportDeskAudit([c])
  const value=JSON.stringify(data)
  expect(value).toContain('claim-os-6-operator-audit-v1')
  expect(value).toContain('refer_specialist')
  expect(value).not.toContain('PRIVATE_CUSTOMER')
  expect(value).not.toContain('CLIENT SECRET')
  expect(value).not.toContain('Beim Ausparken')
  expect(value).not.toContain('Heckklappe')
  expect(value).not.toContain('A2')
  expect(data.measured_human_time_saving).toBe(null)
  expect(data.no_autonomous_payments).toBe(true)
 })
 it('retagging reopens reviewed cases and recalculates source role validity',()=>{
  const original=recordReview(ready(),'ready_for_expert','',1000)
  expect(original.stage).toBe('reviewed')
  const changed=retagDocument(original,'i','unknown')
  expect(changed.stage).toBe('open')
  expect(changed.assessment.status).toBe('STOP_MISSING_SOURCE')
  expect(changed.events.at(-1)?.kind).toBe('reopened')
  expect(changed.events[0]?.kind).toBe('review')
 })
 it('can reopen waiting and completed cases without erasing the audit trail',()=>{
  const c=recordReview(missing(),'request_documents','',1000)
  const reopened=reopenCase(c,'New documents supplied')
  expect(reopened.events).toHaveLength(2)
  expect(reopened.stage).toBe('open')
 })
 it('groups uploads only with an explicit claim ID and never assumes from ordinary filename',()=>{
  expect(safeFileGroup('CASE-104__Schadenmeldung.pdf')).toBe('CASE-104')
  expect(safeFileGroup('case-ab22__Invoice.pdf')).toBe('CASE-AB22')
  expect(safeFileGroup('Rechnung_Max_Mustermann.pdf')).toBe(null)
  expect(safeFileGroup('CASE-104_Meldung.pdf')).toBe(null)
  expect(safeFileGroup('CASE-104__scan.pdf.exe')).toBe('CASE-104')
 })
 it('rejects invalid review duration and oversized notes',()=>{
  expect(()=>recordReview(ready(),'ready_for_expert','',-1)).toThrow()
  expect(()=>recordReview(ready(),'ready_for_expert','',Number.POSITIVE_INFINITY)).toThrow()
  expect(()=>recordReview(ready(),'ready_for_expert','x'.repeat(601),0)).toThrow()
 })
})
