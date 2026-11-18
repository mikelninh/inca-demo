import {describe,expect,it} from 'vitest'
import {allocateCases,countedActiveTime,compareTrial,describeArm} from './study'
import type {TrialResult} from './study'

const ids=['C1','C2','C3','C4','C5','C6','C7','C8']
describe('INCA controlled reviewer study (measurement integrity)',()=>{
 it('assigns 8 unique cases once with 4 reference and 4 assisted, shuffled',()=>{
  for(const seed of [0,1,42,4294967295]){
   const out=allocateCases(ids,seed)
   expect(out).toHaveLength(8)
   expect(new Set(out.map(x=>x.caseId)).size).toBe(8)
   expect(out.filter(x=>x.arm==='reference')).toHaveLength(4)
   expect(out.filter(x=>x.arm==='evidence_assist')).toHaveLength(4)
   expect(out.map(x=>x.sequence)).toEqual([0,1,2,3,4,5,6,7])
   expect(allocateCases(ids,seed)).toEqual(out)
  }
 })
 it('alternates every case to the other arm for an opposite seed parity',()=>{
  const a=allocateCases(ids,100),b=allocateCases(ids,101)
  for(const id of ids)expect(a.find(x=>x.caseId===id)?.arm).not.toBe(b.find(x=>x.caseId===id)?.arm)
 })
 it('never reports hypothetical reviewer time as observed savings',()=>{
  const out=compareTrial([])
  expect(out.n).toBe(0)
  expect(out.deltaMedianCorrectMs).toBe(null)
  expect(out.reference.medianActiveMs).toBe(null)
  expect(out.assisted.correctness).toBe(null)
  expect(out.actionable_real_world_workload_claim).toBe(false)
 })
 it('active-time clock excludes periods when tab is hidden',()=>{
  expect(countedActiveTime(100,500,250,false)).toBe(250)
  expect(countedActiveTime(100,500,250,true)).toBe(650)
  expect(()=>countedActiveTime(400,100,0,true)).toThrow()
 })
 it('reports time per correctly reviewed case, not total speed alone',()=>{
  const rows:TrialResult[]=[
   {caseId:'A',arm:'reference',sequence:0,reviewerDecision:'pay',
    matchesFixtureLabel:true,evidenceJudgement:'supported',timeActiveMs:80000,
    sourceJumpCount:0,completed:true},
   {caseId:'B',arm:'reference',sequence:1,reviewerDecision:'decline',
    matchesFixtureLabel:false,evidenceJudgement:'uncertain',timeActiveMs:1000,
    sourceJumpCount:0,completed:true},
   {caseId:'C',arm:'evidence_assist',sequence:2,reviewerDecision:'refer_to_human',
    matchesFixtureLabel:true,evidenceJudgement:'supported',timeActiveMs:60000,
    sourceJumpCount:3,completed:true}
  ]
  const result=compareTrial(rows,new Set(['C']))
  expect(result.reference.medianActiveMs).toBe(40500)
  expect(result.reference.medianCorrectMs).toBe(80000)
  expect(result.assisted.medianCorrectMs).toBe(60000)
  expect(result.assisted.sourceJumps).toBe(3)
  expect(result.assisted.criticalErrors).toBe(0)
  expect(result.deltaMedianCorrectMs).toBe(-20000)
  expect(result.actionable_real_world_workload_claim).toBe(false)
  expect(()=>compareTrial([...rows,rows[0]])).toThrow(/Same session/)
  expect(()=>describeArm([{...rows[0],timeActiveMs:-20}],'reference')).toThrow(/Invalid/)
 })
 it('rejects duplicate case IDs and undefined randomisation',()=>{
  expect(()=>allocateCases(['X','X'],2)).toThrow()
  expect(()=>allocateCases(ids,-1)).toThrow()
  expect(()=>allocateCases([],2)).toThrow()
 })
})
