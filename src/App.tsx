import ClaimsApp from './ClaimsApp'
import ResearchStudy from './research/ResearchStudy'
import OpsCockpit from './ops/OpsCockpit'

export default function App() {
  const query=new URLSearchParams(window.location.search)
  if(query.get('ops')==='1')return <OpsCockpit/>
  if(query.get('study')==='1')return <ResearchStudy/>
  return <ClaimsApp/>
}
