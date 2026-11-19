import {describe,it,expect} from 'vitest'
import {PDFDocument} from 'pdf-lib'
import {createScenarioPdfs,scenarios} from './samples'

describe('v8: credible but explicitly fictitious source documents',()=>{
 it('renders a real PDF for every authored source in every case',async()=>{
  for(const scenario of scenarios){
   const result=await createScenarioPdfs(scenario.id)
   expect(result.docs).toHaveLength(scenario.files.length)
   for(let i=0;i<result.docs.length;i++){
    const bytes=result.docs[i].bytes
    expect(new TextDecoder().decode(bytes.slice(0,5))).toBe('%PDF-')
    const doc=await PDFDocument.load(bytes)
    expect(doc.getTitle()).toContain('Fictional sample')
    expect(doc.getSubject()).toContain('Invented test material')
    expect(doc.getPageCount()).toBe(scenario.files[i].pages.length)
    expect(doc.getPages()[0].getWidth()).toBe(595)
    expect(doc.getPages()[0].getHeight()).toBe(842)
    expect(bytes.byteLength).toBeGreaterThan(1100)
   }
  }
 })
 it('preserves the intentionally missing burglary invoice',async()=>{
  const result=await createScenarioPdfs('burglary')
  expect(result.docs.map(d=>d.role)).toEqual(['claim','policy'])
 })
 it('keeps the two-page real policy and original role ordering for source jumps',async()=>{
  const result=await createScenarioPdfs('parking')
  const policy=await PDFDocument.load(result.docs[1].bytes)
  expect(policy.getPageCount()).toBe(2)
  expect(result.docs.map(d=>d.role)).toEqual(['claim','policy','invoice'])
 })
})
