import ClaimsApp from './ClaimsApp'
import ResearchStudy from './research/ResearchStudy'

export default function App() {
  const studyMode=new URLSearchParams(window.location.search).get('study')==='1'
  return studyMode ? <ResearchStudy/> : <ClaimsApp/>
}
