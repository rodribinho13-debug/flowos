// ══════════════════════════════════════════════════════════════
// FlowOS – Config.jsx (completo)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { getUsuario, healthCheck, configuracoesApi } from '../services/api'

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

  // ── WhatsApp config state ────────────────────────────────
  const [waCfg, setWaCfg] = useState({ evolution_api_url: '', evolution_api_key: '', evolution_instance: '', rh_whatsapp_numero: '' })
  const [waLoading,  setWaLoading]  = useState(false)
  const [waTesting,  setWaTesting]  = useState(false)
  const [waMsg,      setWaMsg]      = useState(null)   // { tipo: 'ok'|'erro', texto: '' }
  const [waTestMsg,  setWaTestMsg]  = useState(null)
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    healthCheck()
      .then(r => setSaude(r))
      .catch(() => setSaude({ status: 'offline' }))
      .finally(() => setLoading(false))

    configuracoesApi.whatsapp()
      .then(d => d && setWaCfg({ evolution_api_url: d.evolution_api_url || '', evolution_api_key: d.evolution_api_key || '', evolution_instance: d.evolution_instance || '', rh_whatsapp_numero: d.rh_whatsapp_numero || '' }))
      .catch(() => {})
  }, [])

  const salvarWhatsapp = async (e) => {
    e.preventDefault()
    setWaMsg(null)
    setWaLoading(true)
    try {
      await configuracoesApi.salvarWhatsapp(waCfg)
      setWaMsg({ tipo: 'ok', texto: 'Configuração salva com sucesso!' })
    } catch (err) {
      setWaMsg({ tipo: 'erro', texto: err.message })
    } finally {
      setWaLoading(false)
    }
  }

  const testarWhatsapp = async () => {
    setWaTestMsg(null)
    setWaTesting(true)
    try {
      const r = await configuracoesApi.testarWhatsapp(waCfg)
      setWaTestMsg({ tipo: r.conectado ? 'ok' : 'aviso', texto: r.message })
    } catch (err) {
      setWaTestMsg({ tipo: 'erro', texto: err.message })
    } finally {
      setWaTesting(false)
    }
  }

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

      {/* WhatsApp / Evolution API */}
      <div style={{ ...s.card, marginTop: 20 }}>
        <div style={s.section}>💬 Configuração do WhatsApp (Evolution API)</div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
          Configure sua instância da Evolution API. Cada workspace pode ter sua própria conta de WhatsApp.
          Os dados salvos aqui têm prioridade sobre as variáveis de ambiente do servidor.
        </p>

        <form onSubmit={salvarWhatsapp}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* URL */}
            <div>
              <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>URL da Evolution API *</label>
              <input
                style={{ width: '100%', padding: '10px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                type="url" placeholder="https://api.seudominio.com" required
                value={waCfg.evolution_api_url}
                onChange={e => setWaCfg(v => ({ ...v, evolution_api_url: e.target.value }))}
              />
            </div>

            {/* Instância */}
            <div>
              <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Nome da Instância *</label>
              <input
                style={{ width: '100%', padding: '10px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                type="text" placeholder="minha-instancia" required
                value={waCfg.evolution_instance}
                onChange={e => setWaCfg(v => ({ ...v, evolution_instance: e.target.value }))}
              />
            </div>

            {/* API Key */}
            <div style={{ position: 'relative' }}>
              <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Chave da API (apikey) *</label>
              <input
                style={{ width: '100%', padding: '10px 44px 10px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                type={showApiKey ? 'text' : 'password'} placeholder="••••••••••••••••" required
                value={waCfg.evolution_api_key}
                onChange={e => setWaCfg(v => ({ ...v, evolution_api_key: e.target.value }))}
              />
              <button type="button" onClick={() => setShowApiKey(v => !v)}
                style={{ position: 'absolute', right: 12, top: 36, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 15 }}>
                {showApiKey ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Número RH */}
            <div>
              <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Número do RH (resumo diário)</label>
              <input
                style={{ width: '100%', padding: '10px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                type="text" placeholder="5511999999999"
                value={waCfg.rh_whatsapp_numero}
                onChange={e => setWaCfg(v => ({ ...v, rh_whatsapp_numero: e.target.value }))}
              />
              <span style={{ fontSize: 11, color: C.muted }}>DDI + DDD + número, sem espaços</span>
            </div>
          </div>

          {/* Mensagens de feedback */}
          {waMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13,
              background: waMsg.tipo === 'ok' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${waMsg.tipo === 'ok' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: waMsg.tipo === 'ok' ? C.green : C.red }}>
              {waMsg.texto}
            </div>
          )}
          {waTestMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13,
              background: waTestMsg.tipo === 'ok' ? 'rgba(16,185,129,0.08)' : waTestMsg.tipo === 'aviso' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${waTestMsg.tipo === 'ok' ? 'rgba(16,185,129,0.25)' : waTestMsg.tipo === 'aviso' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: waTestMsg.tipo === 'ok' ? C.green : waTestMsg.tipo === 'aviso' ? C.yellow : C.red }}>
              {waTestMsg.texto}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={testarWhatsapp} disabled={waTesting}
              style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {waTesting ? 'Testando...' : '🔌 Testar conexão'}
            </button>
            <button type="submit" disabled={waLoading}
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#00E5FF,#00B8CC)', border: 'none', borderRadius: 10, color: '#080C14', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: waLoading ? 0.6 : 1 }}>
              {waLoading ? 'Salvando...' : '💾 Salvar configuração'}
            </button>
          </div>
        </form>
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
