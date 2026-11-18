/* Structural preflight on authored synthetic fixtures — NOT real human research. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evidenceLedger,auditEvidenceLedger} from '../../src/research/evidence.ts';
import {applyScopeGuardrail} from '../../src/escalationRule.ts';
import {allocateCases,compareTrial} from '../../src/research/study.ts';
const dir=path.dirname(fileURLToPath(import.meta.url));
const cases=JSON.parse(fs.readFileSync(path.join(dir,'..','..','src','data','loop.json'),'utf8')).cases;
const result=cases.map(c=>{
 const before=c.decision,after=applyScopeGuardrail(c).decision;
 const ledger=evidenceLedger(c),audit=auditEvidenceLedger(c,ledger);
 return {case_id:c.claim_id,group:c.line_of_business,
  before_matches_label:before===c.expected_decision,
  after_matches_label:after===c.expected_decision,
  baseline_handoff:before==='refer_to_human',
  assisted_handoff:after==='refer_to_human',
  required_handoff:c.expected_decision==='refer_to_human',
  evidence_total:audit.total,evidence_exact:audit.exact,
  source_integrity:audit.valid,
  page_citations_available:false,
  scientific_or_legal_verification:false
 };
});
const count=filter=>result.filter(filter).length;
const report={
 schema:'inca-taste-study-preflight-v0.1',
 recorded_at:new Date().toISOString(),
 source_sha:process.env.GITHUB_SHA||null,
 data:'hand-authored synthetic fixtures',
 sample_size:result.length,
 baseline:{correct:count(r=>r.before_matches_label),
  human_referrals:count(r=>r.baseline_handoff),
  critical_missed_referrals:count(r=>r.required_handoff&&!r.baseline_handoff)},
 assisted:{correct:count(r=>r.after_matches_label),
  human_referrals:count(r=>r.assisted_handoff),
  critical_missed_referrals:count(r=>r.required_handoff&&!r.assisted_handoff)},
 exact_provenance:{valid_quotes:result.reduce((s,r)=>s+r.evidence_exact,0),
  candidate_quotes:result.reduce((s,r)=>s+r.evidence_total,0),
  invalid_cases:count(r=>!r.source_integrity)},
 human_trial:compareTrial([]),
 live_reviewers:0,
 staff_minutes_saved:null,
 supported_citations_verified_by_expert:null,
 cost_per_correct_claim:null,
 fact:'A higher referral count means more cases sent for manual review; no time saved is established by fixture outcomes.',
 rows:result
};
const output=path.join(dir,'out','latest.json');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
const lines=[
 '## INCA — research taste structural preflight',
 '| Metric | Reference | Evidence-assisted |',
 '|---|---:|---:|',
 '| Correct on synthetic labels | '+report.baseline.correct+'/'+report.sample_size+' | '+report.assisted.correct+'/'+report.sample_size+' |',
 '| Manual review referrals | '+report.baseline.human_referrals+' | '+report.assisted.human_referrals+' |',
 '| Missed mandatory review referrals | '+report.baseline.critical_missed_referrals+' | '+report.assisted.critical_missed_referrals+' |',
 '| Exact synthetic-source quotes | — | '+report.exact_provenance.valid_quotes+'/'+report.exact_provenance.candidate_quotes+' |',
 '',
 '**Observed reviewer time savings:** unknown (0 participants).',
 '**Independent source correctness:** unknown (no real primary PDFs or independent review).',
 '**Real insurer impact:** unknown.',
 '',
 'Source exactness is not factual support. All figures above are checks of synthetic fixture fields.'
].join('\n');
console.log(lines);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines+'\n');
if(report.sample_size!==8||report.baseline.correct!==7||report.assisted.correct!==8||
 report.baseline.critical_missed_referrals!==1||report.assisted.critical_missed_referrals!==0||
 report.exact_provenance.invalid_cases!==0||
 !report.human_trial.actionable_real_world_workload_claim===false)
 process.exitCode=1;
