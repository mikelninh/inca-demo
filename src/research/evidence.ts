import type { LoopCase } from '../types'

/**
 * Verifiable *provenance*, not verified *correctness*.
 * All text is taken verbatim from synthetic fixture fields.
 * A fixture contains no scanned PDF, page number or authenticated provider record.
 */
export type EvidenceKind = 'policy' | 'claimant' | 'invoice' | 'synthetic_trace'
export type EvidenceEntry = {
  id: string
  kind: EvidenceKind
  field: string
  title: string
  quote: string
  source_status: 'synthetic_fixture' | 'synthetic_analyst_note'
  human_verified: false
  page_number: null
}

function textAt(claim: LoopCase, field: string): string | null {
  if (field === 'policy_excerpt') return claim.policy_excerpt
  if (field === 'fnol_text') return claim.fnol_text
  const invoice = /^invoice_items\.(\d+)\.description$/.exec(field)
  if (invoice) return claim.invoice_items[Number(invoice[1])]?.description ?? null
  const note = /^receipt\.traces\.(\d+)\.summary$/.exec(field)
  if (note) return claim.receipt.traces[Number(note[1])]?.summary ?? null
  return null
}

export function evidenceLedger(claim: LoopCase): EvidenceEntry[] {
  const items: EvidenceEntry[] = [
    { id:'POLICY',kind:'policy',field:'policy_excerpt',title:'Vertrag / policy excerpt',
      quote:claim.policy_excerpt,source_status:'synthetic_fixture',human_verified:false,page_number:null },
    { id:'FNOL',kind:'claimant',field:'fnol_text',title:'Schadenmeldung / incident statement',
      quote:claim.fnol_text,source_status:'synthetic_fixture',human_verified:false,page_number:null },
    ...claim.invoice_items.map((item,i)=>({
      id:'INV-'+String(i+1).padStart(2,'0'),kind:'invoice' as const,
      field:'invoice_items.'+i+'.description',title:'Rechnungsposition '+(i+1),
      quote:item.description,source_status:'synthetic_fixture' as const,
      human_verified:false as const,page_number:null
    }))
  ]
  const traceIndex=claim.receipt.traces.findIndex(t=>/rechnungspr.fung|invoice review/i.test(t.agent))
  if(traceIndex>=0){
    items.push({id:'NOTE',kind:'synthetic_trace',
      field:'receipt.traces.'+traceIndex+'.summary',
      title:'Simulierte Agenten-Notiz — keine Primärquelle',
      quote:claim.receipt.traces[traceIndex].summary,
      source_status:'synthetic_analyst_note',human_verified:false,page_number:null})
  }
  return items
}

export function auditEvidenceLedger(claim:LoopCase, entries:EvidenceEntry[]){
  const checks=entries.map(entry=>{
    const source=textAt(claim,entry.field)
    return {id:entry.id,valid:typeof source==='string' && entry.quote.length>0 &&
      source.includes(entry.quote) && entry.human_verified===false &&
      entry.page_number===null &&
      (entry.kind==='synthetic_trace'?
        entry.source_status==='synthetic_analyst_note':
        entry.source_status==='synthetic_fixture')}
  })
  const required=['POLICY','FNOL',...claim.invoice_items.map((_,i)=>'INV-'+String(i+1).padStart(2,'0'))]
  const ids=entries.map(e=>e.id)
  const missing=required.filter(id=>!ids.includes(id))
  const duplicated=ids.length!==new Set(ids).size
  return {
    total:checks.length,
    exact:checks.filter(c=>c.valid).length,
    missing,
    duplicated,
    valid:checks.every(c=>c.valid)&&missing.length===0&&!duplicated,
    checks,
    limitations:'Exact field matching proves synthetic quote provenance only; it cannot establish factual support, document authenticity, correct legal interpretation or a real PDF page number.'
  }
}
