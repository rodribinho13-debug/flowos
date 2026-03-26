import express from 'express'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'
import { gerarMensagemIA } from '../services/openai.js'

const router = express.Router()

// ─── Campanhas de Prospecção ──────────────────────────────────
router.get('/campanhas', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { data, error } = await supabase
      .from('campanhas')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('criado_em', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/campanhas', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const payload = { ...req.body, workspace_id }
    const { data, error } = await supabase
      .from('campanhas')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Leads ───────────────────────────────────────────────────
router.get('/', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { campanha_id, status, busca, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let q = supabase
      .from('leads')
      .select('*, campanhas(nome)', { count: 'exact' })
      .eq('workspace_id', workspace_id)
      .order('criado_em', { ascending: false })
      .range(offset, offset + limit - 1)

    if (campanha_id) q = q.eq('campanha_id', campanha_id)
    if (status)      q = q.eq('status', status)
    if (busca)       q = q.or(`nome.ilike.%${busca}%,empresa.ilike.%${busca}%,email.ilike.%${busca}%`)

    const { data, count, error } = await q
    if (error) throw error
    res.json({ leads: data, total: count, page: +page, limit: +limit })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const payload = { ...req.body, workspace_id }
    const { data, error } = await supabase
      .from('leads')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params
    const { workspace_id } = req.usuario
    const { data, error } = await supabase
      .from('leads')
      .update(req.body)
      .eq('id', id).eq('workspace_id', workspace_id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id/status', autenticar, async (req, res) => {
  try {
    const { id } = req.params
    const { workspace_id } = req.usuario
    const { status } = req.body
    const { data, error } = await supabase
      .from('leads')
      .update({ status, data_ultimo_contato: new Date().toISOString() })
      .eq('id', id).eq('workspace_id', workspace_id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Pipelines e Etapas ──────────────────────────────────────
router.get('/pipelines', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { data, error } = await supabase
      .from('pipelines')
      .select('*, etapas(*)')
      .eq('workspace_id', workspace_id)
      .order('ordem', { foreignTable: 'etapas', ascending: true })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/pipelines', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { nome, etapas } = req.body

    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({ workspace_id, nome })
      .select()
      .single()
    if (pipelineError) throw pipelineError

    if (etapas && etapas.length > 0) {
      const etapasComPipelineId = etapas.map((e, index) => ({
        ...e,
        pipeline_id: pipeline.id,
        ordem: index + 1
      }))
      const { data: novasEtapas, error: etapasError } = await supabase
        .from('etapas')
        .insert(etapasComPipelineId)
        .select()
      if (etapasError) throw etapasError
      pipeline.etapas = novasEtapas
    }
    res.json(pipeline)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Oportunidades ───────────────────────────────────────────
router.get('/oportunidades', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { pipeline_id, etapa_id, status, responsavel_id, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let q = supabase
      .from('oportunidades')
      .select('*, leads(nome, empresa, email), etapas(nome), usuarios(nome)', { count: 'exact' })
      .eq('workspace_id', workspace_id)
      .order('criado_em', { ascending: false })
      .range(offset, offset + limit - 1)

    if (pipeline_id)    q = q.eq('pipeline_id', pipeline_id)
    if (etapa_id)       q = q.eq('etapa_id', etapa_id)
    if (status)         q = q.eq('status', status)
    if (responsavel_id) q = q.eq('responsavel_id', responsavel_id)

    const { data, count, error } = await q
    if (error) throw error
    res.json({ oportunidades: data, total: count, page: +page, limit: +limit })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/oportunidades', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const payload = { ...req.body, workspace_id }
    const { data, error } = await supabase
      .from('oportunidades')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/oportunidades/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params
    const { workspace_id } = req.usuario
    const { data, error } = await supabase
      .from('oportunidades')
      .update(req.body)
      .eq('id', id).eq('workspace_id', workspace_id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router