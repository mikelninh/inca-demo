export type Decision = 'pay' | 'pay_reduced' | 'decline' | 'refer_to_human'

export interface AgentTrace {
  agent: string
  model: string
  mode: string // 'live' | 'fixture'
  confidence: number
  summary: string
  sources: string[]
}

export interface BlockedAction {
  action: string
  reason: string
}

export interface LoopCase {
  claim_id: string
  line_of_business: string
  incident_date: string
  reported_date: string
  policy_excerpt: string
  fnol_text: string
  invoice_items: { description: string; amount_eur: number }[]
  attachments: string[]
  expected_decision: Decision
  ground_truth_note: string
  is_fraudulent: boolean
  decision: Decision
  payout_eur: number
  correct: boolean
  receipt: {
    rationale: string
    traces: AgentTrace[]
    blocked_actions: BlockedAction[]
    human_verification_required: string[]
    uncertainty_notes: string[]
  }
}

export interface BenchmarkVersion {
  label: string
  note: string
  metrics: { accuracy: number; fraud_recall: number; fraud_precision: number; fraud_fp: number }
  confusion: { labels: string[]; matrix: number[][] }
  calibration: unknown
}

export interface LoopData {
  generated_at: string
  model: string
  mode: string
  metrics: {
    total: number
    correct: number
    decision_accuracy: number
    fraud_recall: number
    fraud_precision: number
    fraud_false_positive_rate: number
    auto_resolved_share: number
    auto_resolved_accuracy: number
  }
  cases: LoopCase[]
  benchmark: {
    n: number
    kind: string
    disclaimer: string
    coverage_floor: number
    prompts: { v1: string; v2: string }
    versions: { v1: BenchmarkVersion; v2: BenchmarkVersion }
  }
}

export interface FleetTool {
  name: string
  oneliner: string
  tools_count?: number
  tests?: number
  deployed?: string
  sample?: string
}

export interface FleetData {
  note: string
  groups: { title: string; subtitle: string; tools: FleetTool[] }[]
}

export interface ToolLayerCase {
  tool: string
  label: string
  input: Record<string, unknown>
  result: Record<string, unknown>
}

export interface ToolLayerData {
  source: string
  cases: ToolLayerCase[]
}

export type AgentRun = { ran: false } | { ran?: true; [k: string]: unknown }

export const DECISION_META: Record<
  Decision,
  { de: string; en: string; tone: 'core' | 'signal' | 'maroon' }
> = {
  pay: { de: 'auszahlen', en: 'pay', tone: 'core' },
  pay_reduced: { de: 'gekürzt auszahlen', en: 'pay reduced', tone: 'core' },
  decline: { de: 'ablehnen', en: 'decline', tone: 'maroon' },
  refer_to_human: { de: 'an Mensch', en: 'human review', tone: 'signal' },
}
