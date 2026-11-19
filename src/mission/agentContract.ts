/**
 * Safe AI-agent response contract, shared by browser and optional server.
 * Model outputs are not authorities: every cited passage must match an
 * approved sample document page. No autonomous insurance action is possible.
 */
export type SourcePacket={
  documentId:string;
  role:'claim'|'policy'|'invoice'|'unknown';
  page:number;
  lines:string[];
};
export type AgentCitation={documentId:string;page:number;quote:string};
export type AgentFinding={
  category:'incident'|'coverage'|'invoice'|'discrepancy'|'missing';
  label:string;
  interpretation:string;
  citation:AgentCitation;
};
export type AgentDraft={
  summary:string;
  disposition:'human_review'|'request_documents';
  findings:AgentFinding[];
};
export type AgentCheck={
  valid:boolean;
  reason:'VALID_CITATIONS'|'INVALID_CITATION'|'INVALID_SCHEMA'|'MISSING_REQUIRED_DOCUMENTS';
  accepted:AgentDraft|null;
  citationCount:number;
  details:string[];
  humanApprovalRequired:true;
  autonomousPaymentAllowed:false;
};
type SourceInput={files:Array<{role:string;pages:Array<{lines:string[]}>}>}
export function sourcePackets(sample:SourceInput):SourcePacket[]{
  return sample.files.flatMap((file,index)=>
    file.pages.map((page,i)=>({
      documentId:'DOC-'+(index+1),
      role:file.role as SourcePacket['role'],
      page:i+1,
      lines:[...page.lines]
    })))
}
function isPlainObject(v:unknown):v is Record<string,unknown>{
  return v!==null&&typeof v==='object'&&!Array.isArray(v)
}
const MAX_FINDINGS=5
export function checkAgentDraft(data:unknown,packets:SourcePacket[]):AgentCheck{
  const denied=(reason:AgentCheck['reason'],details:string[],citationCount=0):AgentCheck=>({
    valid:false,reason,accepted:null,citationCount,details,
    humanApprovalRequired:true,autonomousPaymentAllowed:false
  })
  if(!isPlainObject(data)||typeof data.summary!=='string'||
     data.summary.length<12||data.summary.length>380||
     !['human_review','request_documents'].includes(String(data.disposition))||
     !Array.isArray(data.findings)||data.findings.length<1||
     data.findings.length>MAX_FINDINGS){
     return denied('INVALID_SCHEMA',['Summary, disposition or findings violate the public response contract.'])
  }
  const needed=['claim','policy','invoice']
  const missing=needed.filter(x=>!packets.some(p=>p.role===x))
  const findings:AgentFinding[]=[]
  const errors:string[]=[]
  for(const [i,raw] of data.findings.entries()){
    if(!isPlainObject(raw)||!['incident','coverage','invoice','discrepancy','missing'].includes(String(raw.category))||
      typeof raw.label!=='string'||raw.label.length<3||raw.label.length>65||
      typeof raw.interpretation!=='string'||raw.interpretation.length<8||raw.interpretation.length>280||
      !isPlainObject(raw.citation)){
      errors.push('Finding '+(i+1)+' schema invalid.');continue
    }
    const c=raw.citation
    if(typeof c.documentId!=='string'||typeof c.page!=='number'||!Number.isInteger(c.page)||
      typeof c.quote!=='string'||c.quote.length<12||c.quote.length>260){
      errors.push('Finding '+(i+1)+' reference invalid.');continue
    }
    const packet=packets.find(p=>p.documentId===c.documentId&&p.page===c.page)
    // Require an exact span within a single originally-authored line. This
    // prevents a model from stitching together unrelated passages.
    const supported=packet?.lines.some(line=>line.includes(c.quote))
    if(!supported){
      errors.push('Finding '+(i+1)+' cites text that does not occur on the referenced page.')
      continue
    }
    findings.push({
      category:raw.category as AgentFinding['category'],
      label:raw.label,
      interpretation:raw.interpretation,
      citation:{documentId:c.documentId,page:c.page,quote:c.quote}
    })
  }
  if(errors.length)return denied('INVALID_CITATION',errors,findings.length)
  if(missing.length)return denied('MISSING_REQUIRED_DOCUMENTS',
    ['Required document roles missing: '+missing.join(', ')],findings.length)
  return {
    valid:true,reason:'VALID_CITATIONS',
    accepted:{summary:data.summary as string,
      disposition:data.disposition as AgentDraft['disposition'],findings},
    citationCount:findings.length,details:[],
    humanApprovalRequired:true,autonomousPaymentAllowed:false
  }
}
export function resolveExtractedCitation(
  documents:Array<{id:string;pages:Array<{page:number;text:string}>}>,
  ref:AgentCitation,
):({documentId:string;page:number;offset:number;quote:string}|null){
  const page=documents.find(x=>x.id===ref.documentId)?.pages.find(p=>p.page===ref.page)
  if(!page)return null
  const offset=page.text.indexOf(ref.quote)
  return offset<0?null:{...ref,offset}
}
export const missionReleaseCriteria={
  independentExpertReviewedCases:0,
  realHumanReviewers:0,
  measuredMinutesSaved:null,
  allowedToAutoSettle:false
} as const
