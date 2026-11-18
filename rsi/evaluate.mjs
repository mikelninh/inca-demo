/* INCA synthetic claim-loop adapter for the shared RSI engine.
 * No insurer calls or real claims are sent.
 */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {evaluateSuite} from '../rsi-core/rsi/core.mjs';
import {applyScopeGuardrail} from '../src/escalationRule.ts';

const root=path.dirname(fileURLToPath(import.meta.url));
const data=JSON.parse(fs.readFileSync(path.join(root,'..','src','data','loop.json'),'utf8'));
const cases=data.cases.map(c=>({
  id:c.claim_id,group:c.line_of_business,
  critical:c.expected_decision==='refer_to_human',
  input:c,expected:{decision:c.expected_decision}
}));
const report=evaluateSuite({
  product:'inca-claims-demo',dataset:'synthetic-loop-8-v1',split:'frozen-synthetic',
  cases,
  baseline:claim=>({decision:claim.decision}),
  candidate:claim=>({decision:applyScopeGuardrail(claim).decision}),
  baselineVersion:'fixture-decision',candidateVersion:'narrow-scope-escalation-rule'
});
const dest=path.join(root,'out','latest.json');
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.writeFileSync(dest,JSON.stringify({...report,run_at:new Date().toISOString(),
 git_sha:process.env.GITHUB_SHA||null},null,2)+'\n');
const summary=[
  '## RSI 2.0 — INCA (synthetic claim loop)',
  '| Metric | Baseline | With scope rule |',
  '|---|---:|---:|',
  '| Correct decisions | '+report.baseline.correct+'/'+report.sample_size+' | '+report.candidate.correct+'/'+report.sample_size+' |',
  '| Critical handoff errors | '+report.baseline.critical_errors+'/'+report.baseline.critical_n+' | '+report.candidate.critical_errors+'/'+report.candidate.critical_n+' |',
  '| New regressions | — | '+report.regressions.length+' |',
  '| Net improved | — | '+report.delta_correct+' |',
  '',
  '**Gate:** '+report.automated_gate+'; promotion: '+report.promotion,
  '',
  'Not observed: real insurer outcomes, source citation accuracy, staff time, cost, latency, fraud detection or user preference. These 8 cases are synthetic fixtures.',
  ''
].join('\n');
console.log(summary);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
if(report.baseline.correct!==7||report.candidate.correct!==8||
   report.automated_gate!=='PASS_PRECHECK'||report.regressions.length||
   report.candidate.critical_errors)
  process.exitCode=1;
