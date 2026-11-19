import {useEffect,useMemo,useRef,useState} from 'react'
import {checkCitation} from '../doclab/pdfEvidence'
import {drawPdfPage} from '../doclab/pdfReader'
import type {PageCitation,ParsedDocument} from '../doclab/pdfEvidence'
type Props={document:ParsedDocument|null;page:number;citation:PageCitation|null;zoom:number;caseId:string;large?:boolean}
export default function QuietPdf({document,page,citation,zoom,caseId,large=false}:Props){
 const canvas=useRef<HTMLCanvasElement>(null)
 const viewport=useRef<HTMLDivElement>(null)
 const [ready,setReady]=useState(false)
 const [error,setError]=useState('')
 const pageInfo=document?.pages.find(p=>p.page===page)
 const rects=useMemo(()=>{
  if(!document||!pageInfo||!citation||citation.documentId!==document.id||citation.page!==page||!checkCitation([document],citation))return []
  const start=citation.focusOffset??citation.offset
  const finish=start+(citation.focusText?.length??citation.quote.length)
  return (pageInfo.rects??[]).filter(r=>r.start<finish&&r.end>start).slice(0,8)
 },[document,pageInfo,citation,page])
 useEffect(()=>{
  let disposed=false
  setReady(false);setError('')
  if(!document||!canvas.current)return
  const element=canvas.current
  void drawPdfPage(document.bytes,page,element).then(()=>{if(!disposed)setReady(true)}).catch(e=>{
   if(!disposed)setError(e instanceof Error?e.message:'PDF-Vorschau konnte nicht gerendert werden.')
  })
  return()=>{disposed=true}
 },[document,page])
 useEffect(()=>{
  if(!ready||!rects.length||!viewport.current)return
  const outer=viewport.current,stage=outer.querySelector<HTMLElement>('.quiet-paper')
  if(!stage)return
  const first=rects[0]
  const frame=requestAnimationFrame(()=>outer.scrollTo({
   top:Math.max(0,stage.offsetTop+stage.clientHeight*first.top-outer.clientHeight*.34),
   left:Math.max(0,stage.clientWidth*first.left-outer.clientWidth*.32),
   behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'
  }))
  return()=>cancelAnimationFrame(frame)
 },[ready,rects,zoom])
 return <div ref={viewport} className={'quiet-pdf-viewport'+(large?' is-large':'')} aria-label="Original-PDF" data-testid="quiet-pdf">
  {document?<div className="quiet-paper" style={{width:(zoom*100)+'%'}}>
   <canvas ref={canvas} aria-label={'Original-PDF Seite '+page+' Fall '+caseId}/>
   {ready&&rects.map((r,i)=><span key={i} className="quiet-highlight"
     aria-label="Wortgleiche Originalfundstelle" role="img" style={{
      left:(r.left*100)+'%',top:(r.top*100)+'%',width:(r.width*100)+'%',height:(r.height*100)+'%'
     }}/>)}
   {!ready&&!error&&<span className="quiet-pdf-loading">Originaldokument wird gerendert …</span>}
   {!!error&&<span className="quiet-pdf-loading" role="alert">{error}</span>}
  </div>:<p className="quiet-pdf-no-source">Kein Dokument vorhanden.</p>}
 </div>
}
