// ══════════════════════════════════════════════════════════════
// FlowOS – Relatorios.jsx (completo)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { exportApi, dashboardApi } from '../services/api'

const C = { surface:'#0E1420', surface2:'#141A28', border:'rgba(255,255,255,0.07)', text:'#F0F4FF', muted:'#8892A4', accent:'#00E5FF', green:'#10B981' }
const s = {
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 },
  btn:  { padding: '10px 20px', background: C.accent, color: '#080C14', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { padding: '9px 16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
}

const TIPOS = [
  { tipo: 'leads',     label: 'Leads & CRM',  desc: 'Todos os leads com status e histórico',      icone: '🎯' },
  { tipo: 'kpis',      label: 'KPIs',          desc: 'Histórico completo de indicadores',          icone: '📊' },
  { tipo: 'mensagens', label: 'Mensagens',     desc: 'Histórico de mensagens por canal',           icone: '💬' },
  { tipo: 'relatorio', label: 'Relatório Completo', desc: 'Leads + KPIs + Mensagens em abas',      icone: '📋' },
]

export default function Relatorios() {
  const [baixando, setBaixando] = useState(null)
  const [resumo,   setResumo]   = useState(null)

  useEffect(() => {
    dashboardApi.get().then(d => setResumo(d)).catch(() => {})
  }, [])

  const baixar = async (tipo, formato) => {
    setBaixando(`${tipo}-${formato}`)
    try {
      await exportApi.baixar(tipo, formato)
    } catch (err) {
      alert('Erro ao exportar: ' + err.message)
    } finally {
      setBaixando(null)
    }
  }

  const powerbiUrl = (tipo) => exportApi.powerbiUrl(tipo)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>📋 Relatórios & Exportação</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>Exporte dados para Excel, CSV ou conecte ao Power BI</p>
      </div>

      {/* Resumo rápido */}
      {resumo && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Leads total',     valor: resumo.status_leads?.reduce((a,b) => a+b.value,0) || 0,  icone: '🎯' },
            { label: 'Reuniões',        valor: resumo.reunioes_marcadas || 0,                            icone: '📅' },
            { label: 'Msgs enviadas',   valor: resumo.mensagens_hoje || 0,                               icone: '💬' },
          ].map(item => (
            <div key={item.label} style={{ ...s.card, padding: '16px 20px' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icone}</div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: C.accent }}>{item.valor}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Cards de exportação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginBottom: 32 }}>
        {TIPOS.map(({ tipo, label, desc, icone }) => (
          <div key={tipo} style={s.card}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{icone}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>{desc}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={!!baixando}
                onClick={() => baixar(tipo, 'xlsx')}
                style={{ flex: 1, padding: '9px 0', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8, color: C.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: baixando === `${tipo}-xlsx` ? 0.6 : 1 }}>
                {baixando === `${tipo}-xlsx` ? '⏳' : '📊'} Excel
              </button>
              <button
                disabled={!!baixando}
                onClick={() => baixar(tipo, 'csv')}
                style={{ flex: 1, padding: '9px 0', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: baixando === `${tipo}-csv` ? 0.6 : 1 }}>
                {baixando === `${tipo}-csv` ? '⏳' : '📄'} CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Power BI */}
      <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 16, padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 17, color: C.accent, marginBottom: 8 }}>📊 Conectar ao Power BI</div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
          No Power BI Desktop: <strong style={{ color: '#C4CEDE' }}>Obter Dados → Web</strong> → cole a URL abaixo.
          Adicione o header <code style={{ background: C.surface2, padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>Authorization: Bearer &lt;token&gt;</code>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['kpis', 'leads', 'relatorio'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#C4CEDE', background: C.surface2, padding: '10px 14px', borderRadius: 8, overflow: 'auto', whiteSpace: 'nowrap' }}>
                GET {powerbiUrl(t)}
              </code>
              <button onClick={() => navigator.clipboard.writeText(powerbiUrl(t))}
                style={{ ...s.btnGhost, padding: '9px 14px', flexShrink: 0, fontSize: 12 }}>
                Copiar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Instruções */}
      <div style={{ ...s.card, padding: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>📖 Como usar</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['1', 'Clique em Excel ou CSV para baixar os dados imediatamente'],
            ['2', 'Para Power BI: cole a URL no campo "Fonte Web" e adicione o header de autenticação'],
            ['3', 'O token está no localStorage do navegador (flowos_token) — copie via F12 > Application'],
            ['4', 'Configure atualização automática a cada 30 min no Power BI para dados sempre frescos'],
          ].map(([n, txt]) => (
            <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{n}</div>
              <p style={{ fontSize: 13, color: '#C4CEDE', margin: 0, lineHeight: 1.5 }}>{txt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
