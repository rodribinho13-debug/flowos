// ══════════════════════════════════════════════════════════════
// FlowOS – Relatorios.jsx (completo)
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { exportApi, dashboardApi } from '../services/api'

const C = { surface:'#0E1420', surface2:'#141A28', border:'rgba(255,255,255,0.07)', text:'#F0F4FF', muted:'#8892A4', accent:'#00E5FF', green:'#10B981' }
const s = {
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 },
  btn:  { padding: '10px 20px', background: C.accent, color: '#080C14', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { padding: '9px 16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
}

const ICONES = ['📊','📈','📉','💰','👥','🏭','🔍','📋','🎯','⚙️','📦','🗓️']

function DashboardGenerator() {
  const [nome,    setNome]    = useState('')
  const [senha,   setSenha]   = useState('')
  const [cor,     setCor]     = useState('#0ea5e9')
  const [logo,    setLogo]    = useState('')
  const [secs,    setSecs]    = useState([{ titulo:'Visão Geral', icone:'📊', relatorios:[{nome:'',url:''}] }])
  const [gerando, setGerando] = useState(false)
  const [erro,    setErro]    = useState('')
  const logoRef = useRef()

  const handleLogo = e => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => setLogo(ev.target.result); r.readAsDataURL(f)
  }

  const addSec    = ()         => setSecs(s => [...s, { titulo:'', icone:'📊', relatorios:[{nome:'',url:''}] }])
  const remSec    = (i)        => setSecs(s => s.filter((_,j) => j !== i))
  const updSec    = (i,k,v)    => setSecs(s => s.map((x,j) => j===i ? {...x,[k]:v} : x))
  const addRel    = (i)        => setSecs(s => s.map((x,j) => j!==i ? x : {...x, relatorios:[...x.relatorios,{nome:'',url:''}]}))
  const remRel    = (i,ri)     => setSecs(s => s.map((x,j) => j!==i ? x : {...x, relatorios:x.relatorios.filter((_,k)=>k!==ri)}))
  const updRel    = (i,ri,k,v) => setSecs(s => s.map((x,j) => j!==i ? x : {...x, relatorios:x.relatorios.map((r,k2)=>k2!==ri?r:{...r,[k]:v})}))

  const gerar = async () => {
    setErro('')
    if (!nome.trim())  return setErro('Informe o nome da empresa.')
    if (senha.length < 4) return setErro('Senha deve ter pelo menos 4 caracteres.')
    const secsOk = secs.filter(s => s.titulo.trim() && s.relatorios.some(r => r.nome.trim() && r.url.trim()))
    if (!secsOk.length) return setErro('Adicione pelo menos uma seção com título e um relatório com nome e URL.')
    setGerando(true)
    try {
      await exportApi.gerarDashboardHTML({
        nome_empresa: nome.trim(), senha: senha.trim(), cor_primaria: cor,
        logo_base64: logo || null,
        sections: secsOk.map(s => ({ titulo:s.titulo, icone:s.icone, relatorios:s.relatorios.filter(r=>r.nome.trim()&&r.url.trim()) }))
      })
    } catch(e) { setErro('Erro: ' + e.message) }
    finally { setGerando(false) }
  }

  const inp = (extra={}) => ({ padding:'10px 12px', background:'#080C14', border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit', outline:'none', ...extra })

  return (
    <div style={{ background:'linear-gradient(135deg,rgba(14,165,233,0.06),rgba(124,58,237,0.06))', border:'1px solid rgba(14,165,233,0.2)', borderRadius:16, padding:28, marginBottom:24 }}>
      <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:18, color:C.text, marginBottom:4 }}>🌐 Gerador de Dashboard White-label</div>
      <p style={{ fontSize:13, color:C.muted, margin:'4px 0 20px', lineHeight:1.6 }}>
        Gera um arquivo <code style={{background:C.surface2,padding:'1px 5px',borderRadius:4}}>.html</code> personalizado com senha, logo e cor da empresa — pronto para hospedar ou enviar ao cliente.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:12, marginBottom:16 }}>
        <div>
          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Nome da empresa *</label>
          <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Hydrostec" style={{ ...inp(), width:'100%' }} />
        </div>
        <div>
          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Senha de acesso *</label>
          <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Mínimo 4 caracteres" style={{ ...inp(), width:'100%' }} />
        </div>
        <div>
          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Cor principal</label>
          <div style={{ display:'flex', gap:8 }}>
            <input type="color" value={cor} onChange={e=>setCor(e.target.value)} style={{ width:40, height:38, border:`1px solid ${C.border}`, borderRadius:8, background:'transparent', cursor:'pointer', padding:2 }} />
            <input value={cor} onChange={e=>setCor(e.target.value)} style={{ ...inp(), flex:1, fontFamily:'monospace' }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize:12, color:C.muted, display:'block', marginBottom:5 }}>Logo (opcional)</label>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {logo
              ? <img src={logo} alt="logo" style={{ height:36, maxWidth:72, objectFit:'contain', borderRadius:6, border:`1px solid ${C.border}` }} />
              : <div style={{ width:36, height:36, borderRadius:8, background:cor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#fff', flexShrink:0 }}>{nome.charAt(0).toUpperCase()||'E'}</div>
            }
            <button onClick={()=>logoRef.current.click()} style={{ flex:1, ...inp({ cursor:'pointer', color:C.muted, textAlign:'center' }) }}>
              {logo ? 'Trocar' : 'Enviar logo'}
            </button>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ display:'none' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:13, fontWeight:600, color:C.text }}>Seções e relatórios</span>
          <button onClick={addSec} style={{ padding:'5px 14px', background:'rgba(0,229,255,0.08)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:8, color:C.accent, fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>+ Seção</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {secs.map((sec,si) => (
            <div key={si} style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
              <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
                <select value={sec.icone} onChange={e=>updSec(si,'icone',e.target.value)}
                  style={{ width:48, ...inp({ padding:'8px 4px', textAlign:'center', cursor:'pointer', fontSize:14 }) }}>
                  {ICONES.map(ic=><option key={ic} value={ic}>{ic}</option>)}
                </select>
                <input value={sec.titulo} onChange={e=>updSec(si,'titulo',e.target.value)}
                  placeholder="Nome da seção (ex: Produtividade)"
                  style={{ ...inp(), flex:1 }} />
                {secs.length > 1 && (
                  <button onClick={()=>remSec(si)} style={{ padding:'8px 10px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, color:'#EF4444', cursor:'pointer' }}>✕</button>
                )}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {sec.relatorios.map((rel,ri) => (
                  <div key={ri} style={{ display:'flex', gap:7, alignItems:'center' }}>
                    <input value={rel.nome} onChange={e=>updRel(si,ri,'nome',e.target.value)}
                      placeholder="Nome do relatório"
                      style={{ ...inp({ fontSize:12 }), width:170 }} />
                    <input value={rel.url} onChange={e=>updRel(si,ri,'url',e.target.value)}
                      placeholder="URL Power BI publicado"
                      style={{ ...inp({ fontSize:12, fontFamily:'monospace' }), flex:1 }} />
                    {sec.relatorios.length > 1 && (
                      <button onClick={()=>remRel(si,ri)} style={{ padding:'6px 8px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:6, color:C.muted, cursor:'pointer', fontSize:11 }}>✕</button>
                    )}
                  </div>
                ))}
                <button onClick={()=>addRel(si)} style={{ alignSelf:'flex-start', padding:'4px 12px', background:'transparent', border:`1px dashed ${C.border}`, borderRadius:6, color:C.muted, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>+ relatório</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {erro && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'9px 14px', marginBottom:12, fontSize:12, color:'#EF4444' }}>{erro}</div>}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <p style={{ fontSize:12, color:'#475569', margin:0 }}>O arquivo gerado é autocontido — basta hospedar ou enviar direto ao cliente.</p>
        <button onClick={gerar} disabled={gerando}
          style={{ flexShrink:0, padding:'12px 24px', background:gerando?'rgba(0,229,255,0.2)':`linear-gradient(135deg,${cor},#7C3AED)`, border:'none', borderRadius:10, color:'#fff', fontWeight:800, fontSize:13, cursor:gerando?'not-allowed':'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
          {gerando ? '⏳ Gerando...' : '⬇️ Gerar Dashboard'}
        </button>
      </div>
    </div>
  )
}

const TIPOS = [
  { tipo: 'leads',     label: 'Leads & CRM',  desc: 'Todos os leads com status e histórico',      icone: '🎯' },
  { tipo: 'kpis',      label: 'KPIs',          desc: 'Histórico completo de indicadores',          icone: '📊' },
  { tipo: 'mensagens', label: 'Mensagens',     desc: 'Histórico de mensagens por canal',           icone: '💬' },
  { tipo: 'relatorio', label: 'Relatório Completo', desc: 'Leads + KPIs + Mensagens em abas',      icone: '📋' },
]

export default function Relatorios() {
  const [baixando,    setBaixando]    = useState(null)
  const [gerandoBI,   setGerandoBI]   = useState(false)
  const [resumo,      setResumo]      = useState(null)

  useEffect(() => {
    dashboardApi.get().then(d => setResumo(d)).catch(() => {})
  }, [])

  const baixar = async (tipo, formato) => {
    setBaixando(`${tipo}-${formato}`)
    try {
      await exportApi.baixar(tipo, formato)
    } catch (err) {
      alert('Erro ao exportar: ' + err.message)
    } finally {
      setBaixando(null)
    }
  }

  const gerarWorkbookBI = async () => {
    setGerandoBI(true)
    try {
      await exportApi.baixarWorkbookBI()
    } catch (err) {
      alert('Erro ao gerar arquivo Power BI: ' + err.message)
    } finally {
      setGerandoBI(false)
    }
  }

  const powerbiUrl = (tipo) => exportApi.powerbiUrl(tipo)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>📋 Relatórios & Exportação</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>Exporte dados para Excel, CSV ou conecte ao Power BI</p>
      </div>

      {/* Resumo rápido */}
      {resumo && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Leads total',     valor: resumo.status_leads?.reduce((a,b) => a+b.value,0) || 0,  icone: '🎯' },
            { label: 'Reuniões',        valor: resumo.reunioes_marcadas || 0,                            icone: '📅' },
            { label: 'Msgs enviadas',   valor: resumo.mensagens_hoje || 0,                               icone: '💬' },
          ].map(item => (
            <div key={item.label} style={{ ...s.card, padding: '16px 20px' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icone}</div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: C.accent }}>{item.valor}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Cards de exportação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginBottom: 32 }}>
        {TIPOS.map(({ tipo, label, desc, icone }) => (
          <div key={tipo} style={s.card}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{icone}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>{desc}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={!!baixando}
                onClick={() => baixar(tipo, 'xlsx')}
                style={{ flex: 1, padding: '9px 0', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8, color: C.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: baixando === `${tipo}-xlsx` ? 0.6 : 1 }}>
                {baixando === `${tipo}-xlsx` ? '⏳' : '📊'} Excel
              </button>
              <button
                disabled={!!baixando}
                onClick={() => baixar(tipo, 'csv')}
                style={{ flex: 1, padding: '9px 0', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: baixando === `${tipo}-csv` ? 0.6 : 1 }}>
                {baixando === `${tipo}-csv` ? '⏳' : '📄'} CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botão Power BI Workbook */}
      <div style={{ background: 'linear-gradient(135deg,rgba(0,229,255,0.06),rgba(124,58,237,0.06))', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 16, padding: 28, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 6 }}>
            📊 Gerar arquivo Power BI
          </div>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            Gera um <strong style={{ color: C.text }}>.xlsx</strong> com <strong style={{ color: C.text }}>todas as abas</strong> (Leads, Financeiro, KPIs, RH, Oportunidades) já formatadas e prontas para abrir no Power BI Desktop. Basta clicar em <em>Obter Dados → Excel</em>.
          </p>
        </div>
        <button
          onClick={gerarWorkbookBI}
          disabled={gerandoBI}
          style={{ flexShrink: 0, padding: '14px 28px', background: gerandoBI ? 'rgba(0,229,255,0.2)' : 'linear-gradient(135deg,#00E5FF,#7C3AED)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 14, cursor: gerandoBI ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          {gerandoBI ? '⏳ Gerando...' : '⬇️ Baixar workbook'}
        </button>
      </div>

      {/* Dashboard White-label Generator */}
      <DashboardGenerator />

      {/* Power BI URLs diretas */}
      <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 16, padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 17, color: C.accent, marginBottom: 8 }}>📊 Conectar ao Power BI</div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
          No Power BI Desktop: <strong style={{ color: '#C4CEDE' }}>Obter Dados → Web</strong> → cole a URL abaixo.
          Adicione o header <code style={{ background: C.surface2, padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>Authorization: Bearer &lt;token&gt;</code>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['kpis', 'leads', 'relatorio'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#C4CEDE', background: C.surface2, padding: '10px 14px', borderRadius: 8, overflow: 'auto', whiteSpace: 'nowrap' }}>
                GET {powerbiUrl(t)}
              </code>
              <button onClick={() => navigator.clipboard.writeText(powerbiUrl(t))}
                style={{ ...s.btnGhost, padding: '9px 14px', flexShrink: 0, fontSize: 12 }}>
                Copiar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Instruções */}
      <div style={{ ...s.card, padding: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>📖 Como usar</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['1', 'Clique em "Baixar workbook" para gerar o Excel com todos os dados do seu workspace'],
            ['2', 'Abra o Power BI Desktop → Obter Dados → Excel → selecione o arquivo baixado'],
            ['3', 'Marque todas as abas e clique em Carregar — seus dados já estarão estruturados'],
            ['4', 'Para dados sempre atualizados: use as URLs da API acima com atualização automática a cada 30 min'],
          ].map(([n, txt]) => (
            <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{n}</div>
              <p style={{ fontSize: 13, color: '#C4CEDE', margin: 0, lineHeight: 1.5 }}>{txt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
