import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Bets }      from './pages/Bets'
import { PorData }   from './pages/PorData'
import { PorEvento } from './pages/PorEvento'
import { Admin }     from './pages/Admin'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<Bets />}      />
        <Route path="/por-data"   element={<PorData />}   />
        <Route path="/por-evento" element={<PorEvento />} />
        <Route path="/admin"      element={<Admin />}     />
      </Routes>
    </BrowserRouter>
  )
}
