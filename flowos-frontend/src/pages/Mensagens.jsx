// ══════════════════════════════════════════════════════════════
// FlowOS – Mensagens.jsx (completo)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { mensagensApi, leadsApi } from '../services/api'

const C = { surface:'#0E1420', surface2:'#141A28', border:'rgba(255,255,255,0.07)', text:'#F0F4FF', muted:'#8892A4', accent:'#00E5FF', green:'#10B981', yellow:'#F59E0B', red:'#EF4444' }

const CANAL_CFG = {
  whatsapp: { cor: '#25D366', bg: 'rgba(37,211,102,0.1)', label: 'WhatsApp', icone: '💬' },
  email:    { cor: '#00E5FF', bg: 'rgba(0,229,255,0.1)',  label: 'E-mail',   icone: '📧' },
  linkedin: { cor: '#0A66C2', bg: 'rgba(10,102,194,0.1)', label: 'LinkedIn', icone: '💼' },
}

const STATUS_CFG = {
  enviado:    { cor: C.muted,   label: 'Enviado'    },
  entregue:   { cor: C.green,   label: 'Entregue'   },
  aberto:     { cor: C.accent,  label: 'Aberto'     },
  respondido: { cor: '#F59E0B', label: 'Respondido' },
  falhou:     { cor: C.red,     label: 'Falhou'     },
}

