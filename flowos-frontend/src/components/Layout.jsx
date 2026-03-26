// ══════════════════════════════════════════════════════════════
// FlowOS – Layout.jsx (Sidebar + Outlet)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { authApi, getUsuario, healthCheck } from '../services/api'

const LINKS = [
  { to: '/dashboard',  label: 'Dashboard',   icon: '⬛' },
  { to: '/kpis',       label: 'KPIs',        icon: '📊' },
  { to: '/financeiro', label: 'Financeiro',  icon: '💰' },
  { to: '/leads',      label: 'Leads',       icon: '🎯' },
  { to: '/crm',        label: 'CRM',         icon: '🤝' },
  { to: '/mensagens',  label: 'Mensagens',   icon: '💬' },
  { to: '/rh',         label: 'RH',          icon: '👥' },
  { to: '/relatorios', label: 'Relatórios',  icon: '📋' },
  { to: '/config',     label: 'Config',      icon: '⚙️'  },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [backendOk, setBackendOk] = useState(null)
  const navigate = useNavigate()
  const usuario = getUsuario()

  useEffect(() => {
    healthCheck().then(r => setBackendOk(r.status === 'ok'))
    const iv = setInterval(() => healthCheck().then(r => setBackendOk(r.status === 'ok')), 30000)
    return () => clearInterval(iv)
  }, [])

  const handleLogout = () => {
    authApi.logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080C14', color: '#F0F4FF', fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 64 : 220,
        background: '#0E1420',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        transition: 'width .25s', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #00E5FF, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: '#080C14'
            }}>F</div>
            {!collapsed && <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>FlowOS</span>}
          </div>
        </div>

        {/* Status backend */}
        {!collapsed && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: backendOk === null ? '#666' : backendOk ? '#10B981' : '#EF4444', animation: backendOk ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ color: '#8892A4' }}>Backend {backendOk === null ? '...' : backendOk ? 'online' : 'offline'}</span>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LINKS.map(l => (
            <NavLink key={l.to} to={l.to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '10px 14px' : '10px 12px',
              borderRadius: 8, textDecoration: 'none',
              fontSize: 14, fontWeight: 500,
              color: isActive ? '#00E5FF' : '#8892A4',
              background: isActive ? 'rgba(0,229,255,0.08)' : 'transparent',
              transition: 'all .15s',
              justifyContent: collapsed ? 'center' : 'flex-start'
            })}>
              <span style={{ fontSize: 16 }}>{l.icon}</span>
              {!collapsed && <span>{l.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {!collapsed && usuario && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#F0F4FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario.nome}
              </div>
              <div style={{ fontSize: 11, color: '#8892A4' }}>{usuario.perfil}</div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px 0', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
            color: '#8892A4', cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
            🚪 {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          height: 56, borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
          background: 'rgba(8,12,20,0.9)', backdropFilter: 'blur(10px)',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <button onClick={() => setCollapsed(c => !c)} style={{
            background: 'none', border: 'none', color: '#8892A4', cursor: 'pointer', fontSize: 18, padding: 4
          }}>☰</button>
          <div style={{ flex: 1 }} />
          {backendOk === false && (
            <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '4px 12px', borderRadius: 100, border: '1px solid rgba(239,68,68,0.3)' }}>
              ⚠️ Backend offline — verifique se o servidor está rodando
            </div>
          )}
        </header>

        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        a:hover { color: #F0F4FF !important; background: rgba(255,255,255,0.04) !important; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
