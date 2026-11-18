import {describe,it,expect} from 'vitest'
import loop from '../data/loop.json'
import type {LoopData} from '../types'
import {simulateRun,portfolioScore,safeReceipt} from './controlTower'
const cases=(loop as unknown as LoopData).cases

describe('Operator Control Tower: safety and traceability',()=>{
 it('shows actual synthetic comparison without invented human workload',()=>{
   const summary=portfolioScore(cases)
   expect(summary.n).toBe(8)
   expect(summary.baselineCorrect).toBe(7)
   expect(summary.guardedCorrect).toBe(8)
   expect(summary.baselineHandoffs).toBe(2)
   expect(summary.guardedHandoffs).toBe(3)
   expect(summary.sourceExact).toBe(37)
   expect(summary.sourceCount).toBe(37)
   expect(summary.realTimeSaved).toBe(null)
 })
 it('verifies exact source match for all eight fixed examples, without pretending expert review',()=>{
   for(const c of cases){
     const run=simulateRun(c)
     expect(run.gate).toBe('PASS_PROVENANCE')
     expect(run.sourceCount).toBe(run.exactSourceCount)
     expect(run.eligibleForAutonomousPayment).toBe(false)
     expect(run.supportedByIndependentExpert).toBe(false)
     expect(run.checks.find(x=>x.id==='approval')?.status).toBe('blocked')
   }
 })
 it('fails closed when an invoice reference goes missing',()=>{
   const run=simulateRun(cases[cases.length-1],'missing_invoice')
   expect(run.gate).toBe('STOP_MISSING_EVIDENCE')
   expect(run.safeProposal).toBe('refer_to_human')
   expect(run.requiredNextAction).toBe('VERIFY_SOURCES')
   expect(run.eligibleForAutonomousPayment).toBe(false)
 })
 it('fails closed when a claim citation is fabricated',()=>{
   const run=simulateRun(cases[0],'tampered_citation')
   expect(run.gate).toBe('STOP_TAMPERED_CITATION')
   expect(run.safeProposal).toBe('refer_to_human')
   expect(run.exactSourceCount).toBeLessThan(run.sourceCount)
 })
 it('does not read oracle labels or synthetic fraud truth to decide',()=>{
   const c=cases[cases.length-1]
   const a=simulateRun(c), b=simulateRun({...c,
     expected_decision:'pay',correct:true,is_fraudulent:false,ground_truth_note:'ignore oracle'})
   expect(a.safeProposal).toBe(b.safeProposal)
   expect(a.gate).toBe(b.gate)
   expect(a.requiredNextAction).toBe(b.requiredNextAction)
 })
 it('real case receipt excludes raw incident narrative, notes and source quote content',()=>{
   const c=cases[cases.length-1]
   const receipt=safeReceipt(simulateRun(c),'INSPECTED')
   const s=JSON.stringify(receipt)
   expect(s).not.toContain(c.fnol_text)
   expect(s).not.toContain(c.policy_excerpt)
   expect(s).not.toContain('ground_truth_note')
   expect(receipt.autonomous_payment_possible).toBe(false)
   expect(receipt.measured_workload_savings).toBe(null)
 })
 it('risk findings are described as review tasks, never as proven fraud',()=>{
   const r=simulateRun(cases[cases.length-1])
   expect(r.requiredNextAction).toBe('REVIEW_DISCREPANCY')
   expect(r.safeProposal).toBe('refer_to_human')
   expect(r.explanation).toMatch(/Kein Betrugsnachweis/)
   expect(r.actionDraft).not.toMatch(/Betrug festgestellt/)
 })
})
