// ══════════════════════════════════════════════════════════════
// FlowOS – routes/dashboard.js
// GET /dashboard  →  dados consolidados para o dashboard
// ══════════════════════════════════════════════════════════════
import express  from 'express'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'

const router = express.Router()

router.get('/', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const hoje = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0]

    // ── KPIs ──────────────────────────────────────────────
    const { data: kpisRaw } = await supabase
      .from('kpis')
      .select('*, kpi_registros(valor, data_referencia)')
      .eq('workspace_id', workspace_id)
      .eq('ativo', true)
      .order('criado_em')

    const kpis = (kpisRaw || []).map(k => {
      const regs  = (k.kpi_registros || []).sort(
        (a, b) => new Date(b.data_referencia) - new Date(a.data_referencia)
      )
      const atual    = regs[0]?.valor ?? 0
      const anterior = regs[1]?.valor ?? 0
      const variacao = anterior > 0
        ? parseFloat(((atual - anterior) / anterior * 100).toFixed(1))
        : 0
      return {
        ...k,
        valor:    atual,
        variacao,
        historico: regs.slice(0, 6).reverse()
      }
    })

    // ── Leads ─────────────────────────────────────────────
    const { data: leads } = await supabase
      .from('leads')
      .select('status, regiao_id, nome_regiao, criado_em')
      .eq('workspace_id', workspace_id)

    // Leads por região
    const regiaoMap = {}
    ;(leads || []).forEach(l => {
      if (!l.regiao_id) return
      if (!regiaoMap[l.regiao_id])
        regiaoMap[l.regiao_id] = { regiao: l.nome_regiao || l.regiao_id, leads: 0, reunioes: 0 }
      regiaoMap[l.regiao_id].leads++
      if (l.status === 'reuniao') regiaoMap[l.regiao_id].reunioes++
    })

    // Status dos leads (gráfico pizza)
    const statusCount = {}
    ;(leads || []).forEach(l => {
      statusCount[l.status] = (statusCount[l.status] || 0) + 1
    })
    const status_leads = Object.entries(statusCount).map(([name, value]) => ({ name, value }))

    // ── Faturamento mensal ─────────────────────────────────
    const { data: faturamentoRaw } = await supabase
      .from('kpi_registros')
      .select('valor, data_referencia, kpis!inner(nome, workspace_id)')
      .eq('kpis.workspace_id', workspace_id)
      .ilike('kpis.nome', '%faturamento%')
      .order('data_referencia', { ascending: true })
      .limit(6)

    const faturamento_mensal = (faturamentoRaw || []).map(f => ({
      mes: new Date(f.data_referencia).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      valor: f.valor
    }))

    // ── Mensagens hoje ─────────────────────────────────────
    const { count: mensagens_hoje } = await supabase
      .from('mensagens_enviadas')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace_id)
      .gte('enviado_em', hoje)

    // ── Atividades recentes ────────────────────────────────
    const { data: atividades_raw } = await supabase
      .from('mensagens_enviadas')
      .select('canal, enviado_em, leads(nome, empresa)')
      .eq('workspace_id', workspace_id)
      .order('enviado_em', { ascending: false })
      .limit(10)

    const atividades = (atividades_raw || []).map(a => ({
      tipo: 'mensagem',
      descricao: `${a.canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'} enviado para ${a.leads?.nome || '—'} (${a.leads?.empresa || '—'})`,
      tempo: new Date(a.enviado_em).toLocaleString('pt-BR')
    }))

    // ── Financeiro do mês ──────────────────────────────────
    const { data: lancamentos } = await supabase
      .from('fin_lancamentos')
      .select('tipo, valor, status')
      .eq('workspace_id', workspace_id)
      .gte('data_competencia', inicioMes)
      .eq('status', 'pago')

    const receita_mes = (lancamentos || [])
      .filter(l => l.tipo === 'receita')
      .reduce((s, l) => s + (l.valor || 0), 0)

    const despesa_mes = (lancamentos || [])
      .filter(l => l.tipo === 'despesa')
      .reduce((s, l) => s + (l.valor || 0), 0)

    // ── Análise IA (opcional, sem travar se OpenAI indisponível) ──
    let analise_ia = null
    let sugestoes_ia = []
    try {
      const { analisarDadosSemana } = await import('../services/openai.js')
      const analise = await analisarDadosSemana({
        leads_total:   leads?.length || 0,
        leads_novos:   (leads || []).filter(l => l.status === 'novo').length,
        reunioes:      (leads || []).filter(l => l.status === 'reuniao').length,
        mensagens_hoje: mensagens_hoje || 0,
        receita_mes,
        despesa_mes
      })
      analise_ia   = analise.analise
      sugestoes_ia = analise.sugestoes || []
    } catch (_e) {
      // OpenAI não configurado — ok, não bloqueia o dashboard
    }

    res.json({
      kpis,
      leads_por_regiao:  Object.values(regiaoMap),
      status_leads,
      faturamento_mensal,
      mensagens_hoje:    mensagens_hoje || 0,
      reunioes_marcadas: (leads || []).filter(l => l.status === 'reuniao').length,
      receita_mes,
      despesa_mes,
      resultado_mes:     receita_mes - despesa_mes,
      atividades,
      analise_ia,
      sugestoes_ia
    })
  } catch (err) {
    console.error('[DASHBOARD]', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
