// ══════════════════════════════════════════════════════════════
// FlowOS – pages/Login.jsx  (versão corrigida)
// ══════════════════════════════════════════════════════════════
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'   // ← nome correto (não "api")

export default function Login() {
  const navigate = useNavigate()

  const [aba,           setAba]          = useState('login')   // 'login' | 'cadastro'
  const [loading,       setLoading]       = useState(false)
  const [erro,          setErro]          = useState('')

  // campos login
  const [email,  setEmail]  = useState('')
  const [senha,  setSenha]  = useState('')
  const [showSenha, setShowSenha] = useState(false)

  // campos cadastro
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [setor,       setSetor]       = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [emailCad,    setEmailCad]    = useState('')
  const [senhaCad,    setSenhaCad]    = useState('')
  const [showSenhaCad, setShowSenhaCad] = useState(false)

  // ── Login ────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await authApi.login(email, senha)
      // authApi.login já salva token+usuário no localStorage via api.js
      navigate('/dashboard')        // ← navigate DENTRO do try, depois do await
    } catch (err) {
      setErro(err.message || 'E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  // ── Cadastro ─────────────────────────────────────────────
  const handleCadastro = async (e) => {
    e.preventDefault()
    setErro('')
    if (senhaCad.length < 6) {
      setErro('A senha precisa ter ao menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      await authApi.cadastro({
        nome_empresa: nomeEmpresa,
        setor,
        nome:  nomeUsuario,
        email: emailCad,
        senha: senhaCad
      })
      navigate('/dashboard')        // ← navigate DENTRO do try
    } catch (err) {
      setErro(err.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  /* ──────────── estilos inline (sem depender de CSS externo) ────────────── */
  const s = {
    page:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080C14', fontFamily: "'DM Sans', sans-serif", padding: 16 },
    card:    { width: '100%', maxWidth: 420, background: '#0E1420', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 40 },
    logo:    { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 28 },
    logoBox: { width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#00E5FF,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#080C14' },
    logoTxt: { fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, background: 'linear-gradient(135deg,#00E5FF,#7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    tabs:    { display: 'flex', background: '#141A28', borderRadius: 10, padding: 4, marginBottom: 28 },
    tab:     (active) => ({ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: "'DM Sans',sans-serif", transition: 'all .2s', background: active ? '#00E5FF' : 'transparent', color: active ? '#080C14' : '#8892A4' }),
    label:   { display: 'block', fontSize: 13, color: '#8892A4', marginBottom: 6, fontWeight: 500 },
    row:     { position: 'relative', marginBottom: 16 },
    input:   { width: '100%', padding: '12px 16px', background: '#141A28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#F0F4FF', fontSize: 15, fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box' },
    inputPw: { width: '100%', padding: '12px 44px 12px 16px', background: '#141A28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#F0F4FF', fontSize: 15, fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box' },
    eye:     { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8892A4', fontSize: 16, padding: 0 },
    btn:     { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#00E5FF,#00B8CC)', color: '#080C14', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', marginTop: 8, opacity: loading ? 0.6 : 1 },
    erro:    { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#FCA5A5', fontSize: 13, marginBottom: 16 },
    sep:     { marginBottom: 16 },
  }

  return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;700&display=swap'); input:focus { border-color: #00E5FF !important; } input::placeholder { color: #4A5568; }`}</style>

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>
          <div style={s.logoBox}>F</div>
          <span style={s.logoTxt}>FlowOS</span>
        </div>

        {/* Abas */}
        <div style={s.tabs}>
          <button style={s.tab(aba === 'login')}    onClick={() => { setAba('login');    setErro('') }}>Entrar</button>
          <button style={s.tab(aba === 'cadastro')} onClick={() => { setAba('cadastro'); setErro('') }}>Criar conta</button>
        </div>

        {/* Erro */}
        {erro && <div style={s.erro}>⚠️ {erro}</div>}

        {/* ── FORMULÁRIO LOGIN ── */}
        {aba === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={s.sep}>
              <label style={s.label}>E-mail</label>
              <div style={s.row}>
                <input style={s.input} type="email" placeholder="seu@email.com" required
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div style={s.sep}>
              <label style={s.label}>Senha</label>
              <div style={s.row}>
                <input style={s.inputPw} type={showSenha ? 'text' : 'password'} placeholder="••••••••" required
                  value={senha} onChange={e => setSenha(e.target.value)} />
                <button type="button" style={s.eye} onClick={() => setShowSenha(v => !v)}>
                  {showSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar →'}
            </button>

            <p style={{ textAlign: 'center', color: '#4A5568', fontSize: 12, marginTop: 16 }}>
              🔒 Dados protegidos com JWT + bcrypt
            </p>
          </form>
        )}

        {/* ── FORMULÁRIO CADASTRO ── */}
        {aba === 'cadastro' && (
          <form onSubmit={handleCadastro}>
            <div style={s.sep}>
              <label style={s.label}>Nome da empresa *</label>
              <div style={s.row}>
                <input style={s.input} type="text" placeholder="Ex: Minha Empresa Ltda" required
                  value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} />
              </div>
            </div>

            <div style={s.sep}>
              <label style={s.label}>Setor</label>
              <div style={s.row}>
                <input style={s.input} type="text" placeholder="Ex: Tecnologia, Imobiliária, Saúde..."
                  value={setor} onChange={e => setSetor(e.target.value)} />
              </div>
            </div>

            <div style={s.sep}>
              <label style={s.label}>Seu nome *</label>
              <div style={s.row}>
                <input style={s.input} type="text" placeholder="João Silva" required
                  value={nomeUsuario} onChange={e => setNomeUsuario(e.target.value)} />
              </div>
            </div>

            <div style={s.sep}>
              <label style={s.label}>E-mail *</label>
              <div style={s.row}>
                <input style={s.input} type="email" placeholder="seu@email.com" required
                  value={emailCad} onChange={e => setEmailCad(e.target.value)} />
              </div>
            </div>

            <div style={s.sep}>
              <label style={s.label}>Senha * (mínimo 6 caracteres)</label>
              <div style={s.row}>
                <input style={s.inputPw} type={showSenhaCad ? 'text' : 'password'} placeholder="••••••••" required
                  value={senhaCad} onChange={e => setSenhaCad(e.target.value)} />
                <button type="button" style={s.eye} onClick={() => setShowSenhaCad(v => !v)}>
                  {showSenhaCad ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta grátis →'}
            </button>

            <p style={{ textAlign: 'center', color: '#4A5568', fontSize: 12, marginTop: 16 }}>
              Ao criar sua conta, você concorda com os Termos de Uso
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
