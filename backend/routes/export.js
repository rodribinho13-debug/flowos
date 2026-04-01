import express from 'express'
import { Parser } from 'json2csv'
import * as XLSX from 'xlsx'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import https from 'https'
import http from 'http'
import { fileURLToPath } from 'url'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'

const router   = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = path.join(__dirname, '../templates')
const PBIT_PATH     = path.join(TEMPLATES_DIR, 'flowos-template.pbit')

// ─── Multer para upload de planilha do cliente ───────────────
const uploadPlanilha = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['.xlsx', '.xls', '.csv'].some(e => file.originalname.toLowerCase().endsWith(e))
    ok ? cb(null, true) : cb(new Error('Apenas .xlsx, .xls ou .csv são aceitos'))
  }
})

// ─── Templates disponíveis ───────────────────────────────────
const TEMPLATES_BI = {
  financeiro: {
    label: 'Financeiro',
    descricao: 'DRE, fluxo de caixa, receitas e despesas',
    abas: [
      { nome: 'Lancamentos', colunas: ['data','descricao','categoria','tipo','valor','status','conta'],
        exemplo: [
          { data:'2024-01-05', descricao:'Venda produto X', categoria:'Receita Operacional', tipo:'receita', valor:5000, status:'recebido', conta:'Conta Principal' },
          { data:'2024-01-10', descricao:'Aluguel escritório', categoria:'Despesa Fixa', tipo:'despesa', valor:2000, status:'pago', conta:'Conta Principal' }
        ]
      },
      { nome: 'Categorias', colunas: ['nome','tipo','grupo'],
        exemplo: [
          { nome:'Receita Operacional', tipo:'receita', grupo:'Operacional' },
          { nome:'Despesa Fixa', tipo:'despesa', grupo:'Administrativo' }
        ]
      }
    ]
  },
  vendas: {
    label: 'Vendas & CRM',
    descricao: 'Leads, oportunidades, funil de vendas',
    abas: [
      { nome: 'Leads', colunas: ['nome','empresa','email','telefone','origem','status','valor_estimado','data_criacao'],
        exemplo: [{ nome:'João Silva', empresa:'Tech LTDA', email:'joao@tech.com', telefone:'11999999999', origem:'Site', status:'qualificado', valor_estimado:15000, data_criacao:'2024-01-15' }]
      },
      { nome: 'Oportunidades', colunas: ['lead','empresa','etapa','valor','probabilidade','previsao_fechamento','status'],
        exemplo: [{ lead:'João Silva', empresa:'Tech LTDA', etapa:'Proposta', valor:15000, probabilidade:70, previsao_fechamento:'2024-02-28', status:'aberta' }]
      }
    ]
  },
  rh: {
    label: 'Recursos Humanos',
    descricao: 'Funcionários, folha de pagamento, ponto',
    abas: [
      { nome: 'Funcionarios', colunas: ['nome','cargo','departamento','admissao','salario','status','email'],
        exemplo: [{ nome:'Maria Souza', cargo:'Analista', departamento:'TI', admissao:'2022-03-01', salario:4500, status:'ativo', email:'maria@empresa.com' }]
      },
      { nome: 'Folha', colunas: ['funcionario','mes','ano','salario_bruto','inss','irrf','salario_liquido'],
        exemplo: [{ funcionario:'Maria Souza', mes:1, ano:2024, salario_bruto:4500, inss:495, irrf:280, salario_liquido:3725 }]
      }
    ]
  },
  estoque: {
    label: 'Estoque & Operações',
    descricao: 'Produtos, movimentações, ordens de serviço',
    abas: [
      { nome: 'Produtos', colunas: ['codigo','nome','categoria','unidade','estoque_atual','estoque_minimo','preco_custo','preco_venda'],
        exemplo: [{ codigo:'PROD001', nome:'Produto A', categoria:'Matéria Prima', unidade:'KG', estoque_atual:100, estoque_minimo:20, preco_custo:10, preco_venda:18 }]
      },
      { nome: 'Movimentacoes', colunas: ['data','produto','tipo','quantidade','motivo','responsavel'],
        exemplo: [{ data:'2024-01-05', produto:'Produto A', tipo:'entrada', quantidade:50, motivo:'Compra NF 123', responsavel:'Carlos' }]
      }
    ]
  },
  kpis: {
    label: 'KPIs & Indicadores',
    descricao: 'Indicadores de desempenho por período',
    abas: [
      { nome: 'KPIs', colunas: ['nome','modulo','unidade','meta','descricao'],
        exemplo: [
          { nome:'Faturamento Mensal', modulo:'financeiro', unidade:'R$', meta:100000, descricao:'Receita total mensal' },
          { nome:'NPS', modulo:'comercial', unidade:'pontos', meta:70, descricao:'Net Promoter Score' }
        ]
      },
      { nome: 'Registros', colunas: ['kpi','data','valor','observacao'],
        exemplo: [
          { kpi:'Faturamento Mensal', data:'2024-01-31', valor:95000, observacao:'Abaixo da meta' },
          { kpi:'NPS', data:'2024-01-31', valor:72, observacao:'Meta atingida' }
        ]
      }
    ]
  }
}

