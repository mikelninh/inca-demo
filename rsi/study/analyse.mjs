/**
 * Aggregate only explicitly shared local trial exports.
 * Does not upload, fetch, edit or identify users.
 * Usage: node --experimental-strip-types rsi/study/analyse.mjs export1.json ...
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {allocateCases,describeArm} from '../../src/research/study.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const cases=JSON.parse(fs.readFileSync(path.join(root,'src','data','loop.json'),'utf8')).cases;
const known=new Map(cases.map(c=>[c.claim_id,c]));
const ids=cases.map(c=>c.claim_id);
const critical=new Set(cases.filter(c=>c.expected_decision==='refer_to_human').map(c=>c.claim_id));
function round4(n){return n===null?null:Math.round(n*10000)/10000}
function median(nums){
 if(!nums.length)return null
 const a=[...nums].sort((x,y)=>x-y),m=Math.floor(a.length/2)
 return a.length%2?a[m]:(a[m-1]+a[m])/2
}
function validateSessions(files){
 const seen=new Set(),sessions=[];
 for(const filename of files){
  const data=JSON.parse(fs.readFileSync(filename,'utf8'));
  if(data.schema!=='inca-review-trial-0.1'||data.consented_local_export!==true)
   throw Error('Unsupported or unconsented export')
  if(!Number.isInteger(data.session_seed)||data.session_seed<0||data.session_seed>4294967295)
   throw Error('Invalid session seed')
  if(seen.has(data.session_seed))throw Error('Duplicate session seed: possible duplicate export')
  seen.add(data.session_seed)
  if(!Array.isArray(data.results)||data.results.length!==ids.length)
   throw Error('Expected exactly eight results')
  const assigned=allocateCases(ids,data.session_seed);
  const expectedById=new Map(assigned.map(x=>[x.caseId,x]));
  const used=new Set();
  const rows=data.results.map(r=>{
   if(!known.has(r.caseId)||used.has(r.caseId))throw Error('Unknown or duplicate case ID')
   used.add(r.caseId)
   const expected=expectedById.get(r.caseId);
   if(r.arm!==expected.arm||r.sequence!==expected.sequence)throw Error('Invalid A/B assignment')
   if(!['pay','pay_reduced','decline','refer_to_human'].includes(r.reviewerDecision)||
    !['supported','unsupported','uncertain'].includes(r.evidenceJudgement)||
    !Number.isFinite(r.timeActiveMs)||r.timeActiveMs<0||r.timeActiveMs>3600000||
    !Number.isInteger(r.sourceJumpCount)||r.sourceJumpCount<0)
      throw Error('Invalid decision, evidence rating, duration or link count')
   return {caseId:r.caseId,arm:r.arm,sequence:r.sequence,
     reviewerDecision:r.reviewerDecision,evidenceJudgement:r.evidenceJudgement,
     timeActiveMs:r.timeActiveMs,sourceJumpCount:r.sourceJumpCount,
     completed:true,matchesFixtureLabel:r.reviewerDecision===known.get(r.caseId).expected_decision}
  })
  sessions.push({seed:data.session_seed,rows})
 }
 return sessions
}
function summarise(files){
 const sessions=validateSessions(files),all=sessions.flatMap(x=>x.rows)
 const reference=describeArm(all,'reference',critical)
 const assisted=describeArm(all,'evidence_assist',critical)
 const caseAdjusted=ids.map(id=>{
   const values=all.filter(x=>x.caseId===id)
   const refs=values.filter(x=>x.arm==='reference'&&x.matchesFixtureLabel).map(x=>x.timeActiveMs)
   const helps=values.filter(x=>x.arm==='evidence_assist'&&x.matchesFixtureLabel).map(x=>x.timeActiveMs)
   const a=median(refs),b=median(helps)
   return {case_id:id,reference_correct_n:refs.length,assisted_correct_n:helps.length,
      ref_median_ms:a,assisted_median_ms:b,
      difference_ms:a===null||b===null?null:b-a}
 })
 const validPairs=caseAdjusted.filter(x=>x.reference_correct_n>=3&&x.assisted_correct_n>=3)
 const throughput=summary=>{
   if(!summary.n||!summary.correct)return null
   const ms=all.filter(x=>x.arm===(summary===reference?'reference':'evidence_assist'))
     .reduce((sum,x)=>sum+x.timeActiveMs,0)
   return ms>0?round4(summary.correct/(ms/3600000)):null
 }
 const readyForInterpretation=sessions.length>=12 && validPairs.length===8
 const gain=readyForInterpretation && throughput(reference)!==null&&throughput(assisted)!==null?
   round4(throughput(assisted)/throughput(reference)-1):null
 return {
   schema:'inca-taste-aggregate-v0.1',
   sessions:sessions.length,total_reviews:all.length,
   reference:{...reference,correct_per_active_hour:throughput(reference)},
   assisted:{...assisted,correct_per_active_hour:throughput(assisted)},
   case_adjusted:caseAdjusted,
   coverage:{paired_cases_with_3_correct_reviews_per_arm:validPairs.length,required:8,
     reviewer_sessions_requirement:12,minimum_cohort_ready:readyForInterpretation},
   descriptive_throughput_gain:gain,
   unmeasured:{
     full_investigation_time_after_handoff:null,
     real_customer_case_outcomes:null,
     primary_pdf_citation_support_accuracy:null,
     trusted_independent_quality_review:null,
     actual_operational_costs:null
   },
   recommendation:'RESEARCH_ONLY_NOT_FOR_RELEASE',
   warning:'Synthetic cases; small/selective participation and recruitment/learning/case-mix effects limit generalisation. A real claims operations comparison requires time to complete escalated investigations and independent expert review.'
 }
}
const report=summarise(process.argv.slice(2));
console.log(JSON.stringify(report,null,2));
export {summarise,validateSessions};
