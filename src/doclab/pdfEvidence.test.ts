import {describe,it,expect} from 'vitest'
import {assessDossier,checkCitation,createCitations,exportSafeAudit,sniffRole} from './pdfEvidence'
import type {ParsedDocument} from './pdfEvidence'
function doc(id:string,role:ParsedDocument['role'],text:string):ParsedDocument{
  return {id,name:id+'.pdf',role,origin:'generated_sample',
    bytes:new Uint8Array([37,80,68,70]),sizeBytes:4,pages:[{page:1,text}]}
}
const base=[
  doc('C','claim','Schadenmeldung: Beim Ausparken bin ich leicht gegen eine Mauer gestossen.'),
  doc('P','policy','Vollkasko. Vorschaden und nicht unfallbedingte Maengel sind ausgeschlossen.'),
  doc('I','invoice','Rechnung: Stossstange 1200. Heckklappe 1800. Auspuffanlage 1200.')
]
describe('PDF Evidence Engine — no oracle labels or automatic claim outcome',()=>{
  it('returns a review task when all local source types are present and signal conflicts',()=>{
    const refs=createCitations(base),a=assessDossier(base,refs)
    expect(a.status).toBe('REVIEW_DISCREPANCY')
    expect(a.totalCitations).toBeGreaterThan(2)
    expect(a.validCitations).toBe(a.totalCitations)
    expect(a.autonomousSettlementAllowed).toBe(false)
    expect(a.verifiedByIndependentExpert).toBe(false)
    expect(a.realWorldAccuracy).toBe(null)
  })
  it('verifies exact byte-span and page, rejects fabricated content and forged page',()=>{
    const refs=createCitations(base)
    expect(refs.every(c=>checkCitation(base,c))).toBe(true)
    const forged=[{...refs[0],quote:'FABRICATED SPAN'},...refs.slice(1)]
    expect(assessDossier(base,forged).status).toBe('STOP_CITATION_INVALID')
    expect(checkCitation(base,{...refs[0],page:57})).toBe(false)
    expect(checkCitation(base,{...refs[0],offset:-4})).toBe(false)
  })
  it('keeps cinematic focus cues inside independently verified PDF source quotes',()=>{
    const refs=createCitations(base)
    const targeted=refs.find(c=>c.focusText)
    expect(targeted).toBeDefined()
    expect(targeted?.focusOffset).toBeGreaterThanOrEqual(targeted?.offset??0)
    expect(targeted?.quote).toContain(targeted?.focusText)
    expect(checkCitation(base,targeted!)).toBe(true)
    expect(checkCitation(base,{...targeted!,focusText:'FORGED MATCH'})).toBe(false)
    expect(checkCitation(base,{...targeted!,focusOffset:9999})).toBe(false)
    const withInvalid=refs.map(c=>c.id===targeted?.id?{...c,focusText:'SYNTHETIC EVIDENCE'}:c)
    expect(assessDossier(base,withInvalid).status).toBe('STOP_CITATION_INVALID')
  })
  it('fails closed when invoice or coverage document missing',()=>{
    const without=base.filter(x=>x.role!=='invoice')
    const a=assessDossier(without,createCitations(without))
    expect(a.status).toBe('STOP_MISSING_SOURCE')
    expect(a.missingRoles).toContain('invoice')
    expect(a.requiresHumanReview).toBe(true)
  })
  it('fails closed on image-only pages, without hallucinating OCR',()=>{
    const docs=base.map((x,i)=>i===0?{...x,pages:[{page:1,text:''}]}:x)
    const a=assessDossier(docs,createCitations(docs))
    expect(a.status).toBe('STOP_UNREADABLE')
    expect(a.scannedOrEmptyPages).toBe(1)
  })
  it('leaves a complete water leak case as human review candidate, not auto-pay',()=>{
    const docs=[
      doc('C','claim','Ein Zulaufschlauch ist gerissen. Wasserschaden in der Kueche.'),
      doc('P','policy','Leitungswasser gedeckt. Selbstbeteiligung 150 Euro.'),
      doc('I','invoice','Rechnung: Boden Neuverlegung 1840 Euro.')
    ]
    const a=assessDossier(docs,createCitations(docs))
    expect(a.status).toBe('REVIEW_READY')
    expect(a.autonomousSettlementAllowed).toBe(false)
  })
  it('does not export raw filenames, PDF bytes or document texts',()=>{
    const refs=createCitations(base),a=assessDossier(base,refs)
    const exportText=JSON.stringify(exportSafeAudit(base,a))
    for(const d of base){
      expect(exportText).not.toContain(d.name)
      expect(exportText).not.toContain(d.pages[0].text)
    }
    expect(exportText).toContain('measured_worker_time_saving')
    expect(exportText).toContain('null')
  })
  it('classifies filenames cautiously, unknown names stay unknown',()=>{
    expect(sniffRole('vertrag_A.pdf')).toBe('policy')
    expect(sniffRole('rechnung_b.pdf')).toBe('invoice')
    expect(sniffRole('claim-c.pdf')).toBe('claim')
    expect(sniffRole('scan_042.pdf')).toBe('unknown')
  })
})
