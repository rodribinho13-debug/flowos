// ══════════════════════════════════════════════════════════════
// FlowOS – CRM.jsx  — Pipeline Kanban
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { leadsApi } from '../services/api'

const C = { surface:'#0E1420', surface2:'#141A28', border:'rgba(255,255,255,0.07)', text:'#F0F4FF', muted:'#8892A4', accent:'#00E5FF', green:'#10B981', yellow:'#F59E0B', red:'#EF4444', purple:'#7C3AED' }

const COLUNAS = [
  { id: 'novo',        label: 'Novos',       cor: '#00E5FF', icone: '🆕' },
  { id: 'contatado_1', label: 'Contatado',   cor: '#7C3AED', icone: '📩' },
  { id: 'respondeu',   label: 'Respondeu',   cor: '#F59E0B', icone: '💬' },
  { id: 'reuniao',     label: 'Reunião',     cor: '#10B981', icone: '📅' },
  { id: 'fechado',     label: 'Fechado',     cor: '#10B981', icone: '✅' },
  { id: 'perdido',     label: 'Perdido',     cor: '#EF4444', icone: '❌' },
]

export default function CRM() {
  const [leads,     setLeads]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [dragging,  setDragging]  = useState(null)
  const [dragOver,  setDragOver]  = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [updStatus, setUpdStatus] = useState('')
  const [updNota,   setUpdNota]   = useState('')

  const carregar = () => {
    setLoading(true)
    leadsApi.listar({ limit: 200 })
      .then(r => setLeads(r.leads || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(carregar, [])

  const porStatus = (status) => leads.filter(l => l.status === status)

  // ── Drag & Drop ──────────────────────────────────────────
  const onDragStart = (e, lead) => {
    setDragging(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = async (e, novoStatus) => {
    e.preventDefault()
    if (!dragging || dragging.status === novoStatus) { setDragging(null); setDragOver(null); return }
    // Atualiza localmente primeiro (otimista)
    setLeads(prev => prev.map(l => l.id === dragging.id ? { ...l, status: novoStatus } : l))
    setDragging(null)
    setDragOver(null)
    try {
      await leadsApi.atualizarStatus(dragging.id, { status: novoStatus })
    } catch {
      carregar() // reverte se falhar
    }
  }

  const abrirLead = (l) => { setSelected(l); setUpdStatus(l.status); setUpdNota(l.nota || '') }

  const salvar = async () => {
    setSaving(true)
    try {
      await leadsApi.atualizarStatus(selected.id, { status: updStatus, nota: updNota })
      setSelected(null)
      carregar()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>
      ⏳ Carregando pipeline...
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap'); * {box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>🤝 CRM — Pipeline</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>{leads.length} leads · Arraste para mover entre etapas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {COLUNAS.map(col => {
            const n = porStatus(col.id).length
            if (!n) return null
            return <span key={col.id} style={{ padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700, color: col.cor, background: `${col.cor}15`, border: `1px solid ${col.cor}30` }}>{col.icone} {n}</span>
          })}
        </div>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, minHeight: 'calc(100vh - 200px)' }}>
        {COLUNAS.map(col => {
          const items = porStatus(col.id)
          const isOver = dragOver === col.id
          return (
            <div key={col.id}
              style={{ flexShrink: 0, width: 220, display: 'flex', flexDirection: 'column' }}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => onDrop(e, col.id)}>

              {/* Cabeçalho coluna */}
              <div style={{
                padding: '12px 14px', borderRadius: '12px 12px 0 0',
                background: isOver ? `${col.cor}20` : C.surface,
                border: `1px solid ${isOver ? col.cor : C.border}`,
                borderBottom: 'none',
                transition: 'all .2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: col.cor }}>{col.icone} {col.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: col.cor, background: `${col.cor}20`, padding: '2px 8px', borderRadius: 100 }}>{items.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div style={{
                flex: 1, padding: 8, borderRadius: '0 0 12px 12px',
                background: isOver ? `${col.cor}08` : 'rgba(14,20,32,0.5)',
                border: `1px solid ${isOver ? col.cor : C.border}`,
                borderTop: 'none', minHeight: 120,
                transition: 'all .2s'
              }}>
                {items.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'rgba(136,146,164,0.3)', fontSize: 12, marginTop: 8, border: `2px dashed rgba(255,255,255,0.05)`, borderRadius: 10 }}>
                    Solte aqui
                  </div>
                )}
                {items.map(lead => (
                  <div key={lead.id}
                    draggable
                    onDragStart={e => onDragStart(e, lead)}
                    onDragEnd={() => { setDragging(null); setDragOver(null) }}
                    onClick={() => abrirLead(lead)}
                    style={{
                      background: dragging?.id === lead.id ? `${col.cor}20` : C.surface,
                      border: `1px solid ${dragging?.id === lead.id ? col.cor : C.border}`,
                      borderRadius: 10, padding: 12, marginBottom: 8, cursor: 'grab',
                      transition: 'all .15s', opacity: dragging?.id === lead.id ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = col.cor; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { if (dragging?.id !== lead.id) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none' } }}>

                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: C.text }}>{lead.nome || '—'}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{lead.empresa || '—'}</div>

                    {lead.cargo && (
                      <div style={{ fontSize: 11, color: 'rgba(136,146,164,0.7)', marginBottom: 6 }}>{lead.cargo}</div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {lead.cidade && <span style={{ fontSize: 10, color: C.muted }}>📍 {lead.cidade}</span>}
                      {lead.score > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: col.cor, background: `${col.cor}15`, padding: '2px 6px', borderRadius: 4 }}>
                          ⭐ {lead.score}
                        </span>
                      )}
                    </div>

                    {lead.data_ultimo_contato && (
                      <div style={{ fontSize: 10, color: 'rgba(136,146,164,0.5)', marginTop: 6 }}>
                        Último: {new Date(lead.data_ultimo_contato).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Lead */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{selected.nome}</h3>
                <p style={{ color: C.muted, fontSize: 13 }}>{selected.cargo} · {selected.empresa}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[['E-mail', selected.email], ['WhatsApp', selected.whatsapp || selected.telefone], ['Cidade', `${selected.cidade || ''}${selected.estado ? ` / ${selected.estado}` : ''}`], ['Nicho', selected.nicho]].map(([k, v]) => v ? (
                <div key={k} style={{ background: C.surface2, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ) : null)}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Mover para etapa</label>
              <select style={{ width: '100%', padding: '10px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                value={updStatus} onChange={e => setUpdStatus(e.target.value)}>
                {COLUNAS.map(c => <option key={c.id} value={c.id}>{c.icone} {c.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Nota</label>
              <textarea style={{ width: '100%', padding: '10px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: 'inherit', minHeight: 80, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Anotações..." value={updNota} onChange={e => setUpdNota(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSelected(null)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: 'pointer', fontSize: 13 }}>Fechar</button>
              <button onClick={salvar} disabled={saving} style={{ flex: 1, padding: '10px', background: C.accent, border: 'none', borderRadius: 10, color: C.surface, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

            {(selected.whatsapp || selected.telefone) && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <a href={`https://wa.me/55${(selected.whatsapp || selected.telefone).replace(/\D/g, '')}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 8, color: '#25D366', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  💬 WhatsApp
                </a>
                {selected.linkedin && (
                  <a href={selected.linkedin} target="_blank" rel="noreferrer" style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.2)', borderRadius: 8, color: '#0A66C2', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                    LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
