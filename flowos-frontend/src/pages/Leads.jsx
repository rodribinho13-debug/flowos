// ══════════════════════════════════════════════════════════════
// FlowOS – Leads.jsx (completo)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { leadsApi } from '../services/api'

const C = { surface:'#0E1420', surface2:'#141A28', border:'rgba(255,255,255,0.07)', text:'#F0F4FF', muted:'#8892A4', accent:'#00E5FF', green:'#10B981', yellow:'#F59E0B', red:'#EF4444', purple:'#7C3AED' }

const STATUS_CFG = {
  novo:         { label: 'Novo',        cor: '#00E5FF', bg: 'rgba(0,229,255,0.1)' },
  contatado_1:  { label: 'Contatado',   cor: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  contatado_2:  { label: 'Follow-up',   cor: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  respondeu:    { label: 'Respondeu',   cor: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  reuniao:      { label: 'Reunião',     cor: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  fechado:      { label: 'Fechado ✓',  cor: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  perdido:      { label: 'Perdido',     cor: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
}

const s = {
  card:   { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 },
  input:  { padding: '9px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' },
  btn:    { padding: '9px 20px', background: C.accent, color: C.surface, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { padding: '9px 16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:  { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' },
}

function Badge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, cor: C.muted, bg: 'rgba(255,255,255,0.05)' }
  return <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, color: cfg.cor, background: cfg.bg }}>{cfg.label}</span>
}

export default function Leads() {
  const [leads,    setLeads]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [busca,    setBusca]    = useState('')
  const [status,   setStatus]   = useState('')
  const [selected, setSelected] = useState(null)  // lead no modal
  const [updNota,  setUpdNota]  = useState('')
  const [updStatus,setUpdStatus]= useState('')
  const [saving,   setSaving]   = useState(false)

  const carregar = useCallback(() => {
    setLoading(true)
    leadsApi.listar({ page, limit: 25, busca: busca || undefined, status: status || undefined })
      .then(r => { setLeads(r.leads || []); setTotal(r.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, busca, status])

  useEffect(carregar, [carregar])

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); carregar() }, 400)
    return () => clearTimeout(t)
  }, [busca])

  const abrirLead = (l) => { setSelected(l); setUpdStatus(l.status); setUpdNota(l.nota || '') }

  const salvarStatus = async () => {
    setSaving(true)
    try {
      await leadsApi.atualizarStatus(selected.id, { status: updStatus, nota: updNota })
      setSelected(null)
      carregar()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / 25)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap'); input:focus,select:focus{border-color:#00E5FF!important;outline:none} tr:hover td{background:rgba(255,255,255,0.02)}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>🎯 Leads</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>{total.toLocaleString('pt-BR')} leads encontrados</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input style={{ ...s.input, flex: 1, minWidth: 200 }}
          placeholder="🔍 Buscar por nome, empresa, e-mail..."
          value={busca} onChange={e => { setBusca(e.target.value); setPage(1) }} />

        <select style={s.input} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CFG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>

        <button style={s.btnGhost} onClick={carregar}>↻ Atualizar</button>
      </div>

      {/* Contadores de status */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CFG).map(([v, { label, cor, bg }]) => (
          <button key={v} onClick={() => { setStatus(status === v ? '' : v); setPage(1) }}
            style={{ padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${status === v ? cor : 'transparent'}`, color: cor, background: status === v ? bg : 'rgba(255,255,255,0.03)', transition: 'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div style={s.card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>⏳ Carregando leads...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Nome', 'Empresa', 'Cargo', 'Status', 'Região', 'Último contato', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: C.muted }}>
                    Nenhum lead encontrado. Configure uma campanha para começar.
                  </td></tr>
                ) : leads.map((l, i) => (
                  <tr key={l.id || i} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)`, transition: 'background .15s', cursor: 'pointer' }}
                    onClick={() => abrirLead(l)}>
                    <td style={{ padding: '13px 16px', fontWeight: 600, color: C.text }}>
                      {l.nome || '—'}
                      {l.linkedin && <a href={l.linkedin} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ marginLeft: 8, color: C.muted, fontSize: 11 }}>in↗</a>}
                    </td>
                    <td style={{ padding: '13px 16px', color: '#C4CEDE' }}>{l.empresa || '—'}</td>
                    <td style={{ padding: '13px 16px', color: C.muted }}>{l.cargo || '—'}</td>
                    <td style={{ padding: '13px 16px' }}><Badge status={l.status} /></td>
                    <td style={{ padding: '13px 16px', color: C.muted, fontSize: 12 }}>{l.nome_regiao || l.cidade || '—'}</td>
                    <td style={{ padding: '13px 16px', color: C.muted, fontSize: 12 }}>
                      {l.data_ultimo_contato ? new Date(l.data_ultimo_contato).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 16, color: C.muted }}>›</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 20, borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ ...s.btnGhost, opacity: page === 1 ? 0.4 : 1 }}>← Anterior</button>
            <span style={{ padding: '9px 16px', color: C.muted, fontSize: 13 }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ ...s.btnGhost, opacity: page === totalPages ? 0.4 : 1 }}>Próxima →</button>
          </div>
        )}
      </div>

      {/* Modal Detalhe Lead */}
      {selected && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{selected.nome}</h3>
                <p style={{ color: C.muted, fontSize: 14 }}>{selected.cargo} · {selected.empresa}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            {/* Dados */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                ['E-mail',    selected.email],
                ['WhatsApp',  selected.whatsapp || selected.telefone],
                ['Cidade',    selected.cidade],
                ['Estado',    selected.estado],
                ['Nicho',     selected.nicho],
                ['Origem',    selected.origem],
              ].map(([k, v]) => v ? (
                <div key={k} style={{ background: C.surface2, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ) : null)}
            </div>

            {/* Atualizar status */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Status</label>
              <select style={{ ...s.input, width: '100%' }} value={updStatus} onChange={e => setUpdStatus(e.target.value)}>
                {Object.entries(STATUS_CFG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Nota interna</label>
              <textarea
                style={{ ...s.input, width: '100%', minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
                placeholder="Anotações sobre este lead..."
                value={updNota} onChange={e => setUpdNota(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSelected(null)} style={{ ...s.btnGhost, flex: 1 }}>Fechar</button>
              <button onClick={salvarStatus} disabled={saving} style={{ ...s.btn, flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>

            {/* Links rápidos */}
            {(selected.whatsapp || selected.telefone) && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <a
                  href={`https://wa.me/55${(selected.whatsapp || selected.telefone).replace(/\D/g, '')}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 8, color: '#25D366', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  💬 Abrir WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
