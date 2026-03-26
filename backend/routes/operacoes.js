import express from 'express'
import { Parser } from 'json2csv'
import * as XLSX from 'xlsx'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'

const router = express.Router()

// ─── Exportar para CSV ──────────────────────────────────────
router.get('/csv/:tipo', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { tipo } = req.params
    const { inicio, fim } = req.query

    let query
    let filename = `${tipo}_export.csv`

    switch (tipo) {
      case 'leads':
        query = supabase.from('leads').select('*').eq('workspace_id', workspace_id)
        if (inicio) query = query.gte('criado_em', inicio)
        if (fim) query = query.lte('criado_em', fim)
        break
      case 'lancamentos':
        query = supabase.from('fin_lancamentos').select('*, fin_categorias(nome, tipo), fin_contas(nome)').eq('workspace_id', workspace_id)
        if (inicio) query = query.gte('data_competencia', inicio)
        if (fim) query = query.lte('data_competencia', fim)
        break
      case 'funcionarios':
        query = supabase.from('rh_funcionarios').select('*').eq('workspace_id', workspace_id)
        break
      case 'kpis':
        query = supabase.from('kpi_registros').select('*, kpis(nome, modulo, unidade)').eq('workspace_id', workspace_id)
        if (inicio) query = query.gte('data_referencia', inicio)
        if (fim) query = query.lte('data_referencia', fim)
        break
      default:
        return res.status(400).json({ error: 'Tipo de exportação inválido' })
    }

    const { data, error } = await query
    if (error) throw error

    const json2csvParser = new Parser()
    const csv = json2csvParser.parse(data)

    res.header('Content-Type', 'text/csv')
    res.attachment(filename)
    res.send(csv)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Exportar para Excel ────────────────────────────────────
router.get('/excel/:tipo', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { tipo } = req.params
    const { inicio, fim } = req.query

    let query
    let filename = `${tipo}_export.xlsx`

    switch (tipo) {
      case 'leads':
        query = supabase.from('leads').select('*').eq('workspace_id', workspace_id)
        if (inicio) query = query.gte('criado_em', inicio)
        if (fim) query = query.lte('criado_em', fim)
        break
      case 'lancamentos':
        query = supabase.from('fin_lancamentos').select('*, fin_categorias(nome, tipo), fin_contas(nome)').eq('workspace_id', workspace_id)
        if (inicio) query = query.gte('data_competencia', inicio)
        if (fim) query = query.lte('data_competencia', fim)
        break
      case 'funcionarios':
        query = supabase.from('rh_funcionarios').select('*').eq('workspace_id', workspace_id)
        break
      case 'kpis':
        query = supabase.from('kpi_registros').select('*, kpis(nome, modulo, unidade)').eq('workspace_id', workspace_id)
        if (inicio) query = query.gte('data_referencia', inicio)
        if (fim) query = query.lte('data_referencia', fim)
        break
      default:
        return res.status(400).json({ error: 'Tipo de exportação inválido' })
    }

    const { data, error } = await query
    if (error) throw error

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, tipo.charAt(0).toUpperCase() + tipo.slice(1))
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Endpoint para Power BI (sem autenticação, usa Service Key) ───
router.get('/powerbi/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params
    const { workspace_id } = req.query // Power BI pode passar o ID como query param

    // A autenticação para Power BI é feita via SUPABASE_SERVICE_KEY no header
    // ou pode ser um token JWT específico para BI, mas por simplicidade,
    // vamos usar a service key para acesso a views públicas ou filtradas.
    // Em um ambiente real, você criaria uma RLS mais granular ou um token de BI.

    let query
    switch (tipo) {
      case 'kpis':
        query = supabase.from('vw_kpis_powerbi').select('*')
        break
      case 'leads':
        query = supabase.from('vw_mkt_leads_completo').select('*')
        break
      case 'dre':
        query = supabase.from('vw_fin_dre').select('*')
        break
      case 'fluxo_caixa':
        query = supabase.from('vw_fin_fluxo_caixa').select('*')
        break
      case 'executivo':
        query = supabase.from('vw_executivo_360').select('*')
        break
      case 'estoque':
        query = supabase.from('vw_op_estoque_status').select('*')
        break
      case 'rh_headcount':
        query = supabase.from('vw_rh_headcount').select('*')
        break
      default:
        return res.status(400).json({ error: 'Tipo de Power BI inválido' })
    }

    if (workspace_id) {
      query = query.eq('workspace_id', workspace_id)
    }

    const { data, error } = await query
    if (error) throw error

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router