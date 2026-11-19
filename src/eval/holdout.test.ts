import {describe,it,expect} from 'vitest'
import {buildHoldout,scoreHoldout,summariseHoldout} from './holdout'
describe('36-case non-LLM source stress study',()=>{
 it('generates deterministic diversified, disjoint IDs and explicit design labels',()=>{
  const rows=buildHoldout()
  expect(rows).toHaveLength(36)
  expect(new Set(rows.map(r=>r.id)).size).toBe(36)
  expect(new Set(rows.map(r=>r.family)).size).toBe(6)
  expect(rows.every(r=>r.docs.every(d=>d.origin==='generated_sample'))).toBe(true)
 })
 it('fails closed for every missing source, unreadable page and forged quote',()=>{
  const results=scoreHoldout()
  expect(results.filter(r=>r.family==='Missing source').every(r=>r.actual==='STOP_MISSING_SOURCE')).toBe(true)
  expect(results.filter(r=>r.family==='Untextable PDF').every(r=>r.actual==='STOP_UNREADABLE')).toBe(true)
  expect(results.filter(r=>r.family==='Forged quotation').every(r=>r.actual==='STOP_CITATION_INVALID')).toBe(true)
  expect(results.every(r=>r.needsHumanReview&&!r.autonomousSettlementAllowed)).toBe(true)
 })
 it('exposes rather than hides limits in report and measures reproducibly',()=>{
  const results=scoreHoldout(),report=summariseHoldout(results)
  expect(report.n).toBe(36)
  expect(report.criticalTotal).toBe(24)
  expect(report.expertGroundTruth).toBe(false)
  expect(report.liveModelRuns).toBe(0)
  expect(report.estimatedTimeSaved).toBe(null)
  expect(report.labelsMatched).toBe(results.filter(r=>r.match).length)
  expect(report.criticalScenarioMismatches).toBe(results.filter(r=>r.severity==='critical'&&!r.match).length)
 })
 it('is sensitive to real paraphrases and flags false-negatives without relabeling them',()=>{
  const results=scoreHoldout()
  const rephrased=results.filter(r=>r.family==='Repair discrepancy')
  expect(rephrased).toHaveLength(6)
  expect(rephrased.some(r=>!r.match)).toBe(true)
  expect(rephrased.some(r=>r.match)).toBe(true)
 })
})
