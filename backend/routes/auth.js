// ══════════════════════════════════════════════════════════════
// FlowOS – routes/auth.js
// Login, Cadastro e middleware autenticar (usado por TODOS os routes)
// ══════════════════════════════════════════════════════════════
import express  from 'express'
import jwt      from 'jsonwebtoken'
import bcrypt   from 'bcryptjs'
import supabase from '../services/supabase.js'

const router     = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'flowos_dev_secret'

// ──────────────────────────────────────────────────────────────
// Cache em memória para autenticar – evita DB hit em toda req
// TTL: 60 s; máx 1000 entradas (previne leak de memória)
// ──────────────────────────────────────────────────────────────
const authCache = new Map()
const AUTH_CACHE_TTL = 60_000   // 60 segundos
const AUTH_CACHE_MAX = 1_000

function cacheGet(id) {
  const entry = authCache.get(id)
  if (!entry) return null
  if (Date.now() - entry.ts > AUTH_CACHE_TTL) { authCache.delete(id); return null }
  return entry.data
}

function cacheSet(id, data) {
  if (authCache.size >= AUTH_CACHE_MAX) {
    // Remove a entrada mais antiga
    authCache.delete(authCache.keys().next().value)
  }
  authCache.set(id, { data, ts: Date.now() })
}

export function invalidarCacheUsuario(id) {
  authCache.delete(id)
}

// ──────────────────────────────────────────────────────────────
// MIDDLEWARE – exportado e usado em TODOS os outros routes
// ──────────────────────────────────────────────────────────────
export async function autenticar(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Token não fornecido' })

    const decoded = jwt.verify(token, JWT_SECRET)

    // Tenta cache antes de ir ao banco
    let usuario = cacheGet(decoded.id)

    if (!usuario) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, workspace_id, perfil, ativo')
        .eq('id', decoded.id)
        .single()

      if (error || !data) return res.status(401).json({ error: 'Usuário não encontrado ou inativo.' })
      usuario = data
      cacheSet(decoded.id, usuario)
    }

    if (usuario.ativo === false)
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo.' })

    req.usuario = { ...decoded, workspace_id: usuario.workspace_id }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expirado.' })
    if (err.name === 'JsonWebTokenError')  return res.status(401).json({ error: 'Token inválido.' })
    res.status(500).json({ error: 'Falha na autenticação.' })
  }
}

// ──────────────────────────────────────────────────────────────
// POST /auth/cadastro
// ──────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post('/cadastro', async (req, res) => {
  let workspace = null
  try {
    const { nome_empresa, setor, nome, senha } = req.body
    const email = (req.body.email || '').toLowerCase().trim()

    if (!nome_empresa || !nome || !email || !senha)
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' })

    if (!EMAIL_REGEX.test(email))
      return res.status(400).json({ error: 'E-mail inválido.' })

    if (senha.length < 6)
      return res.status(400).json({ error: 'A senha precisa ter ao menos 6 caracteres.' })

    // 1. Verificar se e-mail já existe
    const { data: emailExiste } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (emailExiste)
      return res.status(409).json({ error: 'Este e-mail já está em uso.' })

    // 2. Criar Workspace
    const slug = `${nome_empresa.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`
    const { data: ws, error: wsError } = await supabase
      .from('workspaces')
      .insert({ nome: nome_empresa, slug, setor: setor || null })
      .select()
      .single()

    if (wsError) throw wsError
    workspace = ws

    // 3. Criar usuário admin com senha criptografada
    const senhaHash = await bcrypt.hash(senha, 10)
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .insert({
        workspace_id: workspace.id,
        nome,
        email,
        senha: senhaHash,
        perfil: 'admin',
        ativo: true
      })
      .select('id, nome, email, perfil, workspace_id')
      .single()

    if (userError) throw userError

    // 4. JWT
    const token = jwt.sign(
      { id: usuario.id, workspace_id: workspace.id, perfil: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      usuario: { ...usuario, workspace_nome: workspace.nome }
    })
  } catch (err) {
    console.error('[CADASTRO]', err.message)
    // Rollback: remover workspace órfão se criação do usuário falhou
    if (workspace?.id) {
      await supabase.from('workspaces').delete().eq('id', workspace.id).catch(() => {})
    }
    res.status(500).json({ error: 'Erro ao criar conta. Tente novamente.' })
  }
})

// ──────────────────────────────────────────────────────────────
// POST /auth/login
// ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body

    if (!email || !senha)
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' })

    // 1. Buscar usuário com workspace (email normalizado)
    const emailNorm = (email || '').toLowerCase().trim()
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, senha, perfil, workspace_id, ativo, workspaces(nome)')
      .eq('email', emailNorm)
      .maybeSingle()

    if (error || !usuario)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' })

    if (usuario.ativo === false)
      return res.status(401).json({ error: 'Conta desativada. Contate o suporte.' })

    // 2. Verificar senha
    const senhaOk = await bcrypt.compare(senha, usuario.senha || '')
    if (!senhaOk)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' })

    // 3. Atualizar último acesso
    await supabase
      .from('usuarios')
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('id', usuario.id)

    // 4. JWT
    const token = jwt.sign(
      { id: usuario.id, workspace_id: usuario.workspace_id, perfil: usuario.perfil },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const { senha: _s, workspaces, ...dadosLimpos } = usuario
    res.json({
      message: 'Login realizado com sucesso!',
      token,
      usuario: { ...dadosLimpos, workspace_nome: workspaces?.nome }
    })
  } catch (err) {
    console.error('[LOGIN]', err.message)
    res.status(500).json({ error: 'Erro ao realizar login. Tente novamente.' })
  }
})

// ──────────────────────────────────────────────────────────────
// POST /auth/service-token
// Gera token de longa duração (1 ano) para integrações (N8N, webhooks)
// Requer autenticação de admin
// ──────────────────────────────────────────────────────────────
router.post('/service-token', autenticar, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'admin')
      return res.status(403).json({ error: 'Apenas administradores podem gerar tokens de serviço.' })

    const { descricao = 'Token de serviço' } = req.body

    const token = jwt.sign(
      { id: req.usuario.id, workspace_id: req.usuario.workspace_id, perfil: 'service', descricao },
      JWT_SECRET,
      { expiresIn: '365d' }
    )

    res.json({ token, descricao, expira_em: '365 dias' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar token de serviço.' })
  }
})

// ──────────────────────────────────────────────────────────────
// GET /auth/me  – retorna dados do usuário logado
// ──────────────────────────────────────────────────────────────
router.get('/me', autenticar, async (req, res) => {
  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, perfil, workspace_id, workspaces(nome, plano, setor)')
      .eq('id', req.usuario.id)
      .single()

    if (error) throw error
    res.json(usuario)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
