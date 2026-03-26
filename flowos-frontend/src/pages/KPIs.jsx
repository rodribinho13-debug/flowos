// ══════════════════════════════════════════════════════════════
// FlowOS – KPIs.jsx (completo)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { kpisApi } from '../services/api'

const C = {
  bg:      '#080C14', surface: '#0E1420', surface2: '#141A28',
  border:  'rgba(255,255,255,0.07)', text: '#F0F4FF',
  muted:   '#8892A4', accent: '#00E5FF', accent2: '#7C3AED',
  green:   '#10B981', yellow: '#F59E0B', red: '#EF4444',
}

const s = {
  card:    { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 },
  btn:     { padding: '10px 20px', background: C.accent, color: C.bg, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost:{ padding: '9px 18px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  input:   { width: '100%', padding: '11px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  label:   { display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:   { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: '100%', maxWidth: 440 },
}

const UNIDADES = ['R$','%','unidades','leads','clientes','horas','dias']
const ICONES   = ['📊','💰','🎯','📅','📈','👥','⚡','🏆','🔥','💎','📦','🚀']
const CORES    = ['#00E5FF','#7C3AED','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4']

function MiniBar({ historico = [], cor }) {
  if (!historico.length) return null
  const max = Math.max(...historico.map(h => h.valor || 0)) || 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40, marginTop: 12 }}>
      {historico.slice(-8).map((h, i, arr) => (
        <div key={i} style={{
          flex: 1, borderRadius: '3px 3px 0 0', minHeight: 3,
          height: `${(h.valor / max) * 100}%`,
          background: i === arr.length - 1 ? cor : `${cor}44`,
          transition: 'height .4s'
        }} />
      ))}
    </div>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function KPIs() {
  const [kpis,      setKpis]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [modalCriar, setModalCriar] = useState(false)
  const [modalReg,   setModalReg]   = useState(null)  // kpi selecionado

  const [form, setForm] = useState({ nome: '', descricao: '', unidade: 'R$', meta: '', icone: '📊', cor: '#00E5FF' })
  const [reg,  setReg]  = useState({ valor: '', data_referencia: new Date().toISOString().split('T')[0] })

  const carregar = () => {
    setLoading(true)
    kpisApi.listar()
      .then(data => setKpis(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(carregar, [])

  const salvarKPI = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await kpisApi.criar({ ...form, meta: form.meta ? +form.meta : null })
      setModalCriar(false)
      setForm({ nome: '', descricao: '', unidade: 'R$', meta: '', icone: '📊', cor: '#00E5FF' })
      carregar()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const salvarRegistro = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await kpisApi.registrar(modalReg.id, { valor: +reg.valor, data_referencia: reg.data_referencia })
      setModalReg(null)
      setReg({ valor: '', data_referencia: new Date().toISOString().split('T')[0] })
      carregar()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const deletarKPI = async (id) => {
    if (!confirm('Desativar este KPI?')) return
    await kpisApi.deletar(id).then(carregar).catch(e => alert(e.message))
  }

  const fmt = (k) => {
    const v = k.valor ?? 0
    if (k.unidade === 'R$') return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
    if (k.unidade === '%')  return `${Number(v).toFixed(1)}%`
    return `${Number(v).toLocaleString('pt-BR')} ${k.unidade}`
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap'); input:focus,select:focus{border-color:#00E5FF!important;outline:none}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>📊 KPIs</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>Monitore e registre seus indicadores-chave</p>
        </div>
        <button style={s.btn} onClick={() => setModalCriar(true)}>+ Novo KPI</button>
      </div>

      {/* Loading */}
      {loading && <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>⏳ Carregando...</div>}

      {/* Empty */}
      {!loading && kpis.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ color: C.muted, marginBottom: 24 }}>Nenhum KPI criado ainda.</p>
          <button style={s.btn} onClick={() => setModalCriar(true)}>Criar primeiro KPI</button>
        </div>
      )}

      {/* Grid KPIs */}
      {!loading && kpis.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {kpis.map(k => {
            const pct = k.meta > 0 ? Math.min((k.valor / k.meta) * 100, 100) : 0
            const delta = k.variacao
            return (
              <div key={k.id} style={{
                ...s.card, position: 'relative', cursor: 'default',
                transition: 'transform .2s, box-shadow .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>

                {/* Ações */}
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { setModalReg(k); setReg({ valor: '', data_referencia: new Date().toISOString().split('T')[0] }) }}
                    title="Registrar valor"
                    style={{ padding: '4px 10px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 6, color: C.accent, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                    + valor
                  </button>
                  <button onClick={() => deletarKPI(k.id)} title="Desativar"
                    style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, color: C.red, fontSize: 11, cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>

                {/* Conteúdo */}
                <div style={{ fontSize: 28, marginBottom: 12 }}>{k.icone}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>{k.nome}</div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 32, fontWeight: 800, color: k.cor || C.accent }}>
                  {fmt(k)}
                </div>

                {/* Variação */}
                {delta !== undefined && delta !== 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: delta >= 0 ? C.green : C.red, fontWeight: 600 }}>
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs mês anterior
                  </div>
                )}

                {/* Barra de meta */}
                {k.meta > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 4 }}>
                      <span>Meta: {k.unidade === 'R$' ? `R$ ${Number(k.meta).toLocaleString('pt-BR')}` : `${k.meta} ${k.unidade}`}</span>
                      <span style={{ color: pct >= 100 ? C.green : C.text, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 6, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? C.green : k.cor || C.accent, borderRadius: 3, transition: 'width .6s' }} />
                    </div>
                  </div>
                )}

                {/* Mini gráfico histórico */}
                <MiniBar historico={k.historico || []} cor={k.cor || C.accent} />
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Criar KPI */}
      <Modal open={modalCriar} onClose={() => setModalCriar(false)} title="Novo KPI">
        <form onSubmit={salvarKPI}>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Nome *</label>
            <input style={s.input} required placeholder="ex: Faturamento Mensal"
              value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Unidade *</label>
              <select style={s.input} value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Meta</label>
              <input style={s.input} type="number" placeholder="0"
                value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Ícone</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ICONES.map(ic => (
                <button type="button" key={ic} onClick={() => setForm(f => ({ ...f, icone: ic }))}
                  style={{ width: 40, height: 40, fontSize: 20, borderRadius: 10, border: form.icone === ic ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: form.icone === ic ? 'rgba(0,229,255,0.1)' : C.surface2, cursor: 'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={s.label}>Cor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CORES.map(cor => (
                <button type="button" key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                  style={{ width: 32, height: 32, borderRadius: 8, background: cor, border: form.cor === cor ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setModalCriar(false)} style={{ ...s.btnGhost, flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...s.btn, flex: 1, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Salvando...' : 'Criar KPI'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Registrar Valor */}
      <Modal open={!!modalReg} onClose={() => setModalReg(null)} title={`Registrar — ${modalReg?.nome}`}>
        <form onSubmit={salvarRegistro}>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Valor ({modalReg?.unidade})</label>
            <input style={s.input} type="number" step="any" required placeholder="0"
              value={reg.valor} onChange={e => setReg(r => ({ ...r, valor: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={s.label}>Data de referência</label>
            <input style={s.input} type="date"
              value={reg.data_referencia} onChange={e => setReg(r => ({ ...r, data_referencia: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setModalReg(null)} style={{ ...s.btnGhost, flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...s.btn, flex: 1, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
