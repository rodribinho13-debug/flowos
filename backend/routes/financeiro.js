// ═══════════════════════════════════════════════════════════════
// FlowOS – Rotas: Módulo Financeiro
// backend/routes/financeiro.js
// ═══════════════════════════════════════════════════════════════
import express from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'
import { analisarDadosSemana } from '../services/openai.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })


// ─── Lançamentos ──────────────────────────────────────────────
router.get('/lancamentos', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { inicio, fim, tipo, status, categoria_id, conta_id, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let q = supabase
      .from('fin_lancamentos')
      .select('*, fin_categorias(nome, tipo), fin_contas(nome)', { count: 'exact' })
      .eq('workspace_id', workspace_id)
      .order('data_competencia', { ascending: false })
      .range(offset, offset + limit - 1)

    if (inicio)       q = q.gte('data_competencia', inicio)
    if (fim)          q = q.lte('data_competencia', fim)
    if (tipo)         q = q.eq('tipo', tipo)
    if (status)       q = q.eq('status', status)
    if (categoria_id) q = q.eq('categoria_id', categoria_id)
    if (conta_id)     q = q.eq('conta_id', conta_id)

    const { data, count, error } = await q
    if (error) throw error
    res.json({ lancamentos: data, total: count, page: +page, limit: +limit })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/lancamentos', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const payload = { ...req.body, workspace_id }
    const { data, error } = await supabase
      .from('fin_lancamentos')
      .insert(payload)
      .select()
      .single()
    if (error) throw error

    // Atualiza saldo da conta
    const delta = payload.tipo === 'receita' ? payload.valor : -payload.valor
    if (payload.status === 'pago') {
      await supabase.rpc('atualizar_saldo_conta', {
        p_conta_id: payload.conta_id,
        p_delta: delta
      })
    }
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/lancamentos/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params
    const { workspace_id } = req.usuario
    const { data, error } = await supabase
      .from('fin_lancamentos')
      .update(req.body)
      .eq('id', id).eq('workspace_id', workspace_id)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/lancamentos/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params
    const { workspace_id } = req.usuario
    const { error } = await supabase
      .from('fin_lancamentos')
      .update({ status: 'cancelado' })
      .eq('id', id).eq('workspace_id', workspace_id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// ─── DRE ──────────────────────────────────────────────────────
router.get('/dre', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { ano = new Date().getFullYear() } = req.query

    const { data, error } = await supabase
      .from('vw_fin_dre')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('ano', ano)
      .order('mes')

    if (error) throw error

    // Estrutura meses (1–12)
    const meses = Array.from({ length: 12 }, (_, i) => i + 1)
    const categorias = [...new Set(data.map(d => d.categoria))]
    const dre = categorias.map(cat => {
      const tipo = data.find(d => d.categoria === cat)?.tipo_categoria
      return {
        categoria: cat,
        tipo,
        meses: meses.map(m => {
          const row = data.find(d => d.categoria === cat && +d.mes === m)
          return { mes: m, realizado: row?.valor_realizado || 0, previsto: row?.valor_previsto || 0 }
        }),
        total_realizado: data.filter(d => d.categoria === cat).reduce((s, r) => s + (+r.valor_realizado || 0), 0)
      }
    })

    // Análise IA
    const totais = {
      receitas: data.filter(d => d.tipo_categoria === 'receita').reduce((s, r) => s + (+r.valor_realizado || 0), 0),
      despesas: data.filter(d => d.tipo_categoria === 'despesa').reduce((s, r) => s + (+r.valor_realizado || 0), 0)
    }
    totais.resultado = totais.receitas - totais.despesas
    totais.margem = totais.receitas > 0 ? (totais.resultado / totais.receitas * 100).toFixed(1) : 0

    let analise_ia = null
    try {
      const analise = await analisarDadosSemana({ ...totais, modulo: 'financeiro', ano })
      analise_ia = analise.analise
    } catch {}

    res.json({ dre, totais, analise_ia })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// ─── Fluxo de Caixa ───────────────────────────────────────────
router.get('/fluxo-caixa', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { inicio, fim } = req.query

    const { data, error } = await supabase
      .from('vw_fin_fluxo_caixa')
      .select('*')
      .eq('workspace_id', workspace_id)
      .gte('data_competencia', inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
      .lte('data_competencia', fim || new Date().toISOString().split('T')[0])
      .order('data_competencia')

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// ─── Importar Planilha ────────────────────────────────────────
router.post('/importar', autenticar, upload.single('arquivo'), async (req, res) => {
  try {
    const { workspace_id, id: usuario_id } = req.usuario
    const { modulo = 'financeiro' } = req.body

    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' })

    const wb    = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const ws    = wb.Sheets[wb.SheetNames[0]]
    const linhas = XLSX.utils.sheet_to_json(ws)

    // Registrar importação
    const { data: importacao } = await supabase
      .from('importacoes')
      .insert({ workspace_id, usuario_id, modulo, nome_arquivo: req.file.originalname, total_linhas: linhas.length })
      .select().single()

    // Mapear colunas flexíveis
    const mapeamento = {
      descricao:        ['descricao', 'descrição', 'historico', 'histórico'],
      valor:            ['valor', 'value', 'amount'],
      tipo:             ['tipo', 'type', 'categoria_tipo'],
      data_competencia: ['data', 'data_competencia', 'data_competência', 'vencimento'],
      status:           ['status', 'situacao', 'situação']
    }

    const normalizar = (obj, chave) => {
      for (const alias of mapeamento[chave] || []) {
        if (obj[alias] !== undefined) return obj[alias]
      }
      return null
    }

    let ok = 0, erros = []
    const batch = []

    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i]
      try {
        const valor = parseFloat(String(normalizar(l, 'valor')).replace(/[^\d.,-]/g, '').replace(',', '.'))
        const data_competencia = normalizar(l, 'data_competencia')
        const tipo = (normalizar(l, 'tipo') || 'despesa').toLowerCase().includes('recei') ? 'receita' : 'despesa'

        if (!valor || !data_competencia) throw new Error('Valor ou data ausente')

        batch.push({
          workspace_id,
          descricao: normalizar(l, 'descricao') || `Importado linha ${i + 2}`,
          valor: Math.abs(valor),
          tipo,
          data_competencia: data_competencia instanceof Date
            ? data_competencia.toISOString().split('T')[0]
            : String(data_competencia).slice(0, 10),
          status: normalizar(l, 'status') || 'pendente',
          origem: 'planilha'
        })
        ok++
      } catch (e) {
        erros.push({ linha: i + 2, erro: e.message })
      }
    }

    if (batch.length > 0) {
      const { error } = await supabase.from('fin_lancamentos').insert(batch)
      if (error) throw error
    }

    await supabase.from('importacoes').update({
      linhas_ok: ok, linhas_erro: erros.length, erros, status: 'concluido'
    }).eq('id', importacao.id)

    res.json({ success: true, importacao_id: importacao.id, processados: ok, erros })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// ─── Gerar Planilha Modelo ────────────────────────────────────
router.get('/modelo-planilha', autenticar, async (req, res) => {
  try {
    const modelo = [
      { descricao: 'Exemplo: Venda de produto X', tipo: 'receita', valor: 5000.00, data: '2025-01-15', status: 'pago',     categoria: 'Vendas'   },
      { descricao: 'Exemplo: Aluguel escritório',  tipo: 'despesa', valor: 2500.00, data: '2025-01-10', status: 'pago',     categoria: 'Fixo'     },
      { descricao: 'Exemplo: Conta de energia',    tipo: 'despesa', valor:  350.00, data: '2025-01-20', status: 'pendente', categoria: 'Utilidades'}
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(modelo)

    // Larguras de coluna
    ws['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 20 }]

    XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="flowos_modelo_financeiro.xlsx"')
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


export default router


// ═══════════════════════════════════════════════════════════════
// FlowOS – Rotas: Módulo RH
// backend/routes/rh.js
// ═══════════════════════════════════════════════════════════════
// (Arquivo separado — export default abaixo)

export const rhRouter = (() => {
  const r = express.Router()

  // Listar funcionários
  r.get('/funcionarios', autenticar, async (req, res) => {
    try {
      const { workspace_id } = req.usuario
      const { departamento, status = 'ativo', busca } = req.query

      let q = supabase.from('rh_funcionarios').select('*')
        .eq('workspace_id', workspace_id).eq('status', status)
        .order('nome')

      if (departamento) q = q.eq('departamento', departamento)
      if (busca) q = q.or(`nome.ilike.%${busca}%,cargo.ilike.%${busca}%`)

      const { data, error } = await q
      if (error) throw error
      res.json(data)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // Criar funcionário
  r.post('/funcionarios', autenticar, async (req, res) => {
    try {
      const { workspace_id } = req.usuario
      const { data, error } = await supabase.from('rh_funcionarios')
        .insert({ ...req.body, workspace_id }).select().single()
      if (error) throw error
      res.json(data)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // Registrar ponto (entrada/saída)
  r.post('/ponto', autenticar, async (req, res) => {
    try {
      const { workspace_id } = req.usuario
      const { funcionario_id, tipo, data = new Date().toISOString().split('T')[0] } = req.body
      const hora = new Date().toTimeString().slice(0, 8)

      // Upsert no registro do dia
      const campo = { entrada: 'entrada', saida_almoco: 'saida_almoco', retorno_almoco: 'retorno_almoco', saida: 'saida' }[tipo]
      if (!campo) return res.status(400).json({ error: 'Tipo inválido' })

      const { data: ponto, error } = await supabase.from('rh_ponto')
        .upsert({ workspace_id, funcionario_id, data, [campo]: hora }, { onConflict: 'funcionario_id,data' })
        .select().single()

      if (error) throw error
      res.json({ success: true, ponto })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // Folha de pagamento: calcular mês
  r.post('/folha/calcular', autenticar, async (req, res) => {
    try {
      const { workspace_id } = req.usuario
      const { mes, ano } = req.body

      const { data: funcs } = await supabase.from('rh_funcionarios')
        .select('*').eq('workspace_id', workspace_id).eq('status', 'ativo')

      const folhas = funcs.map(f => {
        const bruto = f.salario_base || 0
        const inss  = calcularINSS(bruto)
        const irrf  = calcularIRRF(bruto - inss)
        const vt    = bruto * 0.06
        const liquido = bruto - inss - irrf - vt
        return { workspace_id, funcionario_id: f.id, mes, ano, salario_bruto: bruto, inss, irrf, vale_transporte: vt, salario_liquido: liquido, status: 'calculado' }
      })

      const { data, error } = await supabase.from('rh_folha')
        .upsert(folhas, { onConflict: 'funcionario_id,mes,ano' }).select()
      if (error) throw error

      res.json({ success: true, folhas: data, total: data.reduce((s, f) => s + f.salario_liquido, 0) })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // Helper: cálculo INSS 2024
  function calcularINSS(salario) {
    if (salario <= 1412.00) return salario * 0.075
    if (salario <= 2666.68) return salario * 0.09
    if (salario <= 4000.03) return salario * 0.12
    if (salario <= 7786.02) return salario * 0.14
    return 908.87 // teto
  }

  // Helper: cálculo IRRF 2024
  function calcularIRRF(base) {
    if (base <= 2259.20) return 0
    if (base <= 2826.65) return base * 0.075 - 169.44
    if (base <= 3751.05) return base * 0.15  - 381.44
    if (base <= 4664.68) return base * 0.225 - 662.77
    return base * 0.275 - 896.00
  }

  // ─── Exames ocupacionais ─────────────────────────────────────

  // Listar funcionários com exame vencendo nos próximos X dias e não notificados
  // Usado pelo N8N: GET /rh/exames/vencendo?dias=30
  r.get('/exames/vencendo', autenticar, async (req, res) => {
    try {
      const { workspace_id } = req.usuario
      const dias = parseInt(req.query.dias) || 30

      const hoje  = new Date().toISOString().split('T')[0]
      const limit = new Date(Date.now() + dias * 86_400_000).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('rh_funcionarios')
        .select('id, nome, telefone, email, data_exame_vencimento, exame_notificado')
        .eq('workspace_id', workspace_id)
        .eq('status', 'ativo')
        .gte('data_exame_vencimento', hoje)
        .lte('data_exame_vencimento', limit)
        .or('exame_notificado.is.null,exame_notificado.eq.false')
        .order('data_exame_vencimento')

      if (error) throw error
      res.json(data || [])
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // Marcar exame como notificado
  // Usado pelo N8N: PATCH /rh/exames/:id/notificado
  r.patch('/exames/:id/notificado', autenticar, async (req, res) => {
    try {
      const { workspace_id } = req.usuario
      const { data, error } = await supabase
        .from('rh_funcionarios')
        .update({ exame_notificado: true, data_notificacao_exame: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('workspace_id', workspace_id)
        .select('id, nome, exame_notificado')
        .single()

      if (error) throw error
      res.json({ success: true, funcionario: data })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  // Gerar modelo planilha RH
  r.get('/modelo-planilha', autenticar, async (req, res) => {
    try {
      const modelo = [
        { nome: 'João Silva', cpf: '123.456.789-00', cargo: 'Analista', departamento: 'TI', data_admissao: '2023-01-15', salario_base: 4500, tipo_contrato: 'clt', regime: '44h' },
        { nome: 'Maria Santos', cpf: '987.654.321-00', cargo: 'Gerente', departamento: 'Comercial', data_admissao: '2022-06-01', salario_base: 8000, tipo_contrato: 'clt', regime: '44h' }
      ]
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(modelo)
      ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 10 }]
      XLSX.utils.book_append_sheet(wb, ws, 'Funcionários')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="flowos_modelo_rh.xlsx"')
      res.send(buffer)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  return r
})()
