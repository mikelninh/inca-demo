import {lazy,Suspense} from 'react'
import ClaimsApp from './ClaimsApp'
import ResearchStudy from './research/ResearchStudy'
import OpsCockpit from './ops/OpsCockpit'

const DocumentLab=lazy(()=>import('./doclab/DocumentLab'))
const Mission=lazy(()=>import('./mission/Mission'))

export default function App() {
  const query=new URLSearchParams(window.location.search)
  if(query.get('lab')==='1')return <Suspense fallback={<p style={{padding:24}}>PDF Evidence Lab lädt …</p>}><DocumentLab/></Suspense>
  if(query.get('ops')==='1')return <OpsCockpit/>
  if(query.get('study')==='1')return <ResearchStudy/>
  if(query.get('legacy')==='1')return <ClaimsApp/>
  return <Suspense fallback={<p style={{padding:24}}>INCA Claims Lab lädt …</p>}><Mission/></Suspense>
}
