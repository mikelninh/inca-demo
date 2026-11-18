import type {Decision,LoopCase} from '../types'
import {applyScopeGuardrail} from '../escalationRule'
import {evidenceLedger,auditEvidenceLedger} from '../research/evidence'
import type {EvidenceEntry} from '../research/evidence'

export type FaultMode='none'|'missing_invoice'|'tampered_citation'
export type Gate='PASS_PROVENANCE'|'STOP_MISSING_EVIDENCE'|'STOP_TAMPERED_CITATION'
export type OperatorRun={
  caseId:string
  sourceType:'fictional_fixture'
  proposal:Decision
  safeProposal:Decision
  gate:Gate
  sourceCount:number
  exactSourceCount:number
  supportedByIndependentExpert:false
  eligibleForAutonomousPayment:false
  needsHumanReview:boolean
  requiredNextAction:'VERIFY_SOURCES'|'REVIEW_DISCREPANCY'|'MANUAL_APPROVAL'|'INVESTIGATE_MISSING_DETAILS'|'REVIEW_CANDIDATE'
  evidence:EvidenceEntry[]
  checks:{id:string;label:string;status:'ok'|'review'|'blocked';note:string}[]
  explanation:string
  actionDraft:string
}
const clean=(s:string)=>s.replace(/\s+/g,' ').trim()
export function simulateRun(claim:LoopCase, fault:FaultMode='none'):OperatorRun{
  // Truth labels are never used for a live operator recommendation.
  const proposed=applyScopeGuardrail(claim)
  const intact=evidenceLedger(claim)
  let cited=intact
  if(fault==='missing_invoice')cited=intact.filter(x=>x.kind!=='invoice')
  if(fault==='tampered_citation'){
    const first=intact.findIndex(x=>x.kind==='policy')
    cited=intact.map((x,i)=>i===first?{...x,quote:x.quote+' [FABRICATED]'}:x)
  }
  const audit=auditEvidenceLedger(claim,cited)
  const failed=audit.checks.some(x=>!x.valid)
  const gate:Gate=!audit.valid?
    (failed?'STOP_TAMPERED_CITATION':'STOP_MISSING_EVIDENCE'):'PASS_PROVENANCE'
  const humanPending=claim.receipt.human_verification_required.length>0 ||
    claim.receipt.blocked_actions.length>0
  const needsHumanReview=humanPending||proposed.decision==='refer_to_human'||gate!=='PASS_PROVENANCE'
  const next=gate!=='PASS_PROVENANCE'?'VERIFY_SOURCES':
    proposed.escalated?'REVIEW_DISCREPANCY':
    proposed.decision==='refer_to_human'?'INVESTIGATE_MISSING_DETAILS':
    humanPending?'MANUAL_APPROVAL':'REVIEW_CANDIDATE'
  const explanation=gate!=='PASS_PROVENANCE'
    ? 'Quellenkontrolle fehlgeschlagen. Entscheidungsvorschlag ausgesetzt: Angaben fehlen oder sind verändert.'
    : proposed.escalated
      ? 'Enger Widerspruchs-Check: kleiner Stoßstangenschaden, breiter Reparaturumfang und dokumentierter Prüfhinweis. Kein Betrugsnachweis, sondern Anlass zur menschlichen Prüfung.'
      : 'Die gespeicherte synthetische Einschätzung bleibt unverändert. Die Quelle wurde nur auf wortgleiche Herkunft geprüft; fachliche Richtigkeit ist nicht nachgewiesen.'
  const actionDraft=next==='VERIFY_SOURCES'
    ? 'Interner Prüfauftrag: Bitte fehlende oder veränderte Belege im Fall verifizieren. Vorher keine Auszahlung, Ablehnung oder externe Kommunikation auslösen.'
    : next==='REVIEW_DISCREPANCY'
      ? 'Interner Prüfauftrag: Schadenhergang mit den berechneten Reparaturpositionen abgleichen; Werkstattunterlagen anfordern und mögliche Vorschäden sachlich klären. Kein Betrugsvorwurf.'
      : next==='INVESTIGATE_MISSING_DETAILS'
        ? 'Interner Prüfauftrag: Fehlende Angaben und Nachweise klären, bevor eine verbindliche Deckungsentscheidung getroffen wird.'
        : next==='MANUAL_APPROVAL'
          ? 'Interner Prüfauftrag: Die im synthetischen Vorgang dokumentierten Freigabe- oder Nachweispflichten prüfen und abzeichnen.'
          : 'Interner Prüfauftrag: Die vorgeschlagene Entscheidung anhand der Vertrags- und Schadendokumente fachlich prüfen. Keine automatische Regulierung.'
  const checks:OperatorRun['checks']=[
    {id:'intake',label:'Schadenmeldung erkannt',status:claim.fnol_text.trim()?'ok':'blocked',
      note:'Fiktiver FNOL-Text aus lokalem Datensatz'},
    {id:'coverage',label:'Vertragsgrundlage verknüpft',status:claim.policy_excerpt.trim()?'ok':'blocked',
      note:'Beispielklausel, keine reale Vertragsprüfung'},
    {id:'source',label:'Fundstellen exakt auffindbar',status:gate==='PASS_PROVENANCE'?'ok':'blocked',
      note:audit.exact+' von '+audit.total+' zitierten Stellen; '+audit.missing.length+' erforderliche Belege fehlen'},
    {id:'policy',label:'Fachliche Entscheidung',status:'review',
      note:'Synthetischer Vorschlag, nicht unabhängig bestätigt'},
    {id:'approval',label:'Regulierungsfreigabe',status:'blocked',
      note:'Autonome Auszahlung und Ablehnung in dieser Demo ausdrücklich deaktiviert'}
  ]
  return {caseId:claim.claim_id,sourceType:'fictional_fixture',proposal:claim.decision,
    safeProposal:gate==='PASS_PROVENANCE'?proposed.decision:'refer_to_human',
    gate,sourceCount:audit.total,exactSourceCount:audit.exact,
    supportedByIndependentExpert:false,eligibleForAutonomousPayment:false,
    needsHumanReview,requiredNextAction:next,evidence:cited,checks,
    explanation,actionDraft:clean(actionDraft)}
}
export function portfolioScore(cases:LoopCase[]){
  if(!cases.length)return {n:0,baselineCorrect:null,guardedCorrect:null,
    baselineHandoffs:0,guardedHandoffs:0,sourceExact:0,sourceCount:0,realTimeSaved:null}
  const runs=cases.map(x=>simulateRun(x))
  return {
    n:cases.length,
    baselineCorrect:cases.filter(x=>x.decision===x.expected_decision).length,
    guardedCorrect:cases.filter((x,i)=>runs[i].safeProposal===x.expected_decision).length,
    baselineHandoffs:cases.filter(x=>x.decision==='refer_to_human').length,
    guardedHandoffs:runs.filter(x=>x.safeProposal==='refer_to_human').length,
    sourceExact:runs.reduce((s,r)=>s+r.exactSourceCount,0),
    sourceCount:runs.reduce((s,r)=>s+r.sourceCount,0),
    realTimeSaved:null
  }
}
export function safeReceipt(run:OperatorRun, event:'INSPECTED'|'DRAFT_EXPORTED'){
  return {
    schema:'inca-control-tower-receipt-v0.1',
    case_id:run.caseId,source_type:run.sourceType,
    audited_at:new Date().toISOString(),
    event, gate:run.gate, proposed_decision:run.safeProposal,
    source_refs:run.evidence.map(x=>({id:x.id,field:x.field,kind:x.kind,
      source_status:x.source_status,verified_by_expert:x.human_verified})),
    human_review_required:run.needsHumanReview,
    autonomous_payment_possible:false,
    measured_workload_savings:null,
    risk:'Synthetic example only; no original documents, AI model inference or real insurance actions.'
  }
}
