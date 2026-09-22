import { describe, expect, it } from 'vitest'
import fleet from '../src/data/fleet.json'
import loop from '../src/data/loop.json'
import { DECISION_META, type FleetData, type LoopData } from '../src/types'

const data = loop as unknown as LoopData

describe('synced data', () => {
  it('hat Fälle und jede decision ist gemappt', () => {
    expect(data.cases.length).toBeGreaterThan(0)
    for (const c of data.cases) {
      expect(DECISION_META[c.decision]).toBeDefined()
      expect(c.receipt.traces.length).toBeGreaterThan(0)
    }
  })
  it('enthält mindestens einen Bruchfall (correct=false)', () => {
    expect(data.cases.some((c) => !c.correct)).toBe(true)
  })
  it('fleet hat Gruppen mit Tools', () => {
    expect((fleet as unknown as FleetData).groups.length).toBeGreaterThan(0)
  })
})