// ─── Helper: fetch com redirect ──────────────────────────────
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, { headers: { 'User-Agent': 'FlowOS/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchUrl(res.headers.location).then(resolve).catch(reject)
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// ─── Helper: montar workbook formatado ───────────────────────
function montarWorkbook(abas, titulo = 'FlowOS') {
  const wb = XLSX.utils.book_new()
  const capa = XLSX.utils.aoa_to_sheet([
    [titulo.toUpperCase()],
    [''],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    [''],
    ['ABAS DISPONÍVEIS:'],
    ...abas.map(a => [a.nome, `${a.dados.length} registros`])
  ])
  capa['!cols'] = [{ wch: 25 }, { wch: 40 }]
  if (capa['A1']) capa['A1'].s = { font: { bold: true, sz: 14, color: { rgb: '0EA5E9' } } }
  XLSX.utils.book_append_sheet(wb, capa, 'Início')
  abas.forEach(({ nome, dados }) => {
    if (!dados?.length) return
    const ws = XLSX.utils.json_to_sheet(dados)
    const nCols = Object.keys(dados[0]).length
    for (let C = 0; C < nCols; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })]
      if (cell) cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '0E1420' } }, alignment: { horizontal: 'center' } }
    }
    ws['!cols'] = Array(nCols).fill({ wch: 20 })
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31))
  })
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
}

// ─── GET /export/powerbi-templates ───────────────────────────
// Lista templates disponíveis
router.get('/powerbi-templates', autenticar, (req, res) => {
  res.json(Object.entries(TEMPLATES_BI).map(([id, t]) => ({
    id, label: t.label, descricao: t.descricao,
    abas: t.abas.map(a => ({ nome: a.nome, colunas: a.colunas }))
  })))
})

