// ══════════════════════════════════════════════════════════════
// FlowOS – Financeiro.jsx
// Integrado a /financeiro/* do backend real
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { financeiroApi } from '../services/api'

const STATUS_CORES = { pago: '#10B981', pendente: '#F59E0B', cancelado: '#EF4444' }
const TIPO_CORES   = { receita: '#10B981', despesa: '#EF4444', transferencia: '#8892A4' }

export default function Financeiro() {
  const [aba, setAba]         = useState('lancamentos')
  const [dados, setDados]     = useState([])
  const [dreData, setDreData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [sucesso, setSucesso] = useState('')
  const [modal, setModal]     = useState(false)
  const fileRef               = useRef()

  // Filtros
  const [filtros, setFiltros] = useState({ tipo: '', status: '', page: 1, limit: 50 })
  const [ano, setAno]         = useState(new Date().getFullYear())

  // Form novo lançamento
  const [form, setForm] = useState({
    descricao: '', tipo: 'despesa', valor: '', data_competencia: new Date().toISOString().split('T')[0], status: 'pendente'
  })

  const carregar = async () => {
    setLoading(true); setErro('')
    try {
      if (aba === 'lancamentos') {
        const r = await financeiroApi.lancamentos(filtros)
        setDados(r?.lancamentos || [])
      } else if (aba === 'dre') {
        const r = await financeiroApi.dre(ano)
        setDreData(r)
      }
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [aba, filtros.page, ano])

  const salvarLancamento = async (e) => {
    e.preventDefault(); setLoading(true); setErro('')
    try {
      await financeiroApi.criar({ ...form, valor: parseFloat(form.valor) })
      setSucesso('Lançamento criado!'); setModal(false)
      setForm({ descricao: '', tipo: 'despesa', valor: '', data_competencia: new Date().toISOString().split('T')[0], status: 'pendente' })
      carregar()
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  const importarPlanilha = async (e) => {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    setLoading(true); setErro('')
    try {
      const r = await financeiroApi.importar(arquivo)
      setSucesso(`✅ ${r.processados} lançamentos importados!${r.erros?.length ? ` (${r.erros.length} erros)` : ''}`)
      carregar()
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: '#141A28',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    color: '#F0F4FF', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none'
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: '#F0F4FF' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap'); input:focus,select:focus{border-color:#00E5FF !important}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 2 }}>💰 Financeiro</h1>
          <p style={{ color: '#8892A4', fontSize: 13 }}>Lançamentos, DRE e fluxo de caixa</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => fileRef.current.click()} style={{ padding: '9px 18px', background: '#141A28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F0F4FF', cursor: 'pointer', fontSize: 13 }}>
            📥 Importar Planilha
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={importarPlanilha} style={{ display: 'none' }} />
          <a href={financeiroApi.modeloUrl()} style={{ padding: '9px 18px', background: '#141A28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#8892A4', cursor: 'pointer', fontSize: 13, textDecoration: 'none' }}>
            📄 Baixar Modelo
          </a>
          <button onClick={() => setModal(true)} style={{
            padding: '9px 18px', background: 'linear-gradient(135deg, #00E5FF, #00B8CC)',
            border: 'none', borderRadius: 8, color: '#080C14', fontWeight: 700, cursor: 'pointer', fontSize: 13
          }}>+ Novo Lançamento</button>
        </div>
      </div>

      {/* Alertas */}
      {erro    && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginBottom: 16 }}>⚠️ {erro}</div>}
      {sucesso && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#6EE7B7', marginBottom: 16 }} onClick={() => setSucesso('')}>✅ {sucesso}</div>}

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, background: '#0E1420', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content', border: '1px solid rgba(255,255,255,0.07)' }}>
        {[['lancamentos','Lançamentos'],['dre','DRE']].map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)} style={{
            padding: '8px 20px', border: 'none', cursor: 'pointer', borderRadius: 8,
            background: aba === k ? '#00E5FF' : 'transparent',
            color: aba === k ? '#080C14' : '#8892A4', fontWeight: 600, fontSize: 13
          }}>{l}</button>
        ))}
      </div>

      {loading && <div style={{ color: '#8892A4', marginBottom: 16, fontSize: 13 }}>⏳ Carregando...</div>}

      {/* ─── LANÇAMENTOS ─── */}
      {aba === 'lancamentos' && (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { key: 'tipo',   label: 'Tipo',   opts: [['','Todos'],['receita','Receita'],['despesa','Despesa']] },
              { key: 'status', label: 'Status', opts: [['','Todos'],['pago','Pago'],['pendente','Pendente'],['cancelado','Cancelado']] },
            ].map(({ key, label, opts }) => (
              <select key={key} value={filtros[key]} onChange={e => setFiltros(p => ({ ...p, [key]: e.target.value, page: 1 }))}
                style={{ ...inputStyle, width: 140 }}>
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <button onClick={carregar} style={{ padding: '10px 20px', background: '#141A28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F0F4FF', cursor: 'pointer', fontSize: 13 }}>🔄 Atualizar</button>
          </div>

          {/* Tabela */}
          <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Data','Descrição','Tipo','Valor','Status'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#8892A4', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#8892A4' }}>Nenhum lançamento encontrado</td></tr>
                ) : dados.map((l, i) => (
                  <tr key={l.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: '#8892A4' }}>
                      {l.data_competencia ? new Date(l.data_competencia).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{l.descricao || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: `${TIPO_CORES[l.tipo]}22`, color: TIPO_CORES[l.tipo], padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600 }}>{l.tipo}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: l.tipo === 'receita' ? '#10B981' : '#EF4444', fontFamily: "'Syne',sans-serif" }}>
                      {l.tipo === 'receita' ? '+' : '-'} R$ {Number(l.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: `${STATUS_CORES[l.status]}22`, color: STATUS_CORES[l.status], padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600 }}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
            {[filtros.page - 1, filtros.page, filtros.page + 1].filter(p => p > 0).map(p => (
              <button key={p} onClick={() => setFiltros(f => ({ ...f, page: p }))} style={{
                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: p === filtros.page ? '#00E5FF' : '#141A28',
                color: p === filtros.page ? '#080C14' : '#8892A4', fontSize: 13
              }}>{p}</button>
            ))}
          </div>
        </>
      )}

      {/* ─── DRE ─── */}
      {aba === 'dre' && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <select value={ano} onChange={e => setAno(e.target.value)} style={{ ...inputStyle, width: 120 }}>
              {[2023, 2024, 2025].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {dreData?.analise_ia && (
              <div style={{ fontSize: 13, color: '#8892A4', background: 'rgba(0,229,255,0.05)', padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(0,229,255,0.1)', flex: 1 }}>
                🤖 {dreData.analise_ia}
              </div>
            )}
          </div>

          {dreData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { l: 'Receitas', v: dreData.totais?.receitas, c: '#10B981' },
                { l: 'Despesas', v: dreData.totais?.despesas, c: '#EF4444' },
                { l: 'Resultado', v: dreData.totais?.resultado, c: dreData.totais?.resultado >= 0 ? '#10B981' : '#EF4444' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 12, color: '#8892A4', marginBottom: 8 }}>{l}</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: c }}>
                    R$ {Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {dreData.totais?.margem && l === 'Resultado' && (
                    <div style={{ fontSize: 11, color: '#8892A4', marginTop: 4 }}>Margem: {dreData.totais.margem}%</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#8892A4', fontWeight: 600, fontSize: 11 }}>CATEGORIA</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#8892A4', fontWeight: 600, fontSize: 11 }}>TIPO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#8892A4', fontWeight: 600, fontSize: 11 }}>REALIZADO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#8892A4', fontWeight: 600, fontSize: 11 }}>PREVISTO</th>
                </tr>
              </thead>
              <tbody>
                {(dreData?.dre || []).map((linha, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px' }}>{linha.categoria}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: TIPO_CORES[linha.tipo] || '#8892A4', fontSize: 11, fontWeight: 600 }}>{linha.tipo}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: linha.tipo === 'receita' ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                      R$ {Number(linha.total_realizado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#8892A4' }}>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── Modal Novo Lançamento ─── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 36, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800 }}>Novo Lançamento</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#8892A4', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <form onSubmit={salvarLancamento} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8892A4', display: 'block', marginBottom: 6 }}>Descrição</label>
                <input required style={inputStyle} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Venda produto X" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#8892A4', display: 'block', marginBottom: 6 }}>Tipo</label>
                  <select style={inputStyle} value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8892A4', display: 'block', marginBottom: 6 }}>Valor (R$)</label>
                  <input required type="number" step="0.01" min="0" style={inputStyle} value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#8892A4', display: 'block', marginBottom: 6 }}>Data</label>
                  <input required type="date" style={inputStyle} value={form.data_competencia} onChange={e => setForm(p => ({ ...p, data_competencia: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8892A4', display: 'block', marginBottom: 6 }}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, padding: 12, background: '#141A28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#8892A4', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: 12, background: 'linear-gradient(135deg, #00E5FF, #00B8CC)', border: 'none', borderRadius: 8, color: '#080C14', fontWeight: 700, cursor: 'pointer' }}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
