// ══════════════════════════════════════════════════════════════
// FlowOS – Dashboard.jsx
// Conecta ao GET /dashboard do backend real
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { dashboardApi, exportApi } from '../services/api'

function KPICard({ label, valor, delta, cor = '#00E5FF', icone }) {
  const positivo = delta >= 0
  return (
    <div style={{
      background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: 24, transition: 'transform .2s, box-shadow .2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.4)` }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: '#8892A4', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 22 }}>{icone}</span>
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: cor }}>
        {valor ?? '—'}
      </div>
      {delta !== undefined && (
        <div style={{ marginTop: 8, fontSize: 12, color: positivo ? '#10B981' : '#EF4444' }}>
          {positivo ? '▲' : '▼'} {Math.abs(delta)}% vs mês anterior
        </div>
      )}
    </div>
  )
}

function BarChart({ dados = [] }) {
  if (!dados.length) return <div style={{ color: '#8892A4', fontSize: 13 }}>Sem dados</div>
  const max = Math.max(...dados.map(d => d.valor || 0)) || 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
      {dados.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: i === dados.length - 1 ? '#00E5FF' : 'rgba(0,229,255,0.25)', height: `${(d.valor / max) * 100}%`, minHeight: 4, transition: 'height .5s' }} />
          <span style={{ fontSize: 10, color: '#8892A4', whiteSpace: 'nowrap' }}>{d.mes}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    dashboardApi.get()
      .then(setDados)
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#8892A4' }}>
      <div>⏳ Carregando dashboard...</div>
    </div>
  )

  if (erro) return (
    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 24, color: '#FCA5A5' }}>
      <strong>Erro ao carregar dashboard:</strong> {erro}
      <br /><small style={{ color: '#8892A4' }}>Verifique se o backend está rodando em http://localhost:3001</small>
    </div>
  )

  // Encontra KPI específico
  const kpi = (nome) => dados?.kpis?.find(k => k.kpi_nome?.toLowerCase().includes(nome.toLowerCase()))

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: '#F0F4FF' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: '#8892A4', fontSize: 14 }}>Visão geral do seu negócio em tempo real</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => exportApi.baixar('relatorio', 'excel')} style={{
            padding: '9px 20px', background: '#0E1420', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#F0F4FF', cursor: 'pointer', fontSize: 13, fontWeight: 500
          }}>📥 Exportar Excel</button>
          <button onClick={() => exportApi.baixar('relatorio', 'csv')} style={{
            padding: '9px 20px', background: '#0E1420', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#F0F4FF', cursor: 'pointer', fontSize: 13, fontWeight: 500
          }}>📥 Exportar CSV</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <KPICard label="Mensagens Hoje"   valor={dados?.mensagens_hoje ?? 0}  icone="💬" cor="#00E5FF" />
        <KPICard label="Reuniões Ativas"  valor={dados?.reunioes_marcadas ?? 0} icone="📅" cor="#7C3AED" />
        {kpi('faturamento') && <KPICard label="Faturamento" valor={`R$ ${(kpi('faturamento').valor || 0).toLocaleString('pt-BR')}`} icone="💰" cor="#10B981" delta={kpi('faturamento')?.variacao} />}
        {kpi('leads') && <KPICard label="Leads Gerados" valor={kpi('leads').valor} icone="🎯" cor="#F59E0B" delta={kpi('leads')?.variacao} />}
      </div>

      {/* Linha 2: Gráficos + IA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Faturamento Mensal */}
        <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>📈 Faturamento Mensal</div>
          <BarChart dados={dados?.faturamento_mensal || []} />
        </div>

        {/* Status dos Leads */}
        <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>🎯 Leads por Status</div>
          {(dados?.status_leads || []).map((s, i) => {
            const total = dados.status_leads.reduce((a, b) => a + b.value, 0)
            const cores = ['#00E5FF','#7C3AED','#10B981','#F59E0B','#EF4444','#8B5CF6']
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cores[i % cores.length], flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#8892A4', flex: 1 }}>{s.name}</span>
                <div style={{ height: 6, flex: 3, background: '#141A28', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(s.value / total) * 100}%`, background: cores[i % cores.length], borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, color: '#F0F4FF', fontWeight: 600, width: 30, textAlign: 'right' }}>{s.value}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Análise IA */}
      {dados?.analise_ia && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(124,58,237,0.06))',
          border: '1px solid rgba(0,229,255,0.15)',
          borderRadius: 16, padding: 24, marginBottom: 24
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#00E5FF' }}>🤖 Análise da IA</div>
          <p style={{ fontSize: 14, color: '#C4CEDE', lineHeight: 1.7, marginBottom: dados?.sugestoes_ia?.length ? 16 : 0 }}>{dados.analise_ia}</p>
          {dados?.sugestoes_ia?.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#8892A4' }}>Sugestões de ação:</div>
              {dados.sugestoes_ia.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: '#C4CEDE' }}>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>→</span> {s}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Atividades Recentes */}
      {dados?.atividades?.length > 0 && (
        <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🕐 Atividades Recentes</div>
          {dados.atividades.slice(0, 5).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12, borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none', marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5FF', marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#C4CEDE' }}>{a.descricao}</div>
                <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2 }}>{a.tempo}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
