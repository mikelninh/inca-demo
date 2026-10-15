import { describe, expect, it } from 'vitest'
import loop from './data/loop.json'
import { applyScopeGuardrail } from './escalationRule'
import type { LoopCase } from './types'

const cases = loop.cases as LoopCase[]
const fixture = cases.find((c) => c.claim_id === 'KFZ-2026-003')!

describe('scope conflict guardrail (synthetic)', () => {
  it('escalates a low-impact bumper incident with contradictory invoice evidence', () => {
    expect(applyScopeGuardrail(fixture)).toMatchObject({
      decision: 'refer_to_human',
      escalated: true,
    })
  })

  it('works on a previously unseen ID without looking at expected decision', () => {
    const newCase: LoopCase = {
      ...fixture,
      claim_id: 'NEW-TEST-ID-999',
      expected_decision: 'pay',
      is_fraudulent: false,
      ground_truth_note: 'deliberately contradictory test label',
    }
    expect(applyScopeGuardrail(newCase).escalated).toBe(true)
  })

  it('does not escalate a normal synthetic covered water claim', () => {
    expect(applyScopeGuardrail(cases[0]).escalated).toBe(false)
  })

  it('does not escalate without mismatch evidence in the invoice trace', () => {
    const changed: LoopCase = {
      ...fixture,
      receipt: {
        ...fixture.receipt,
        traces: fixture.receipt.traces.filter((t) => !/rechnungspr.fung/i.test(t.agent)),
      },
    }
    expect(applyScopeGuardrail(changed).escalated).toBe(false)
  })

  it('does not alter a case already referred to a human', () => {
    const changed: LoopCase = { ...fixture, decision: 'refer_to_human' }
    const outcome = applyScopeGuardrail(changed)
    expect(outcome.escalated).toBe(false)
    expect(outcome.decision).toBe('refer_to_human')
  })

  it('applies to all fixtures without accessing a target claim ID', () => {
    const after = cases.map((c) => applyScopeGuardrail(c).decision)
    expect(after.filter((d, i) => d === cases[i].expected_decision)).toHaveLength(8)
    expect(after.filter((d) => d === 'refer_to_human')).toHaveLength(3)
  })
})
