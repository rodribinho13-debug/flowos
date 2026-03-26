// ══════════════════════════════════════════════════════════════
// FlowOS – Config.jsx (completo)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { getUsuario, healthCheck } from '../services/api'

const C = { surface:'#0E1420', surface2:'#141A28', border:'rgba(255,255,255,0.07)', text:'#F0F4FF', muted:'#8892A4', accent:'#00E5FF', green:'#10B981', red:'#EF4444', yellow:'#F59E0B' }
const s = {
  card:     { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 },
  row:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` },
  label:    { fontSize: 13, color: C.muted },
  value:    { fontSize: 13, fontWeight: 600, color: C.text },
  badge:    (cor) => ({ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, color: cor, background: `${cor}18`, border: `1px solid ${cor}30` }),
  section:  { fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15, color: C.accent, marginBottom: 16 },
  copyBtn:  { padding: '5px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' },
}

const INTEGRACOES = [
  { nome: 'Supabase',       env: 'SUPABASE_URL',        desc: 'Banco de dados',          icone: '🗄️',  cor: '#3ECF8E' },
  { nome: 'OpenAI GPT-4o',  env: 'OPENAI_API_KEY',      desc: 'Análise e geração IA',    icone: '🤖',  cor: '#10B981' },
  { nome: 'Evolution API',  env: 'EVOLUTION_API_URL',   desc: 'WhatsApp Business',       icone: '💬',  cor: '#25D366' },
  { nome: 'N8N',            env: 'N8N_WEBHOOK_BASE',    desc: 'Automações e workflows',  icone: '⚡',  cor: '#F59E0B' },
  { nome: 'Apollo.io',      env: 'APOLLO_API_KEY',      desc: 'Prospecção de leads',     icone: '🎯',  cor: '#7C3AED' },
  { nome: 'SendGrid',       env: 'SENDGRID_API_KEY',    desc: 'Envio de e-mails',        icone: '📧',  cor: '#00E5FF' },
]

function CopyField({ valor }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(valor)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <code style={{ fontSize: 11, color: '#C4CEDE', background: C.surface2, padding: '4px 10px', borderRadius: 6, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {valor}
      </code>
      <button onClick={copy} style={s.copyBtn}>{copied ? '✓' : 'Copiar'}</button>
    </div>
  )
}

export default function Config() {
  const usuario    = getUsuario()
  const [saude,    setSaude]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const apiUrl     = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const token      = localStorage.getItem('flowos_token') || ''

  useEffect(() => {
    healthCheck()
      .then(r => setSaude(r))
      .catch(() => setSaude({ status: 'offline' }))
      .finally(() => setLoading(false))
  }, [])

  const backendOk = saude?.status === 'ok'

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>⚙️ Configurações</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>Dados da conta e status das integrações</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Coluna esquerda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Dados do usuário */}
          <div style={s.card}>
            <div style={s.section}>👤 Minha conta</div>
            {usuario && (
              <>
                {[
                  ['Nome',       usuario.nome],
                  ['E-mail',     usuario.email],
                  ['Perfil',     usuario.perfil],
                  ['Workspace',  usuario.workspace_nome || '—'],
                  ['Workspace ID', usuario.workspace_id],
                ].map(([k, v], i, arr) => (
                  <div key={k} style={{ ...s.row, borderBottom: i < arr.length - 1 ? s.row.borderBottom : 'none' }}>
                    <span style={s.label}>{k}</span>
                    {k === 'Perfil' ? (
                      <span style={s.badge(C.accent)}>{v}</span>
                    ) : k === 'Workspace ID' ? (
                      <CopyField valor={v || ''} />
                    ) : (
                      <span style={s.value}>{v || '—'}</span>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Token */}
          <div style={s.card}>
            <div style={s.section}>🔑 Token de API</div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
              Use este token para autenticar no Power BI e outras integrações. Válido por 7 dias.
            </p>
            <div style={{ background: C.surface2, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontWeight: 600 }}>JWT TOKEN</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#C4CEDE', wordBreak: 'break-all', lineHeight: 1.5, marginBottom: 12 }}>
                {token ? `${token.slice(0, 40)}...` : '—'}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(token); alert('Token copiado!') }}
                style={{ padding: '7px 16px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8, color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                📋 Copiar token completo
              </button>
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status backend */}
          <div style={s.card}>
            <div style={s.section}>🖥️ Status do sistema</div>
            <div style={{ ...s.row }}>
              <span style={s.label}>Backend</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: loading ? C.yellow : backendOk ? C.green : C.red }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: loading ? C.yellow : backendOk ? C.green : C.red }}>
                  {loading ? 'Verificando...' : backendOk ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div style={{ ...s.row }}>
              <span style={s.label}>Versão</span>
              <span style={s.value}>{saude?.version || '—'}</span>
            </div>
            <div style={{ ...s.row, borderBottom: 'none' }}>
              <span style={s.label}>API URL</span>
              <CopyField valor={apiUrl} />
            </div>
            {backendOk && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: C.green, margin: 0 }}>✅ Todos os sistemas operacionais</p>
              </div>
            )}
            {!loading && !backendOk && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: C.red, margin: 0 }}>⚠️ Backend offline. Verifique se <code>npm run dev</code> está rodando na pasta backend.</p>
              </div>
            )}
          </div>

          {/* Integrações */}
          <div style={s.card}>
            <div style={s.section}>🔗 Integrações</div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
              Configure as chaves no arquivo <code style={{ background: C.surface2, padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>backend/.env</code>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {INTEGRACOES.map(intg => (
                <div key={intg.nome} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.surface2, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{intg.icone}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{intg.nome}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{intg.desc}</div>
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(136,146,164,0.6)', background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: 6 }}>
                    {intg.env}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints úteis */}
      <div style={{ ...s.card, marginTop: 20 }}>
        <div style={s.section}>🛠️ Endpoints úteis</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 8 }}>
          {[
            ['GET', '/health',              'Status do backend'],
            ['POST', '/auth/login',         'Login'],
            ['POST', '/auth/cadastro',      'Cadastro'],
            ['GET', '/dashboard',           'Dados do dashboard'],
            ['GET', '/kpis',                'Listar KPIs'],
            ['GET', '/leads',               'Listar leads'],
            ['POST', '/mensagens/whatsapp', 'Enviar WhatsApp'],
            ['GET', '/export/excel/leads',  'Exportar leads Excel'],
            ['GET', '/export/powerbi/kpis', 'Power BI – KPIs'],
          ].map(([method, path, desc]) => (
            <div key={path} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: C.surface2, borderRadius: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: method === 'GET' ? C.green : C.accent, minWidth: 36 }}>{method}</span>
              <code style={{ fontSize: 12, color: '#C4CEDE', flex: 1 }}>{path}</code>
              <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
