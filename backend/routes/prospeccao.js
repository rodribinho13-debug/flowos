// ══════════════════════════════════════════════════════════════
// FlowOS – routes/prospeccao.js
// Busca de potenciais clientes e fornecedores
// Usa BrasilAPI (gratuita, sem chave) + Apollo.io (opcional)
// ══════════════════════════════════════════════════════════════
import express  from 'express'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'

const router = express.Router()

// ─── Busca empresa por CNPJ (BrasilAPI – gratuita) ───────────
router.get('/cnpj/:cnpj', autenticar, async (req, res) => {
  try {
    const cnpj = req.params.cnpj.replace(/\D/g, '')
    if (cnpj.length !== 14) return res.status(400).json({ error: 'CNPJ inválido.' })

    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: AbortSignal.timeout(8000)
    })
    if (!r.ok) return res.status(404).json({ error: 'CNPJ não encontrado.' })

    const d = await r.json()
    res.json({
      cnpj:          d.cnpj,
      razao_social:  d.razao_social,
      nome_fantasia: d.nome_fantasia || '',
      situacao:      d.descricao_situacao_cadastral,
      porte:         d.descricao_porte,
      natureza:      d.natureza_juridica,
      atividade:     d.cnae_fiscal_descricao,
      cnae:          d.cnae_fiscal,
      abertura:      d.data_inicio_atividade,
      email:         d.email || '',
      telefone:      d.ddd_telefone_1 ? `(${d.ddd_telefone_1}) ${d.telefone_1}` : '',
      endereco: {
        logradouro: d.logradouro, numero: d.numero, complemento: d.complemento,
        bairro: d.bairro, municipio: d.municipio, uf: d.uf, cep: d.cep
      }
    })
  } catch (err) {
    if (err.name === 'TimeoutError') return res.status(408).json({ error: 'BrasilAPI não respondeu. Tente novamente.' })
    res.status(500).json({ error: err.message })
  }
})

// ─── Busca empresas por setor/CNAE (BrasilAPI) ───────────────
router.get('/buscar-cnae', autenticar, async (req, res) => {
  try {
    const { termo } = req.query
    if (!termo || termo.length < 3) return res.status(400).json({ error: 'Informe ao menos 3 caracteres.' })

    const r = await fetch(
      `https://brasilapi.com.br/api/cnae/v1?search=${encodeURIComponent(termo)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const data = r.ok ? await r.json() : []
    res.json(Array.isArray(data) ? data.slice(0, 20) : [])
  } catch {
    res.json([])
  }
})

// ─── Listar prospects salvos ──────────────────────────────────
router.get('/', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { tipo, status, busca, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let q = supabase
      .from('prospects')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspace_id)
      .order('criado_em', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tipo)   q = q.eq('tipo', tipo)      // 'cliente' | 'fornecedor'
    if (status) q = q.eq('status', status)  // 'novo' | 'contatado' | 'qualificado' | 'descartado'
    if (busca)  q = q.or(`razao_social.ilike.%${busca}%,nome_fantasia.ilike.%${busca}%,email.ilike.%${busca}%`)

    const { data, count, error } = await q
    if (error) throw error
    res.json({ prospects: data, total: count, page: +page, limit: +limit })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── Salvar prospect ──────────────────────────────────────────
router.post('/', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { tipo, razao_social, nome_fantasia, cnpj, email, telefone,
            contato_nome, contato_cargo, atividade, uf, municipio,
            porte, observacoes } = req.body

    if (!razao_social || !tipo)
      return res.status(400).json({ error: 'Razão social e tipo são obrigatórios.' })

    // Evita duplicata de CNPJ no mesmo workspace
    if (cnpj) {
      const { data: existe } = await supabase
        .from('prospects').select('id').eq('workspace_id', workspace_id)
        .eq('cnpj', cnpj.replace(/\D/g, '')).maybeSingle()
      if (existe) return res.status(409).json({ error: 'Este CNPJ já está na sua lista.' })
    }

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        workspace_id, tipo, razao_social, nome_fantasia, cnpj: cnpj?.replace(/\D/g, ''),
        email, telefone, contato_nome, contato_cargo, atividade, uf, municipio,
        porte, observacoes, status: 'novo'
      })
      .select().single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── Atualizar prospect (status, observações, contato) ────────
router.patch('/:id', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const campos = ['status', 'observacoes', 'contato_nome', 'contato_cargo', 'email', 'telefone']
    const update = Object.fromEntries(campos.filter(c => req.body[c] !== undefined).map(c => [c, req.body[c]]))

    const { data, error } = await supabase
      .from('prospects').update(update)
      .eq('id', req.params.id).eq('workspace_id', workspace_id)
      .select().single()

    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── Remover prospect ─────────────────────────────────────────
router.delete('/:id', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { error } = await supabase
      .from('prospects').delete()
      .eq('id', req.params.id).eq('workspace_id', workspace_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
