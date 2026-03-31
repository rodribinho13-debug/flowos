import express from 'express'
import { Parser } from 'json2csv'
import * as XLSX from 'xlsx'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'

const router   = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = path.join(__dirname, '../templates')
const PBIT_PATH     = path.join(TEMPLATES_DIR, 'flowos-template.pbit')

const uploadPbit = multer({
  storage: multer.diskStorage({
    destination: TEMPLATES_DIR,
    filename: (_req, _file, cb) => cb(null, 'flowos-template.pbit')
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.pbit') || file.mimetype === 'application/octet-stream') cb(null, true)
    else cb(new Error('Apenas arquivos .pbit são aceitos'))
  }
})

// ─── Helper: aplica estilo de cabeçalho em uma sheet ────────
function estilizarCabecalho(ws, nCols) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let C = range.s.c; C <= Math.min(range.e.c, nCols - 1); C++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })]
    if (cell) {
      cell.s = {
        font:    { bold: true, color: { rgb: 'FFFFFF' } },
        fill:    { fgColor: { rgb: '0E1420' } },
        alignment: { horizontal: 'center' }
      }
    }
  }
}

// ─── Gerar workbook Power BI ─────────────────────────────────
// GET /export/powerbi-workbook
// Gera Excel multi-abas com TODOS os dados do workspace
// pronto para abrir no Power BI Desktop
// ─────────────────────────────────────────────────────────────
router.get('/powerbi-workbook', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario

    // Busca nome da empresa
    const { data: ws } = await supabase
      .from('workspaces')
      .select('nome, setor, plano')
      .eq('id', workspace_id)
      .single()

    const nomeEmpresa = ws?.nome || 'Empresa'
    const dataExport  = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    // Busca todos os dados em paralelo
    const [leads, lancamentos, kpis, kpiRegistros, funcionarios, oportunidades] = await Promise.all([
      supabase.from('leads').select('*').eq('workspace_id', workspace_id).order('criado_em', { ascending: false }),
      supabase.from('fin_lancamentos').select('*, fin_categorias(nome,tipo), fin_contas(nome)').eq('workspace_id', workspace_id).order('data_competencia', { ascending: false }),
      supabase.from('kpis').select('*').eq('workspace_id', workspace_id),
      supabase.from('kpi_registros').select('*, kpis(nome,modulo,unidade)').eq('workspace_id', workspace_id).order('data_referencia', { ascending: false }),
      supabase.from('rh_funcionarios').select('*').eq('workspace_id', workspace_id).order('nome'),
      supabase.from('oportunidades').select('*, leads(nome,empresa), etapas(nome), pipelines(nome)').eq('workspace_id', workspace_id).order('criado_em', { ascending: false }).catch(() => ({ data: [] }))
    ])

    // Flatten lançamentos (join)
    const lancFlat = (lancamentos.data || []).map(l => ({
      id: l.id, tipo: l.tipo, descricao: l.descricao, valor: l.valor,
      status: l.status, data_competencia: l.data_competencia,
      categoria: l.fin_categorias?.nome || '', conta: l.fin_contas?.nome || '',
      criado_em: l.criado_em
    }))

    // Flatten KPI registros
    const kpiFlat = (kpiRegistros.data || []).map(r => ({
      id: r.id, kpi_nome: r.kpis?.nome || '', modulo: r.kpis?.modulo || '',
      unidade: r.kpis?.unidade || '', valor: r.valor, data_referencia: r.data_referencia
    }))

    // Flatten oportunidades
    const opFlat = (oportunidades.data || []).map(o => ({
      id: o.id, lead: o.leads?.nome || '', empresa: o.leads?.empresa || '',
      pipeline: o.pipelines?.nome || '', etapa: o.etapas?.nome || '',
      status: o.status, valor: o.valor, criado_em: o.criado_em
    }))

    // Monta o workbook
    const wb = XLSX.utils.book_new()

    // ── Aba 1: Capa / Instruções ─────────────────────────────
    const capaData = [
      ['RELATÓRIO POWER BI – ' + nomeEmpresa.toUpperCase()],
      [''],
      ['Empresa',       nomeEmpresa],
      ['Setor',         ws?.setor || '—'],
      ['Data de export', dataExport],
      [''],
      ['ABAS DISPONÍVEIS'],
      ['Leads',         'Todos os leads/contatos do CRM'],
      ['Financeiro',    'Lançamentos de receitas e despesas'],
      ['KPI_Registros', 'Histórico de valores dos KPIs'],
      ['KPIs',          'Cadastro dos indicadores'],
      ['Funcionarios',  'Quadro de funcionários (RH)'],
      ['Oportunidades', 'Pipeline de vendas / CRM'],
      [''],
      ['COMO USAR NO POWER BI'],
      ['1. Abra o Power BI Desktop'],
      ['2. Clique em "Obter Dados" → "Excel"'],
      ['3. Selecione este arquivo'],
      ['4. Marque todas as abas e clique em "Carregar"'],
      ['5. Crie suas visualizações!'],
    ]
    const wsCapa = XLSX.utils.aoa_to_sheet(capaData)
    wsCapa['!cols'] = [{ wch: 22 }, { wch: 50 }]
    wsCapa['A1'].s = { font: { bold: true, sz: 14, color: { rgb: '00E5FF' } } }
    XLSX.utils.book_append_sheet(wb, wsCapa, 'Início')

    // ── Aba 2: Leads ─────────────────────────────────────────
    const wsLeads = XLSX.utils.json_to_sheet(leads.data || [])
    wsLeads['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 20 }]
    estilizarCabecalho(wsLeads, 10)
    XLSX.utils.book_append_sheet(wb, wsLeads, 'Leads')

    // ── Aba 3: Financeiro ────────────────────────────────────
    const wsFinanc = XLSX.utils.json_to_sheet(lancFlat)
    wsFinanc['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 20 }]
    estilizarCabecalho(wsFinanc, 9)
    XLSX.utils.book_append_sheet(wb, wsFinanc, 'Financeiro')

    // ── Aba 4: KPI_Registros ─────────────────────────────────
    const wsKpiReg = XLSX.utils.json_to_sheet(kpiFlat)
    wsKpiReg['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 18 }]
    estilizarCabecalho(wsKpiReg, 6)
    XLSX.utils.book_append_sheet(wb, wsKpiReg, 'KPI_Registros')

    // ── Aba 5: KPIs (cadastro) ───────────────────────────────
    const wsKpis = XLSX.utils.json_to_sheet(kpis.data || [])
    wsKpis['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 14 }]
    estilizarCabecalho(wsKpis, 6)
    XLSX.utils.book_append_sheet(wb, wsKpis, 'KPIs')

    // ── Aba 6: Funcionários ──────────────────────────────────
    const wsFuncs = XLSX.utils.json_to_sheet(funcionarios.data || [])
    wsFuncs['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 15 }]
    estilizarCabecalho(wsFuncs, 10)
    XLSX.utils.book_append_sheet(wb, wsFuncs, 'Funcionarios')

    // ── Aba 7: Oportunidades ─────────────────────────────────
    if (opFlat.length > 0) {
      const wsOp = XLSX.utils.json_to_sheet(opFlat)
      wsOp['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 }]
      estilizarCabecalho(wsOp, 8)
      XLSX.utils.book_append_sheet(wb, wsOp, 'Oportunidades')
    }

    // Gera o buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
    const nomeArquivo = `${nomeEmpresa.replace(/[^a-zA-Z0-9]/g, '_')}_PowerBI_${new Date().toISOString().split('T')[0]}.xlsx`

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`)
    res.send(buffer)
  } catch (err) {
    console.error('[POWERBI-WORKBOOK]', err.message)
    res.status(500).json({ error: err.message })
  }
})

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