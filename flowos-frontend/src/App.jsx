// ══════════════════════════════════════════════════════════════
// FlowOS – App.jsx
// Roteamento principal com proteção de rotas
// ══════════════════════════════════════════════════════════════
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { authApi } from './services/api'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import KPIs from './pages/KPIs'
import Leads from './pages/Leads'
import Mensagens from './pages/Mensagens'
import CRM from './pages/CRM'
import Relatorios from './pages/Relatorios'
import Config from './pages/Config'
import Financeiro from './pages/Financeiro'
import RH from './pages/RH'

// Layout
import Layout from './components/Layout'

// Rota protegida
function PrivateRoute({ children }) {
  return authApi.isLogado() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="kpis"        element={<KPIs />} />
          <Route path="leads"       element={<Leads />} />
          <Route path="mensagens"   element={<Mensagens />} />
          <Route path="crm"         element={<CRM />} />
          <Route path="financeiro"  element={<Financeiro />} />
          <Route path="rh"          element={<RH />} />
          <Route path="relatorios"  element={<Relatorios />} />
          <Route path="config"      element={<Config />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
