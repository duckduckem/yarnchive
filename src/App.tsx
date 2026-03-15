import { Routes, Route } from 'react-router-dom'
import KnittingPage from './pages/knitting-page'

function Home() {
  return <div className="p-4 text-lg">Yarnchive</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects/:projectId/knit" element={<KnittingPage />} />
    </Routes>
  )
}
