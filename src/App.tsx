import {lazy,Suspense} from 'react'
import ClaimsApp from './ClaimsApp'
import ResearchStudy from './research/ResearchStudy'
import OpsCockpit from './ops/OpsCockpit'

const DocumentLab=lazy(()=>import('./doclab/DocumentLab'))
const V4Workspace=lazy(()=>import('./v4/V4Workspace'))

function Loading(){return <p style={{padding:24}}>CLAIM / OS lädt …</p>}

export default function App() {
  const query=new URLSearchParams(window.location.search)
  if(query.get('evaluation')==='1')return <Suspense fallback={<Loading/>}><V4Workspace/></Suspense>
  if(query.get('ops')==='1')return <OpsCockpit/>
  if(query.get('study')==='1')return <ResearchStudy/>
  if(query.get('legacy')==='1')return <ClaimsApp/>
  return <Suspense fallback={<Loading/>}><DocumentLab/></Suspense>
}
