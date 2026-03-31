// ══════════════════════════════════════════════════════════════
// FlowOS – Prospeccao.jsx
// Busca de potenciais clientes e fornecedores
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { prospeccaoApi } from '../services/api'

const C = {
  bg:'#080C14', surface:'#0E1420', surface2:'#141A28',
  border:'rgba(255,255,255,0.07)', text:'#F0F4FF', muted:'#8892A4',
  accent:'#00E5FF', purple:'#7C3AED', green:'#10B981',
  yellow:'#F59E0B', red:'#EF4444'
}

const TIPOS_BADGE = {
  cliente:     { cor: C.accent,  label: 'Cliente' },
  fornecedor:  { cor: C.purple,  label: 'Fornecedor' }
}
const STATUS_BADGE = {
  novo:        { cor: C.accent,  label: 'Novo' },
  contatado:   { cor: C.yellow,  label: 'Contatado' },
  qualificado: { cor: C.green,   label: 'Qualificado' },
  descartado:  { cor: C.red,     label: 'Descartado' }
}

function Badge({ config }) {
  if (!config) return null
  return (
    <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
      color: config.cor, background: `${config.cor}18`, border: `1px solid ${config.cor}30` }}>
      {config.label}
    </span>
  )
}

export default function Prospeccao() {
  const [aba, setAba]           = useState('lista')    // 'lista' | 'buscar'
  const [tipo, setTipo]         = useState('cliente')  // filtro
  const [prospects, setProspects] = useState([])
  const [total, setTotal]       = useState(0)
  const [busca, setBusca]       = useState('')
  const [loading, setLoading]   = useState(false)

  // ── Busca por CNPJ ────────────────────────────────────────
  const [cnpj, setCnpj]         = useState('')
  const [resultado, setResultado] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [tipoSalvar, setTipoSalvar] = useState('cliente')
  const [obs, setObs]           = useState('')

  // ── Modal detalhe ─────────────────────────────────────────
  const [selecionado, setSelecionado] = useState(null)
  const [novoStatus, setNovoStatus]   = useState('')

  const carregarLista = async () => {
    setLoading(true)
    try {
      const p = await prospeccaoApi.listar({ tipo: tipo !== 'todos' ? tipo : undefined, busca })
      setProspects(p.prospects || [])
      setTotal(p.total || 0)
    } catch { setProspects([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { carregarLista() }, [tipo, busca])

  const buscarCNPJ = async () => {
    const c = cnpj.replace(/\D/g, '')
    if (c.length !== 14) { setErroBusca('Digite um CNPJ válido com 14 dígitos.'); return }
    setErroBusca(''); setResultado(null); setBuscando(true)
    try {
      const r = await prospeccaoApi.consultarCNPJ(c)
      setResultado(r)
    } catch (err) {
      setErroBusca(err.message)
    } finally { setBuscando(false) }
  }

  const salvarProspect = async () => {
    if (!resultado) return
    setSalvando(true)
    try {
      await prospeccaoApi.salvar({
        tipo: tipoSalvar,
        razao_social: resultado.razao_social,
        nome_fantasia: resultado.nome_fantasia,
        cnpj: resultado.cnpj,
        email: resultado.email,
        telefone: resultado.telefone,
        atividade: resultado.atividade,
        uf: resultado.endereco?.uf,
        municipio: resultado.endereco?.municipio,
        porte: resultado.porte,
        observacoes: obs
      })
      setResultado(null); setCnpj(''); setObs('')
      setAba('lista'); carregarLista()
    } catch (err) {
      alert(err.message)
    } finally { setSalvando(false) }
  }

  const atualizarStatus = async (id, status) => {
    await prospeccaoApi.atualizar(id, { status })
    carregarLista()
    if (selecionado?.id === id) setSelecionado(p => ({ ...p, status }))
  }

  const remover = async (id) => {
    if (!confirm('Remover este prospect?')) return
    await prospeccaoApi.remover(id)
    setSelecionado(null); carregarLista()
  }

  const inp = { width: '100%', padding: '10px 14px', background: C.surface2,
    border: `1px solid ${C.border}`, borderRadius: 10, color: C.text,
    fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap');
        input:focus,select:focus,textarea:focus { border-color: #00E5FF !important; }
        input::placeholder,textarea::placeholder { color: #4A5568; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>
          🔍 Prospecção
        </h1>
        <p style={{ color:C.muted, fontSize:14 }}>
          Encontre potenciais clientes e fornecedores pelo CNPJ
        </p>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[['lista','📋 Minha lista'],['buscar','🔍 Buscar empresa']].map(([v,l]) => (
          <button key={v} onClick={() => setAba(v)}
            style={{ padding:'9px 20px', borderRadius:10, border:'none', cursor:'pointer',
              fontWeight:600, fontSize:13, fontFamily:'inherit',
              background: aba===v ? C.accent : C.surface2,
              color: aba===v ? '#080C14' : C.muted }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── ABA: BUSCAR ───────────────────────────────────── */}
      {aba === 'buscar' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

          {/* Busca por CNPJ */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:15, color:C.accent, marginBottom:16 }}>
              Consultar CNPJ
            </div>
            <label style={{ fontSize:13, color:C.muted, display:'block', marginBottom:6 }}>CNPJ</label>
            <input style={inp} placeholder="00.000.000/0000-00" value={cnpj}
              onChange={e => setCnpj(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarCNPJ()} />
            {erroBusca && <p style={{ fontSize:12, color:C.red, marginTop:6 }}>{erroBusca}</p>}
            <button onClick={buscarCNPJ} disabled={buscando}
              style={{ marginTop:14, width:'100%', padding:'11px', background:`linear-gradient(135deg,${C.accent},#00B8CC)`,
                border:'none', borderRadius:10, color:'#080C14', fontWeight:700, fontSize:14,
                cursor:'pointer', fontFamily:'inherit', opacity: buscando ? 0.6 : 1 }}>
              {buscando ? 'Consultando...' : '🔍 Consultar'}
            </button>
          </div>

          {/* Resultado */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28 }}>
            {!resultado ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:C.muted }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🏢</div>
                <p style={{ fontSize:13 }}>Digite um CNPJ e clique em Consultar</p>
              </div>
            ) : (
              <>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:15, marginBottom:4 }}>
                  {resultado.nome_fantasia || resultado.razao_social}
                </div>
                <p style={{ fontSize:12, color:C.muted, marginBottom:16 }}>{resultado.razao_social}</p>

                {[
                  ['CNPJ', resultado.cnpj],
                  ['Situação', resultado.situacao],
                  ['Porte', resultado.porte],
                  ['Atividade', resultado.atividade],
                  ['Cidade', `${resultado.endereco?.municipio || '—'}/${resultado.endereco?.uf || ''}`],
                  ['Telefone', resultado.telefone || '—'],
                  ['E-mail', resultado.email || '—'],
                  ['Abertura', resultado.abertura || '—'],
                ].map(([k,v]) => v && (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0',
                    borderBottom:`1px solid rgba(255,255,255,0.04)`, fontSize:13 }}>
                    <span style={{ color:C.muted }}>{k}</span>
                    <span style={{ color:C.text, fontWeight:500, maxWidth:'55%', textAlign:'right' }}>{v}</span>
                  </div>
                ))}

                <div style={{ marginTop:16, display:'flex', gap:8 }}>
                  <select value={tipoSalvar} onChange={e => setTipoSalvar(e.target.value)}
                    style={{ ...inp, width:'auto', flex:1 }}>
                    <option value="cliente">Cliente</option>
                    <option value="fornecedor">Fornecedor</option>
                  </select>
                </div>
                <textarea placeholder="Observações (opcional)" value={obs}
                  onChange={e => setObs(e.target.value)} rows={2}
                  style={{ ...inp, marginTop:8, resize:'vertical' }} />
                <button onClick={salvarProspect} disabled={salvando}
                  style={{ marginTop:10, width:'100%', padding:'11px',
                    background:`linear-gradient(135deg,${C.green},#059669)`,
                    border:'none', borderRadius:10, color:'#fff', fontWeight:700,
                    fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity: salvando ? 0.6 : 1 }}>
                  {salvando ? 'Salvando...' : '✅ Salvar na minha lista'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ABA: LISTA ───────────────────────────────────── */}
      {aba === 'lista' && (
        <>
          {/* Filtros */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
            {[['todos','Todos'],['cliente','Clientes'],['fornecedor','Fornecedores']].map(([v,l]) => (
              <button key={v} onClick={() => setTipo(v)}
                style={{ padding:'7px 16px', borderRadius:8, border:`1px solid ${tipo===v ? C.accent : C.border}`,
                  background: tipo===v ? `${C.accent}15` : 'transparent',
                  color: tipo===v ? C.accent : C.muted,
                  fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                {l}
              </button>
            ))}
            <input style={{ ...inp, flex:1, minWidth:200, padding:'7px 14px' }}
              placeholder="Buscar por nome ou e-mail..."
              value={busca} onChange={e => setBusca(e.target.value)} />
          </div>

          <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>{total} prospect{total !== 1 ? 's' : ''}</p>

          {loading ? (
            <p style={{ color:C.muted, textAlign:'center', padding:40 }}>Carregando...</p>
          ) : prospects.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
              <p>Nenhum prospect ainda. Use a aba "Buscar empresa" para encontrar e salvar.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {prospects.map(p => (
                <div key={p.id} onClick={() => setSelecionado(p)}
                  style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14,
                    padding:'16px 20px', cursor:'pointer', display:'flex',
                    alignItems:'center', gap:16,
                    transition:'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,229,255,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor=C.border}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>
                      {p.nome_fantasia || p.razao_social}
                    </div>
                    <div style={{ fontSize:12, color:C.muted }}>
                      {p.atividade ? p.atividade.slice(0,60) + (p.atividade.length>60?'…':'') : '—'}
                      {p.municipio && ` · ${p.municipio}/${p.uf}`}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                    <Badge config={TIPOS_BADGE[p.tipo]} />
                    <Badge config={STATUS_BADGE[p.status]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MODAL DETALHE ─────────────────────────────────── */}
      {selecionado && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}
          onClick={e => e.target === e.currentTarget && setSelecionado(null)}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20,
            padding:32, width:'100%', maxWidth:520, maxHeight:'85vh', overflowY:'auto' }}>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:18, marginBottom:4 }}>
                  {selecionado.nome_fantasia || selecionado.razao_social}
                </h2>
                <div style={{ display:'flex', gap:8 }}>
                  <Badge config={TIPOS_BADGE[selecionado.tipo]} />
                  <Badge config={STATUS_BADGE[selecionado.status]} />
                </div>
              </div>
              <button onClick={() => setSelecionado(null)}
                style={{ background:'none', border:'none', color:C.muted, fontSize:20, cursor:'pointer' }}>✕</button>
            </div>

            {[
              ['Razão Social', selecionado.razao_social],
              ['CNPJ', selecionado.cnpj],
              ['Atividade', selecionado.atividade],
              ['Porte', selecionado.porte],
              ['Cidade', selecionado.municipio ? `${selecionado.municipio}/${selecionado.uf}` : null],
              ['Telefone', selecionado.telefone],
              ['E-mail', selecionado.email],
              ['Contato', selecionado.contato_nome ? `${selecionado.contato_nome}${selecionado.contato_cargo ? ' – '+selecionado.contato_cargo : ''}` : null],
            ].filter(([,v]) => v).map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0',
                borderBottom:`1px solid rgba(255,255,255,0.04)`, fontSize:13 }}>
                <span style={{ color:C.muted }}>{k}</span>
                <span style={{ color:C.text, fontWeight:500 }}>{v}</span>
              </div>
            ))}

            {selecionado.observacoes && (
              <div style={{ marginTop:12, padding:'10px 14px', background:C.surface2,
                borderRadius:10, fontSize:13, color:C.muted, lineHeight:1.6 }}>
                {selecionado.observacoes}
              </div>
            )}

            {/* Atualizar status */}
            <div style={{ marginTop:20 }}>
              <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:6 }}>
                Atualizar status
              </label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {Object.entries(STATUS_BADGE).map(([v, cfg]) => (
                  <button key={v}
                    onClick={() => atualizarStatus(selecionado.id, v)}
                    style={{ padding:'6px 14px', borderRadius:8,
                      border:`1px solid ${selecionado.status===v ? cfg.cor : C.border}`,
                      background: selecionado.status===v ? `${cfg.cor}18` : 'transparent',
                      color: selecionado.status===v ? cfg.cor : C.muted,
                      fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => remover(selecionado.id)}
              style={{ marginTop:20, width:'100%', padding:'10px',
                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)',
                borderRadius:10, color:C.red, fontWeight:600, fontSize:13,
                cursor:'pointer', fontFamily:'inherit' }}>
              🗑 Remover da lista
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
