import {describe,it,expect} from 'vitest'
import {scenarios} from '../doclab/samples'
import {checkAgentDraft,sourcePackets,resolveExtractedCitation} from './agentContract'
import {runSyntheticRegression} from './regression'
import {createCitations,assessDossier} from '../doclab/pdfEvidence'

const sources=sourcePackets(scenarios[0])
const sample={
 summary:'Fiktiver Unfall, vor Entscheidung muss der Reparaturumfang fachlich geprüft werden.',
 disposition:'human_review',
 findings:[{
  category:'incident',label:'Anstoß',
  interpretation:'Der Schadenhergang beschreibt einen leichten Anstoß.',
  citation:{documentId:'DOC-1',page:1,
   quote:'Beim Ausparken bin ich leicht gegen eine Mauer gestossen.'}
 }]
}
describe('v0.4 model contract, no unverified model output',()=>{
 it('accepts an exact quoted contiguous line in a trusted authored example',()=>{
  const check=checkAgentDraft(sample,sources)
  expect(check.valid).toBe(true)
  expect(check.reason).toBe('VALID_CITATIONS')
  expect(check.autonomousPaymentAllowed).toBe(false)
  expect(check.humanApprovalRequired).toBe(true)
 })
 it('rejects a fabricated or paraphrased model citation',()=>{
  const forged={...sample,findings:[{...sample.findings[0],
    citation:{...sample.findings[0].citation,quote:'Beim Ausparken habe ich eine andere Ursache festgestellt.'}}]}
  expect(checkAgentDraft(forged,sources).reason).toBe('INVALID_CITATION')
  expect(checkAgentDraft(forged,sources).accepted).toBe(null)
 })
 it('rejects citations that span unrelated lines, even when all words appear',()=>{
  const joined=scenarios[0].files[0].pages[0].lines[2]+' '+scenarios[0].files[0].pages[0].lines[3]
  const forged={...sample,findings:[{...sample.findings[0],
    citation:{...sample.findings[0].citation,quote:joined}}]}
  expect(checkAgentDraft(forged,sources).valid).toBe(false)
 })
 it('rejects an invalid document page and a non-JSON-like schema',()=>{
  const forged={...sample,findings:[{...sample.findings[0],
    citation:{...sample.findings[0].citation,page:999}}]}
  expect(checkAgentDraft(forged,sources).valid).toBe(false)
  expect(checkAgentDraft({hello:'world'},sources).reason).toBe('INVALID_SCHEMA')
  expect(checkAgentDraft({...sample,disposition:'pay'},sources).valid).toBe(false)
 })
 it('blocks model findings when a required document class is absent',()=>{
  const filtered=sources.filter(x=>x.role!=='invoice')
  expect(checkAgentDraft(sample,filtered).reason).toBe('MISSING_REQUIRED_DOCUMENTS')
 })
 it('only resolves an exact quote on the same real extracted page',()=>{
  const docs=[{id:'DOC-1',pages:[{page:1,text:'A '+sample.findings[0].citation.quote+' B'}]}]
  expect(resolveExtractedCitation(docs,sample.findings[0].citation)?.offset).toBe(2)
  expect(resolveExtractedCitation(docs,{...sample.findings[0].citation,quote:'NOT PRESENT'})).toBe(null)
 })
 it('40 authored variations stay honest scripted regressions and catch all 20 STOP scenarios',()=>{
  const r=runSyntheticRegression()
  expect(r.total).toBe(40)
  expect(r.testNature).toBe('scripted_synthetic_regression')
  expect(r.humanEffect).toBe(null)
  expect(r.criticalGateMisses).toBe(0)
  expect(r.passed).toBe(40)
  expect(r.rows.filter(x=>x.expected.startsWith('STOP'))).toHaveLength(20)
 })
 it('the diagnostic engine still refuses autonomous settlement on every authored scenario',()=>{
  for(const s of scenarios){
   const docs=s.files.map((f,i)=>({
    id:'DOC-'+(i+1),name:f.name,role:f.role,origin:'generated_sample' as const,
    sizeBytes:0,bytes:new Uint8Array(),
    pages:f.pages.map((p,j)=>({page:j+1,text:p.lines.join(' ')}))
   }))
   const a=assessDossier(docs,createCitations(docs))
   expect(a.autonomousSettlementAllowed).toBe(false)
   expect(a.requiresHumanReview).toBe(true)
  }
 })
})
