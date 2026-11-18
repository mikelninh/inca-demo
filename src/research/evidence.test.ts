import {describe,expect,it} from 'vitest'
import loop from '../data/loop.json'
import type {LoopCase,LoopData} from '../types'
import {evidenceLedger,auditEvidenceLedger} from './evidence'
import {applyScopeGuardrail} from '../escalationRule'

const cases=(loop as unknown as LoopData).cases as LoopCase[]

describe('INCA traceable-decision ledger (synthetic only)',()=>{
 it('every proposed quote resolves exactly to its labelled fixture field',()=>{
  expect(cases).toHaveLength(8)
  for(const c of cases){
   const ledger=evidenceLedger(c),audit=auditEvidenceLedger(c,ledger)
   expect(audit.valid,c.claim_id).toBe(true)
   expect(audit.exact).toBe(audit.total)
   expect(ledger.filter(x=>x.kind==='policy')).toHaveLength(1)
   expect(ledger.filter(x=>x.kind==='claimant')).toHaveLength(1)
   expect(ledger.filter(x=>x.kind==='invoice')).toHaveLength(c.invoice_items.length)
   expect(ledger.every(x=>x.page_number===null&&x.human_verified===false)).toBe(true)
  }
 })
 it('refuses fabricated passages, missing evidence and duplicate ids',()=>{
  const c=cases[0]
  const exact=evidenceLedger(c)
  expect(auditEvidenceLedger(c,[{...exact[0],quote:'This quote does not appear in any real fixture'},...exact.slice(1)]).valid).toBe(false)
  expect(auditEvidenceLedger(c,exact.slice(1)).valid).toBe(false)
  expect(auditEvidenceLedger(c,[...exact,exact[0]]).valid).toBe(false)
 })
 it('does not label synthetic analyst notes as primary policy or authenticated PDF',()=>{
  const ledger=evidenceLedger(cases[cases.length-1])
  const notes=ledger.filter(x=>x.kind==='synthetic_trace')
  expect(notes).toHaveLength(1)
  expect(notes[0].source_status).toBe('synthetic_analyst_note')
  expect(notes[0].page_number).toBe(null)
 })
 it('separately measures fixture-level decision accuracy without claiming document support',()=>{
  const base=cases.filter(c=>c.decision===c.expected_decision).length
  const improved=cases.filter(c=>applyScopeGuardrail(c).decision===c.expected_decision).length
  expect(base).toBe(7)
  expect(improved).toBe(8)
  expect(cases.some(c=>c.expected_decision==='refer_to_human'&&c.decision!=='refer_to_human')).toBe(true)
  expect(cases.every(c=>evidenceLedger(c).every(x=>!x.human_verified))).toBe(true)
 })
})
