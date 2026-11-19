import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type {ParsedDocument,DocumentOrigin,DocumentRole,PageText} from './pdfEvidence'

pdfjs.GlobalWorkerOptions.workerSrc=workerUrl

export const MAX_PDF_BYTES=8*1024*1024
export const MAX_PDF_PAGES=12

export async function parsePdfBytes(
  raw:Uint8Array,
  id:string,
  name:string,
  role:DocumentRole,
  origin:DocumentOrigin,
):Promise<ParsedDocument>{
  if(raw.byteLength<10||raw.byteLength>MAX_PDF_BYTES)
    throw Error('PDF muss zwischen 10 Byte und 8 MB gross sein.')
  const pdfBytes=raw.slice()
  const loading=pdfjs.getDocument({
    data:pdfBytes,
    useSystemFonts:true,stopAtErrors:true
  })
  try{
    const pdf=await loading.promise
    if(pdf.numPages<1||pdf.numPages>MAX_PDF_PAGES)
      throw Error('PDF hat zu viele Seiten (Maximum 12).')
    const pages:PageText[]=[]
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i)
      const content=await page.getTextContent()
      const text=content.items.map(item=>('str' in item?item.str:''))
        .filter(Boolean).join(' ').replace(/\s+/g,' ').trim()
      pages.push({page:i,text})
    }
    return {id,name,role,origin,pages,sizeBytes:raw.byteLength,bytes:raw.slice()}
  }finally{
    await loading.destroy()
  }
}
export async function drawPdfPage(
  raw:Uint8Array,
  pageNo:number,
  canvas:HTMLCanvasElement,
):Promise<void>{
  const loading=pdfjs.getDocument({
    data:raw.slice(),
    isEvalSupported:false,
    useSystemFonts:true,stopAtErrors:true
  })
  try{
    const pdf=await loading.promise
    if(!Number.isInteger(pageNo)||pageNo<1||pageNo>pdf.numPages)
      throw Error('PDF-Seitennummer ausserhalb des Dokuments.')
    const page=await pdf.getPage(pageNo)
    const viewport=page.getViewport({scale:1.25})
    const ctx=canvas.getContext('2d')
    if(!ctx)throw Error('Canvas Rendering nicht verfügbar.')
    canvas.width=Math.ceil(viewport.width)
    canvas.height=Math.ceil(viewport.height)
    const render=page.render({canvas,canvasContext:ctx,viewport})
    await render.promise
  }finally{
    await loading.destroy()
  }
}
