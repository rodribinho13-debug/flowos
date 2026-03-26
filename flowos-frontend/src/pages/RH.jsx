// ══════════════════════════════════════════════════════════════
// FlowOS – RH.jsx
// Integrado a /rh/* do backend real
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { rhApi } from '../services/api'

export default function RH() {
  const [aba, setAba]         = useState('funcionarios')
  const [lista, setLista]     = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [sucesso, setSucesso] = useState('')
  const [modal, setModal]     = useState(false)

  const [form, setForm] = useState({
    nome: '', cpf: '', email: '', cargo: '', departamento: '',
    data_admissao: new Date().toISOString().split('T')[0],
    salario_base: '', tipo_contrato: 'clt', regime: '44h'
  })

  const [folha, setFolha] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear(), resultado: null })

  const carregar = async () => {
    setLoading(true); setErro('')
    try {
      const r = await rhApi.funcionarios()
      setLista(r || [])
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const salvar = async (e) => {
    e.preventDefault(); setLoading(true); setErro('')
    try {
      await rhApi.criar({ ...form, salario_base: parseFloat(form.salario_base) })
      setSucesso('Funcionário cadastrado!')
      setModal(false)
      setForm({ nome: '', cpf: '', email: '', cargo: '', departamento: '', data_admissao: new Date().toISOString().split('T')[0], salario_base: '', tipo_contrato: 'clt', regime: '44h' })
      carregar()
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  const calcularFolha = async () => {
    setLoading(true); setErro('')
    try {
      const r = await rhApi.calcularFolha(folha.mes, folha.ano)
      setFolha(p => ({ ...p, resultado: r }))
      setSucesso(`Folha calculada para ${lista.length} funcionários`)
    } catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }

  const registrarPonto = async (funcionario_id, tipo) => {
    try {
      await rhApi.ponto({ funcionario_id, tipo })
      setSucesso(`Ponto "${tipo}" registrado!`)
    } catch (e) { setErro(e.message) }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: '#141A28',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    color: '#F0F4FF', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none'
  }

  // Totais
  const totalSalarios = lista.reduce((s, f) => s + (f.salario_base || 0), 0)
  const ativos = lista.filter(f => f.status !== 'inativo').length

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: '#F0F4FF' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap'); input:focus,select:focus{border-color:#00E5FF !important}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 2 }}>👥 RH & Pessoas</h1>
          <p style={{ color: '#8892A4', fontSize: 13 }}>Funcionários, ponto eletrônico e folha de pagamento</p>
        </div>
        <button onClick={() => setModal(true)} style={{
          padding: '9px 18px', background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
          border: 'none', borderRadius: 8, color: '#F0F4FF', fontWeight: 700, cursor: 'pointer', fontSize: 13
        }}>+ Novo Funcionário</button>
      </div>

      {/* Alertas */}
      {erro    && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginBottom: 16 }}>⚠️ {erro}</div>}
      {sucesso && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#6EE7B7', marginBottom: 16 }} onClick={() => setSucesso('')}>✅ {sucesso}</div>}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { l: 'Total de Funcionários', v: lista.length, c: '#00E5FF', i: '👥' },
          { l: 'Ativos', v: ativos, c: '#10B981', i: '✅' },
          { l: 'Massa Salarial', v: `R$ ${totalSalarios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, c: '#F59E0B', i: '💰' },
          { l: 'Depts.', v: [...new Set(lista.map(f => f.departamento).filter(Boolean))].length, c: '#8B5CF6', i: '🏢' },
        ].map(({ l, v, c, i }) => (
          <div key={l} style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#8892A4' }}>{l}</span>
              <span style={{ fontSize: 20 }}>{i}</span>
            </div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, background: '#0E1420', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content', border: '1px solid rgba(255,255,255,0.07)' }}>
        {[['funcionarios','Funcionários'],['folha','Folha']].map(([k,l]) => (
          <button key={k} onClick={() => setAba(k)} style={{
            padding: '8px 20px', border: 'none', cursor: 'pointer', borderRadius: 8,
            background: aba === k ? '#7C3AED' : 'transparent',
            color: aba === k ? '#F0F4FF' : '#8892A4', fontWeight: 600, fontSize: 13
          }}>{l}</button>
        ))}
      </div>

      {loading && <div style={{ color: '#8892A4', fontSize: 13, marginBottom: 16 }}>⏳ Carregando...</div>}

      {/* ─── FUNCIONÁRIOS ─── */}
      {aba === 'funcionarios' && (
        <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Nome','Cargo','Departamento','Salário','Tipo','Ponto'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#8892A4', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#8892A4' }}>
                  Nenhum funcionário. Clique em "Novo Funcionário" para começar.
                </td></tr>
              ) : lista.map((f, i) => (
                <tr key={f.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{f.nome}</div>
                    <div style={{ fontSize: 11, color: '#8892A4' }}>{f.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#C4CEDE' }}>{f.cargo || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#C4CEDE' }}>{f.departamento || '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#10B981' }}>
                    R$ {Number(f.salario_base || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{f.tipo_contrato || 'clt'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['entrada','🟢'],['saida','🔴']].map(([tipo, emoji]) => (
                        <button key={tipo} onClick={() => registrarPonto(f.id, tipo)} style={{
                          padding: '4px 10px', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
                          color: '#F0F4FF', cursor: 'pointer', fontSize: 11
                        }}>{emoji} {tipo}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── FOLHA ─── */}
      {aba === 'folha' && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
            <select value={folha.mes} onChange={e => setFolha(p => ({ ...p, mes: +e.target.value }))} style={{ ...inputStyle, width: 160 }}>
              {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={folha.ano} onChange={e => setFolha(p => ({ ...p, ano: +e.target.value }))} style={{ ...inputStyle, width: 100 }}>
              {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={calcularFolha} disabled={loading || lista.length === 0} style={{
              padding: '10px 24px', background: lista.length === 0 ? '#1E2A3A' : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              border: 'none', borderRadius: 8, color: '#F0F4FF', fontWeight: 700, cursor: lista.length === 0 ? 'not-allowed' : 'pointer', fontSize: 13
            }}>
              {loading ? '⏳ Calculando...' : '🧮 Calcular Folha'}
            </button>
          </div>

          {lista.length === 0 && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 20, fontSize: 13, color: '#FCD34D' }}>
              ⚠️ Cadastre funcionários primeiro antes de calcular a folha.
            </div>
          )}

          {folha.resultado?.folhas && (
            <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Folha calculada</span>
                <span style={{ color: '#10B981', fontWeight: 700 }}>Total líquido: R$ {Number(folha.resultado.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Funcionário','Bruto','INSS','IRRF','VT','Líquido'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Funcionário' ? 'left' : 'right', color: '#8892A4', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {folha.resultado.folhas.map((f, i) => {
                    const func = lista.find(fu => fu.id === f.funcionario_id)
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px 16px' }}>{func?.nome || f.funcionario_id}</td>
                        {[f.salario_bruto, f.inss, f.irrf, f.vale_transporte, f.salario_liquido].map((v, j) => (
                          <td key={j} style={{ padding: '12px 16px', textAlign: 'right', color: j === 4 ? '#10B981' : j > 0 && j < 4 ? '#EF4444' : '#F0F4FF', fontWeight: j === 4 ? 700 : 400 }}>
                            R$ {Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal ─── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0E1420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 36, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800 }}>Novo Funcionário</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#8892A4', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'nome', label: 'Nome completo', type: 'text', required: true },
                { key: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00' },
                { key: 'email', label: 'E-mail', type: 'email' },
                { key: 'cargo', label: 'Cargo', type: 'text' },
                { key: 'departamento', label: 'Departamento', type: 'text' },
                { key: 'data_admissao', label: 'Data de admissão', type: 'date', required: true },
                { key: 'salario_base', label: 'Salário base (R$)', type: 'number', required: true },
              ].map(({ key, label, type, required, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#8892A4', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input type={type} required={required} style={inputStyle} placeholder={placeholder}
                    value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#8892A4', display: 'block', marginBottom: 5 }}>Contrato</label>
                  <select style={inputStyle} value={form.tipo_contrato} onChange={e => setForm(p => ({ ...p, tipo_contrato: e.target.value }))}>
                    <option value="clt">CLT</option>
                    <option value="pj">PJ</option>
                    <option value="estagio">Estágio</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8892A4', display: 'block', marginBottom: 5 }}>Regime</label>
                  <select style={inputStyle} value={form.regime} onChange={e => setForm(p => ({ ...p, regime: e.target.value }))}>
                    <option value="44h">44h/semana</option>
                    <option value="40h">40h/semana</option>
                    <option value="36h">36h/semana</option>
                    <option value="parcial">Parcial</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, padding: 12, background: '#141A28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#8892A4', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: 12, background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', border: 'none', borderRadius: 8, color: '#F0F4FF', fontWeight: 700, cursor: 'pointer' }}>
                  {loading ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
