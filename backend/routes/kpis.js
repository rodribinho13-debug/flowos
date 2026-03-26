import express from 'express'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'
import { analisarDadosSemana } from '../services/openai.js'

const router = express.Router()

// ─── KPIs ────────────────────────────────────────────────────
router.get('/', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('criado_em', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const payload = { ...req.body, workspace_id }
    const { data, error } = await supabase
      .from('kpis')
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
      .from('kpis')
      .update(req.body)
      .eq('id', id).eq('workspace_id', workspace_id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Registros de KPI ────────────────────────────────────────
router.get('/:kpi_id/registros', autenticar, async (req, res) => {
  try {
    const { kpi_id } = req.params
    const { workspace_id } = req.usuario
    const { inicio, fim, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let q = supabase
      .from('kpi_registros')
      .select('*, kpis(nome, unidade, meta)', { count: 'exact' })
      .eq('kpi_id', kpi_id)
      .eq('workspace_id', workspace_id)
      .order('data_referencia', { ascending: false })
      .range(offset, offset + limit - 1)

    if (inicio) q = q.gte('data_referencia', inicio)
    if (fim)    q = q.lte('data_referencia', fim)

    const { data, count, error } = await q
    if (error) throw error
    res.json({ registros: data, total: count, page: +page, limit: +limit })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:kpi_id/registros', autenticar, async (req, res) => {
  try {
    const { kpi_id } = req.params
    const { workspace_id } = req.usuario
    const payload = { ...req.body, kpi_id, workspace_id }
    const { data, error } = await supabase
      .from('kpi_registros')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Análise IA de KPIs ──────────────────────────────────────
router.get('/:kpi_id/analise-ia', autenticar, async (req, res) => {
  try {
    const { kpi_id } = req.params
    const { workspace_id } = req.usuario
    const { data: kpi, error: kpiError } = await supabase
      .from('kpis')
      .select('*')
      .eq('id', kpi_id)
      .eq('workspace_id', workspace_id)
      .single()
    if (kpiError) throw kpiError

    const { data: registros, error: regError } = await supabase
      .from('kpi_registros')
      .select('valor, data_referencia')
      .eq('kpi_id', kpi_id)
      .eq('workspace_id', workspace_id)
      .order('data_referencia', { ascending: false })
      .limit(7) // Últimos 7 dias ou registros
    if (regError) throw regError

    const dadosParaIA = {
      modulo: kpi.modulo,
      kpi_nome: kpi.nome,
      unidade: kpi.unidade,
      meta: kpi.meta,
      registros: registros.map(r => ({ valor: r.valor, data: r.data_referencia }))
    }

    const analise = await analisarDadosSemana(dadosParaIA)
    res.json(analise)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router