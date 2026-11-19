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
      const viewport=page.getViewport({scale:1})
      let text=''
      const rects:NonNullable<PageText['rects']>=[]
      for(const item of content.items){
        if(!('str' in item)||!item.str)continue
        const value=item.str.replace(/\s+/g,' ').trim()
        if(!value)continue
        if(text)text+=' '
        const start=text.length
        text+=value
        const t=item.transform
        const height=Math.abs(t[3])||Math.abs(t[0])||12
        const matrix=viewport.transform
        const project=(x:number,y:number)=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]]
        const [x0,y0]=project(t[4],t[5])
        const [x1,y1]=project(t[4]+item.width,t[5]+height)
        const left=Math.min(x0,x1)/viewport.width,top=Math.min(y0,y1)/viewport.height
        const width=Math.abs(x1-x0)/viewport.width,boxHeight=Math.abs(y1-y0)/viewport.height
        if([left,top,width,boxHeight].every(Number.isFinite)&&width>0&&boxHeight>0&&
           left>=0&&top>=0&&left+width<=1.02&&top+boxHeight<=1.02){
          rects.push({start,end:start+value.length,left,top,width,height:boxHeight})
        }
      }
      pages.push({page:i,text,rects})
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