// ─── GET /export/powerbi-modelo/:template ────────────────────
// Baixa planilha modelo Excel para o cliente preencher
router.get('/powerbi-modelo/:template', autenticar, (req, res) => {
  const tpl = TEMPLATES_BI[req.params.template]
  if (!tpl) return res.status(404).json({ error: 'Template não encontrado' })
  const buffer = montarWorkbook(tpl.abas.map(a => ({ nome: a.nome, dados: a.exemplo })), `MODELO – ${tpl.label}`)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="modelo_${req.params.template}.xlsx"`)
  res.send(buffer)
})

// ─── POST /export/powerbi-from-upload ────────────────────────
// Recebe Excel/CSV do cliente e gera workbook Power BI formatado
router.post('/powerbi-from-upload', autenticar, uploadPlanilha.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    const { titulo } = req.body
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const abas = wb.SheetNames
      .map(nome => ({ nome: nome.slice(0, 31), dados: XLSX.utils.sheet_to_json(wb.Sheets[nome], { defval: '' }) }))
      .filter(a => a.dados.length > 0)
    if (!abas.length) return res.status(400).json({ error: 'Planilha vazia ou sem dados' })
    const nomeEmpresa = titulo || req.file.originalname.replace(/\.[^.]+$/, '')
    const buffer = montarWorkbook(abas, nomeEmpresa)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${nomeEmpresa.replace(/[^a-zA-Z0-9]/g,'_')}_PowerBI.xlsx"`)
    res.send(buffer)
  } catch (err) {
    console.error('[POWERBI-UPLOAD]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /export/powerbi-from-sheets ────────────────────────
// Importa Google Sheets público e gera workbook Power BI
// A planilha precisa estar compartilhada como "qualquer pessoa com o link"
router.post('/powerbi-from-sheets', autenticar, async (req, res) => {
  try {
    const { sheets_url, titulo } = req.body
    if (!sheets_url) return res.status(400).json({ error: 'URL do Google Sheets obrigatória' })
    const m = sheets_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (!m) return res.status(400).json({ error: 'URL inválida. Use o link de compartilhamento do Google Sheets.' })
    const sheetId = m[1]
    let buffer
    try {
      buffer = await fetchUrl(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`)
    } catch {
      return res.status(400).json({ error: 'Não foi possível acessar a planilha. Verifique se está compartilhada publicamente.' })
    }
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const abas = wb.SheetNames
      .map(nome => ({ nome: nome.slice(0, 31), dados: XLSX.utils.sheet_to_json(wb.Sheets[nome], { defval: '' }) }))
      .filter(a => a.dados.length > 0)
    if (!abas.length) return res.status(400).json({ error: 'Planilha vazia ou sem dados' })
    const nomeEmpresa = titulo || 'Google_Sheets'
    const bufferOut = montarWorkbook(abas, nomeEmpresa)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${nomeEmpresa.replace(/[^a-zA-Z0-9]/g,'_')}_PowerBI.xlsx"`)
    res.send(bufferOut)
  } catch (err) {
    console.error('[POWERBI-SHEETS]', err.message)
    res.status(500).json({ error: err.message })
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

// ─── Gerador de Dashboard White-label ───────────────────────
// POST /export/dashboard-html
// Body: { senha, cor_primaria, logo_base64, nome_empresa, sections }
// sections: [{ titulo, icone, relatorios: [{ nome, url }] }]
// ─────────────────────────────────────────────────────────────
function gerarHTMLDashboard({ hashSenha, cor_primaria, logo_base64, nome_empresa, sections }) {
  const cor = cor_primaria || '#0ea5e9'
  const sectionsJSON = JSON.stringify(sections || [])
  const logoHTML = logo_base64
    ? `<img src="${logo_base64}" alt="${nome_empresa}" style="height:52px;object-fit:contain;margin:0 auto 24px;display:block">`
    : `<div style="width:52px;height:52px;border-radius:14px;background:${cor};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;margin:0 auto 24px">${nome_empresa.charAt(0).toUpperCase()}</div>`
  const sidebarLogoHTML = logo_base64
    ? `<img src="${logo_base64}" alt="${nome_empresa}" style="height:34px;object-fit:contain">`
    : `<div style="width:34px;height:34px;border-radius:10px;background:${cor};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0">${nome_empresa.charAt(0).toUpperCase()}</div>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${nome_empresa} – Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--brand:${cor}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',-apple-system,sans-serif;background:#0f172a;color:#e2e8f0}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:#1e293b}
::-webkit-scrollbar-thumb{background:var(--brand);border-radius:3px}
#login-screen{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0f172a;z-index:100}
#dashboard{display:none;height:100vh;overflow:hidden}
#sidebar{width:240px;background:#1e293b;display:flex;flex-direction:column;flex-shrink:0;height:100vh;overflow-y:auto;border-right:1px solid #0f172a}
#main{flex:1;display:flex;flex-direction:column;min-width:0;height:100vh}
#topbar{height:52px;background:#1e293b;border-bottom:1px solid #0f172a;display:flex;align-items:center;padding:0 20px;gap:12px;flex-shrink:0}
#report-area{flex:1;background:#0f172a;display:flex;align-items:center;justify-content:center;position:relative}
.report-frame{width:100%;height:100%;border:none;position:absolute;inset:0;display:none}
.sidebar-link{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:#94a3b8;transition:all .15s;border:none;background:none;width:100%;text-align:left}
.sidebar-link:hover{background:rgba(255,255,255,0.05);color:#e2e8f0}
.sidebar-link.active{background:color-mix(in srgb,var(--brand) 15%,transparent);color:var(--brand)}
.sec-title{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#475569;user-select:none}
.sec-title:hover{color:#94a3b8}
.chevron{transition:transform .2s;font-size:9px}
.chevron.open{transform:rotate(90deg)}
#overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40}
#hamburger{display:none;background:none;border:none;color:#64748b;cursor:pointer;font-size:22px;padding:2px 8px 2px 0}
input[type=password]{width:100%;padding:13px 16px;background:#0f172a;border:1px solid #334155;border-radius:10px;color:#e2e8f0;font-size:14px;outline:none;margin-bottom:12px;font-family:inherit;transition:border-color .15s}
input[type=password]:focus{border-color:var(--brand)}
@media(max-width:768px){
  #sidebar{transform:translateX(-100%);transition:transform .25s;position:fixed;z-index:50}
  #sidebar.open{transform:translateX(0)}
  #overlay.open{display:block}
  #hamburger{display:block}
}
</style>
</head>
<body>

<div id="login-screen">
  <div style="width:100%;max-width:380px;padding:0 20px">
    <div style="background:#1e293b;border:1px solid #334155;border-radius:20px;padding:40px 36px;text-align:center">
      ${logoHTML}
      <h1 style="font-size:20px;font-weight:700;color:#f1f5f9;margin:0 0 4px">${nome_empresa}</h1>
      <p style="font-size:13px;color:#64748b;margin:0 0 28px">Central de Relatórios</p>
      <div id="login-error" style="display:none;background:#7f1d1d22;border:1px solid #7f1d1d;color:#fca5a5;font-size:12px;padding:10px 14px;border-radius:8px;margin-bottom:16px">Senha incorreta. Tente novamente.</div>
      <input type="password" id="pwd" placeholder="Digite sua senha" onkeydown="if(event.key==='Enter')doLogin()">
      <button onclick="doLogin()" style="width:100%;padding:13px;background:var(--brand);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Entrar</button>
      <p style="font-size:11px;color:#334155;margin:20px 0 0">Acesso restrito. Apenas usuários autorizados.</p>
    </div>
  </div>
</div>

<div id="dashboard" style="display:flex">
  <div id="overlay" onclick="closeSidebar()"></div>
  <aside id="sidebar">
    <div style="padding:20px 16px 16px;border-bottom:1px solid #0f172a">
      <div style="display:flex;align-items:center;gap:10px">
        ${sidebarLogoHTML}
        <span style="font-size:14px;font-weight:700;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nome_empresa}</span>
      </div>
    </div>
    <nav id="nav" style="flex:1;padding:12px 8px;overflow-y:auto"></nav>
    <div style="padding:12px 16px;border-top:1px solid #0f172a">
      <button onclick="doLogout()" style="width:100%;padding:8px;background:transparent;border:1px solid #1e3a5f;border-radius:8px;color:#64748b;font-size:12px;cursor:pointer;font-family:inherit">Sair</button>
    </div>
  </aside>
  <main id="main">
    <header id="topbar">
      <button id="hamburger" onclick="toggleSidebar()">☰</button>
      <div style="flex:1;font-size:14px;font-weight:600;color:#94a3b8" id="report-title">Selecione um relatório</div>
      <div style="font-size:11px;color:#334155" id="session-info"></div>
    </header>
    <div id="report-area">
      <div id="empty-state" style="text-align:center">
        <div style="font-size:48px;margin-bottom:16px">📊</div>
        <div style="font-size:16px;font-weight:600;color:#475569;margin-bottom:8px">Nenhum relatório selecionado</div>
        <div style="font-size:13px;color:#334155">Escolha um relatório na barra lateral</div>
      </div>
      <iframe id="frame" class="report-frame" allowfullscreen></iframe>
    </div>
  </main>
</div>

<script>
const HASH='${hashSenha}',TTL=4*60*60*1000,KEY='flos_ds';
const SECTIONS=${sectionsJSON};

async function sha256(m){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}

async function doLogin(){
  const p=document.getElementById('pwd').value;if(!p)return;
  const h=await sha256(p);
  if(h===HASH){
    localStorage.setItem(KEY,JSON.stringify({ts:Date.now()}));
    document.getElementById('login-screen').style.display='none';
    document.getElementById('dashboard').style.display='flex';
    buildNav();updateSession();
  }else{document.getElementById('login-error').style.display='block';document.getElementById('pwd').value='';document.getElementById('pwd').focus();}
}

function doLogout(){localStorage.removeItem(KEY);location.reload()}

function checkSession(){
  try{const{ts}=JSON.parse(localStorage.getItem(KEY)||'{}');return Date.now()-ts<TTL;}catch{return false}
}

function updateSession(){
  try{const{ts}=JSON.parse(localStorage.getItem(KEY));const e=new Date(ts+TTL);document.getElementById('session-info').textContent='Expira '+e.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}catch{}
}

let activeUrl=null;
function buildNav(){
  const nav=document.getElementById('nav');nav.innerHTML='';
  SECTIONS.forEach(sec=>{
    const wrap=document.createElement('div');wrap.style.marginBottom='4px';
    const title=document.createElement('div');title.className='sec-title';
    title.innerHTML='<span>'+sec.titulo+'</span><span class="chevron open">▶</span>';
    const list=document.createElement('div');
    title.onclick=()=>{const o=list.style.display!=='none';list.style.display=o?'none':'block';title.querySelector('.chevron').classList.toggle('open',!o)};
    (sec.relatorios||[]).forEach(r=>{
      const btn=document.createElement('button');btn.className='sidebar-link'+(r.url===activeUrl?' active':'');
      btn.innerHTML='<span style="font-size:14px">'+sec.icone+'</span><span>'+r.nome+'</span>';
      btn.onclick=()=>loadReport(r.url,r.nome,btn);list.appendChild(btn);
    });
    wrap.appendChild(title);wrap.appendChild(list);nav.appendChild(wrap);
  });
}

function loadReport(url,nome,btn){
  activeUrl=url;document.querySelectorAll('.sidebar-link').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  document.getElementById('report-title').textContent=nome;
  const f=document.getElementById('frame');f.src=url;f.style.display='block';
  document.getElementById('empty-state').style.display='none';
  if(window.innerWidth<=768)closeSidebar();
}

function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('overlay').classList.toggle('open')}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('open')}

window.addEventListener('resize',()=>{if(window.innerWidth>768){document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('open')}});

(function(){if(checkSession()){document.getElementById('login-screen').style.display='none';document.getElementById('dashboard').style.display='flex';buildNav();updateSession();}})();
</script>
</body>
</html>`
}

router.post('/dashboard-html', autenticar, async (req, res) => {
  try {
    const { senha, cor_primaria, logo_base64, nome_empresa, sections } = req.body
    if (!senha || !nome_empresa) return res.status(400).json({ error: 'senha e nome_empresa são obrigatórios' })
    if (!Array.isArray(sections) || sections.length === 0) return res.status(400).json({ error: 'Adicione pelo menos uma seção' })

    const hashSenha = crypto.createHash('sha256').update(senha).digest('hex')
    const html = gerarHTMLDashboard({ hashSenha, cor_primaria, logo_base64, nome_empresa, sections })
    const nomeArquivo = `${nome_empresa.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_dashboard.html`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`)
    res.send(html)
  } catch (err) {
    console.error('[DASHBOARD-HTML]', err.message)
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