const s = {
  card:     { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 },
  btn:      { padding: '10px 20px', background: C.accent, color: '#080C14', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { padding: '9px 16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  input:    { width: '100%', padding: '11px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  label:    { display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:    { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto' },
}

function TabBtn({ ativa, onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, transition: 'all .15s', background: ativa ? C.accent : 'rgba(255,255,255,0.04)', color: ativa ? '#080C14' : C.muted }}>
      {children}
    </button>
  )
}

export default function Mensagens() {
  const [aba,         setAba]         = useState('historico')  // historico | enviar | templates
  const [mensagens,   setMensagens]   = useState([])
  const [templates,   setTemplates]   = useState([])
  const [leads,       setLeads]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [filtroCanal, setFiltroCanal] = useState('')

  // form envio
  const [leadSel,  setLeadSel]  = useState('')
  const [texto,    setTexto]    = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado,  setEnviado]  = useState(false)

  // form template
  const [tplForm,   setTplForm]   = useState({ nome: '', canal: 'whatsapp', assunto: '', corpo: '' })
  const [savingTpl, setSavingTpl] = useState(false)

  const carregarMensagens = () => {
    setLoading(true)
    mensagensApi.listar({ limit: 50, canal: filtroCanal || undefined })
      .then(r => setMensagens(r.mensagens || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(carregarMensagens, [filtroCanal])

  useEffect(() => {
    mensagensApi.templates().then(setTemplates).catch(console.error)
    leadsApi.listar({ limit: 200 }).then(r => setLeads(r.leads || [])).catch(console.error)
  }, [])

  const enviarWhatsApp = async (e) => {
    e.preventDefault()
    if (!leadSel || !texto.trim()) return
    setEnviando(true)
    try {
      await mensagensApi.enviarWhatsApp({ lead_id: leadSel, texto })
      setEnviado(true)
      setTexto('')
      setTimeout(() => setEnviado(false), 3000)
      carregarMensagens()
    } catch (err) { alert('Erro: ' + (err.message || 'Verifique se a Evolution API está configurada.')) }
    finally { setEnviando(false) }
  }

  const salvarTemplate = async (e) => {
    e.preventDefault()
    setSavingTpl(true)
    try {
      await mensagensApi.criarTemplate(tplForm)
      setTplForm({ nome: '', canal: 'whatsapp', assunto: '', corpo: '' })
      mensagensApi.templates().then(setTemplates)
    } catch (err) { alert(err.message) }
    finally { setSavingTpl(false) }
  }

  const usarTemplate = (t) => {
    setTexto(t.corpo)
    setAba('enviar')
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap'); input:focus,select:focus,textarea:focus{border-color:#00E5FF!important;outline:none}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>💬 Mensagens</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>{mensagens.length} mensagens • WhatsApp, E-mail e LinkedIn</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <TabBtn ativa={aba === 'historico'}  onClick={() => setAba('historico')}>📋 Histórico</TabBtn>
          <TabBtn ativa={aba === 'enviar'}     onClick={() => setAba('enviar')}>✉️ Enviar</TabBtn>
          <TabBtn ativa={aba === 'templates'}  onClick={() => setAba('templates')}>📝 Templates</TabBtn>
        </div>
      </div>

      {/* ── ABA HISTÓRICO ── */}
      {aba === 'historico' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['', 'whatsapp', 'email', 'linkedin'].map(c => (
              <button key={c} onClick={() => setFiltroCanal(c)}
                style={{ ...s.btnGhost, color: filtroCanal === c ? C.accent : C.muted, borderColor: filtroCanal === c ? C.accent : C.border }}>
                {c === '' ? 'Todos' : CANAL_CFG[c]?.icone + ' ' + CANAL_CFG[c]?.label}
              </button>
            ))}
          </div>

          <div style={s.card}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>⏳ Carregando...</div>
            ) : mensagens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                <p style={{ color: C.muted }}>Nenhuma mensagem enviada ainda.</p>
                <button style={{ ...s.btn, marginTop: 16 }} onClick={() => setAba('enviar')}>Enviar primeira mensagem</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {['Canal', 'Lead', 'Mensagem', 'Status', 'Enviado em'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mensagens.map((m, i) => {
                      const canal  = CANAL_CFG[m.canal]  || { cor: C.muted, label: m.canal, icone: '📨', bg: 'transparent' }
                      const status = STATUS_CFG[m.status] || { cor: C.muted, label: m.status }
                      return (
                        <tr key={m.id || i} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, color: canal.cor, background: canal.bg }}>
                              {canal.icone} {canal.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.leads?.nome || '—'}</div>
                            <div style={{ color: C.muted, fontSize: 11 }}>{m.leads?.empresa || ''}</div>
                          </td>
                          <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                            <div style={{ color: '#C4CEDE', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.corpo || '—'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: status.cor }}>{status.label}</span>
                          </td>
                          <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                            {m.enviado_em ? new Date(m.enviado_em).toLocaleString('pt-BR') : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ABA ENVIAR ── */}
      {aba === 'enviar' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ ...s.card, padding: 28 }}>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 17, marginBottom: 24 }}>Enviar mensagem WhatsApp</h3>

            {enviado && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: C.green, fontSize: 14, fontWeight: 600 }}>
                ✅ Mensagem enviada com sucesso!
              </div>
            )}

            <form onSubmit={enviarWhatsApp}>
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Selecionar lead *</label>
                <select style={s.input} required value={leadSel} onChange={e => setLeadSel(e.target.value)}>
                  <option value="">— Escolha um lead —</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nome} {l.empresa ? `(${l.empresa})` : ''} {l.whatsapp || l.telefone ? '📱' : '⚠️ sem número'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>Mensagem *</label>
                <textarea style={{ ...s.input, minHeight: 140, resize: 'vertical' }} required
                  placeholder="Olá, tudo bem? Vi que você atua na área de..."
                  value={texto} onChange={e => setTexto(e.target.value)} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{texto.length} caracteres</div>
              </div>

              <button type="submit" disabled={enviando} style={{ ...s.btn, width: '100%', padding: '13px', opacity: enviando ? 0.6 : 1 }}>
                {enviando ? '⏳ Enviando...' : '💬 Enviar via WhatsApp'}
              </button>
            </form>

            <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: '#F59E0B', margin: 0 }}>
                ⚠️ Requer Evolution API configurada no .env do backend (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE).
              </p>
            </div>
          </div>

          {/* Templates disponíveis */}
          {templates.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Usar template:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map(t => (
                  <div key={t.id} style={{ ...s.card, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => usarTemplate(t)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.nome}</div>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{(t.corpo || '').slice(0, 60)}...</div>
                    </div>
                    <span style={{ color: C.accent, fontSize: 13 }}>Usar →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA TEMPLATES ── */}
      {aba === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Formulário */}
          <div style={{ ...s.card, padding: 28 }}>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, marginBottom: 20 }}>Novo Template</h3>
            <form onSubmit={salvarTemplate}>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Nome *</label>
                <input style={s.input} required placeholder="ex: Primeiro contato B2B"
                  value={tplForm.nome} onChange={e => setTplForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Canal</label>
                <select style={s.input} value={tplForm.canal} onChange={e => setTplForm(f => ({ ...f, canal: e.target.value }))}>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="email">📧 E-mail</option>
                  <option value="linkedin">💼 LinkedIn</option>
                </select>
              </div>
              {tplForm.canal === 'email' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>Assunto</label>
                  <input style={s.input} placeholder="Assunto do e-mail"
                    value={tplForm.assunto} onChange={e => setTplForm(f => ({ ...f, assunto: e.target.value }))} />
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>Corpo (use {'{{nome}}'}, {'{{empresa}}'} como variáveis)</label>
                <textarea style={{ ...s.input, minHeight: 120, resize: 'vertical' }} required
                  placeholder="Olá {{nome}}, vi que a {{empresa}} atua em..."
                  value={tplForm.corpo} onChange={e => setTplForm(f => ({ ...f, corpo: e.target.value }))} />
              </div>
              <button type="submit" disabled={savingTpl} style={{ ...s.btn, width: '100%', opacity: savingTpl ? 0.6 : 1 }}>
                {savingTpl ? 'Salvando...' : 'Salvar Template'}
              </button>
            </form>
          </div>

          {/* Lista */}
          <div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>{templates.length} templates cadastrados</p>
            {templates.length === 0 ? (
              <div style={{ ...s.card, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                <p style={{ color: C.muted }}>Nenhum template criado.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {templates.map(t => {
                  const canal = CANAL_CFG[t.canal] || { icone: '📨', cor: C.muted, bg: 'transparent', label: t.canal }
                  return (
                    <div key={t.id} style={{ ...s.card, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.nome}</div>
                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, color: canal.cor, background: canal.bg }}>
                          {canal.icone} {canal.label}
                        </span>
                      </div>
                      <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                        {(t.corpo || '').slice(0, 100)}{(t.corpo || '').length > 100 ? '...' : ''}
                      </p>
                      {t.variaveis?.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {t.variaveis.map(v => (
                            <span key={v} style={{ fontSize: 10, color: C.accent, background: 'rgba(0,229,255,0.08)', padding: '2px 8px', borderRadius: 4 }}>{'{{'}{v}{'}}'}</span>
                          ))}
                        </div>
                      )}
                      <button onClick={() => usarTemplate(t)} style={{ marginTop: 10, ...s.btnGhost, fontSize: 12, padding: '6px 14px', color: C.accent, borderColor: 'rgba(0,229,255,0.2)' }}>
                        Usar template →
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
