import type { Decision, LoopCase } from './types'

/**
 * Illustrative, deliberately narrow operations policy on SYNTHETIC data.
 * This is not a fraud model, coverage decision, or insurer-approved rule.
 * It never reads claim_id, expected_decision, is_fraudulent or ground truth.
 */
export function applyScopeGuardrail(
  claim: LoopCase,
): { decision: Decision; escalated: boolean; reason: string } {
  const narrative = claim.fnol_text.toLowerCase()
  const kind = claim.line_of_business.toLowerCase()
  const repairText = claim.invoice_items.map((item) => item.description).join(' ').toLowerCase()
  const invoiceTrace = claim.receipt.traces.find((t) =>
    /rechnungspr.fung|invoice review/i.test(t.agent),
  )
  const invoiceAssessment = [
    invoiceTrace?.summary ?? '',
    ...(invoiceTrace?.sources ?? []),
  ].join(' ').toLowerCase()

  const motorClaim = /kfz|motor|vehicle/.test(kind)
  const lowImpact = /leicht|geringf.gig|langsam|minor|low.speed/.test(narrative)
  const bumperIncident = /sto.stange|bumper/.test(narrative)
  const outsideScopeRepair = /heckklappe|auspuff|abgasanlage|motorblock|gearbox|exhaust|trunk lid/.test(repairText)
  const evidenceOfMismatch = /nicht plausibel|unplausibel|nicht unfallbedingt|vorsch.d|kein nachvollziehbar|passt nicht|deut.*auf/.test(invoiceAssessment)

  const escalated = motorClaim && lowImpact && bumperIncident &&
    outsideScopeRepair && evidenceOfMismatch && claim.decision !== 'refer_to_human'

  return {
    decision: escalated ? 'refer_to_human' : claim.decision,
    escalated,
    reason: escalated
      ? 'Narrow scope-conflict check: low-impact bumper incident + wider repair invoice + documented invoice-review mismatch → human review.'
      : 'No additional escalation by this narrow illustrative rule.',
  }
}
