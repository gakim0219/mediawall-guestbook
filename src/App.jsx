import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WallScene from './components/wall/WallScene.jsx'
import AdminForm from './components/admin/AdminForm.jsx'
import SubmitPage from './components/submit/SubmitPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/wall" element={<WallScene />} />
        <Route path="/admin" element={<AdminForm />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/" element={<Navigate to="/wall" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
