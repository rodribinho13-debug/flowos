import express  from 'express'
import jwt      from 'jsonwebtoken'
import bcrypt   from 'bcryptjs'
import supabase from '../services/supabase.js'

const router     = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'flowos_dev_secret'

export async function autenticar(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Token não fornecido' })
    const decoded = jwt.verify(token, JWT_SECRET)
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, workspace_id, perfil, ativo')
      .eq('id', decoded.id)
      .single()
    if (error || !usuario || usuario.ativo === false)
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo.' })
    req.usuario = { ...decoded, workspace_id: usuario.workspace_id }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expirado.' })
    if (err.name === 'JsonWebTokenError')  return res.status(401).json({ error: 'Token inválido.' })
    res.status(500).json({ error: 'Falha na autenticação.' })
  }
}

router.post('/cadastro', async (req, res) => {
  try {
    const { nome_empresa, setor, nome, email, senha } = req.body
    if (!nome_empresa || !nome || !email || !senha)
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' })
    if (senha.length < 6)
      return res.status(400).json({ error: 'A senha precisa ter ao menos 6 caracteres.' })

    const { data: emailExiste } = await supabase
      .from('usuarios').select('id').eq('email', email).maybeSingle()
    if (emailExiste)
      return res.status(409).json({ error: 'Este e-mail já está em uso.' })

    // Workspace + hash em paralelo (mais rápido)
    const slug = `${nome_empresa.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`
    const [{ data: workspace, error: wsError }, senhaHash] = await Promise.all([
      supabase.from('workspaces').insert({ nome: nome_empresa, slug, setor: setor || null }).select().single(),
      bcrypt.hash(senha, 10)
    ])
    if (wsError) throw wsError

    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .insert({ workspace_id: workspace.id, nome, email, senha: senhaHash, perfil: 'admin', ativo: true })
      .select('id, nome, email, perfil, workspace_id')
      .single()
    if (userError) throw userError

    const token = jwt.sign(
      { id: usuario.id, workspace_id: workspace.id, perfil: 'admin' },
      JWT_SECRET, { expiresIn: '7d' }
    )
    res.status(201).json({ message: 'Conta criada com sucesso!', token, usuario: { ...usuario, workspace_nome: workspace.nome } })
  } catch (err) {
    console.error('[CADASTRO]', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body
    if (!email || !senha)
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' })
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, senha, perfil, workspace_id, ativo, workspaces(nome)')
      .eq('email', email).maybeSingle()
    if (error || !usuario)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' })
    if (usuario.ativo === false)
      return res.status(401).json({ error: 'Conta desativada. Contate o suporte.' })
    const senhaOk = await bcrypt.compare(senha, usuario.senha || '')
    if (!senhaOk)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' })
    await supabase.from('usuarios').update({ ultimo_acesso: new Date().toISOString() }).eq('id', usuario.id)
    const token = jwt.sign(
      { id: usuario.id, workspace_id: usuario.workspace_id, perfil: usuario.perfil },
      JWT_SECRET, { expiresIn: '7d' }
    )
    const { senha: _s, workspaces, ...dadosLimpos } = usuario
    res.json({ message: 'Login realizado com sucesso!', token, usuario: { ...dadosLimpos, workspace_nome: workspaces?.nome } })
  } catch (err) {
    console.error('[LOGIN]', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/me', autenticar, async (req, res) => {
  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, perfil, workspace_id, workspaces(nome, plano, setor)')
      .eq('id', req.usuario.id).single()
    if (error) throw error
    res.json(usuario)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

