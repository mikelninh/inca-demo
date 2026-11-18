import type { Decision } from '../types'

export type TrialArm = 'reference' | 'evidence_assist'
export type SourceRating = 'supported' | 'unsupported' | 'uncertain'
export type Assignment = { caseId:string; arm:TrialArm; sequence:number }
export type TrialResult = {
  caseId:string; arm:TrialArm; sequence:number;
  reviewerDecision:Decision; matchesFixtureLabel:boolean;
  evidenceJudgement:SourceRating; timeActiveMs:number;
  sourceJumpCount:number; completed:true
}
export type TrialSummary = {
  n:number; correct:number; correctness:number|null;
  medianActiveMs:number|null; medianCorrectMs:number|null;
  sourceJumps:number; sourceSupported:number;
  errors:number; criticalErrors:number|null;
}

function seeded(seed:number){
  let state=(seed>>>0)||0x9e3779b9
  return ()=>{
    state^=state<<13;state^=state>>>17;state^=state<<5
    return (state>>>0)/4294967296
  }
}
export function allocateCases(caseIds:string[], seed:number):Assignment[]{
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Seed must be a uint32')
  if(!caseIds.length || new Set(caseIds).size!==caseIds.length)throw Error('Unique case IDs are required')
  const assignments=caseIds.map((caseId,index)=>({
    caseId,
    arm:((index+(seed%2))%2===0?'reference':'evidence_assist') as TrialArm,
    sequence:0
  }))
  const random=seeded(seed)
  for(let i=assignments.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1))
    ;[assignments[i],assignments[j]]=[assignments[j],assignments[i]]
  }
  return assignments.map((a,sequence)=>({...a,sequence}))
}
function median(nums:number[]):number|null{
  if(!nums.length)return null
  const a=[...nums].sort((x,y)=>x-y)
  const m=Math.floor(a.length/2)
  return a.length%2===0?(a[m-1]+a[m])/2:a[m]
}
export function describeArm(results:TrialResult[], arm:TrialArm,
  criticalIds:ReadonlySet<string>=new Set()):TrialSummary{
  const rows=results.filter(r=>r.arm===arm)
  if(rows.some(r=>!Number.isFinite(r.timeActiveMs)||r.timeActiveMs<0||
    !Number.isInteger(r.sourceJumpCount)||r.sourceJumpCount<0))
    throw Error('Invalid duration or source-jump count')
  const correct=rows.filter(r=>r.matchesFixtureLabel)
  const critical=rows.filter(r=>criticalIds.has(r.caseId))
  return {
    n:rows.length,correct:correct.length,
    correctness:rows.length?correct.length/rows.length:null,
    medianActiveMs:median(rows.map(r=>r.timeActiveMs)),
    medianCorrectMs:median(correct.map(r=>r.timeActiveMs)),
    sourceJumps:rows.reduce((s,r)=>s+r.sourceJumpCount,0),
    sourceSupported:rows.filter(r=>r.evidenceJudgement==='supported').length,
    errors:rows.length-correct.length,
    criticalErrors:critical.length?critical.filter(r=>!r.matchesFixtureLabel).length:null
  }
}
export function compareTrial(results:TrialResult[],criticalIds:ReadonlySet<string>=new Set()){
  const ids=results.map(r=>r.caseId)
  if(new Set(ids).size!==ids.length)throw Error('Same session cannot evaluate one case twice')
  const reference=describeArm(results,'reference',criticalIds)
  const assisted=describeArm(results,'evidence_assist',criticalIds)
  const deltaMedianCorrectMs=reference.medianCorrectMs!==null&&assisted.medianCorrectMs!==null?
    assisted.medianCorrectMs-reference.medianCorrectMs:null
  return {reference,assisted,deltaMedianCorrectMs,
    n:results.length,
    actionable_real_world_workload_claim:false,
    note:'Descriptive within-session synthetic results. Different cases are assigned to each arm; case-mix and reviewer learning may bias time comparisons. Replicate with counterbalancing across independent reviewers and independently labelled real dossiers.'
  }
}
export function countedActiveTime(startedAt:number,now:number,accumulatedMs:number,visible:boolean){
  if(!Number.isFinite(now)||!Number.isFinite(startedAt)||!Number.isFinite(accumulatedMs)||
    accumulatedMs<0||now<startedAt)throw Error('Invalid monotonic timestamps')
  return Math.round(accumulatedMs+(visible?now-startedAt:0))
}
