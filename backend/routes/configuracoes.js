// ══════════════════════════════════════════════════════════════
// FlowOS – routes/configuracoes.js
// Configurações por workspace (WhatsApp, integrações, etc.)
// ══════════════════════════════════════════════════════════════
import express  from 'express'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'

const router = express.Router()

// ──────────────────────────────────────────────────────────────
// Helper: busca config do workspace no banco
// ──────────────────────────────────────────────────────────────
export async function getWorkspaceConfig(workspace_id) {
  const { data } = await supabase
    .from('workspace_configuracoes')
    .select('*')
    .eq('workspace_id', workspace_id)
    .maybeSingle()
  return data || {}
}

// ──────────────────────────────────────────────────────────────
// GET /configuracoes/whatsapp
// ──────────────────────────────────────────────────────────────
router.get('/whatsapp', autenticar, async (req, res) => {
  try {
    const config = await getWorkspaceConfig(req.usuario.workspace_id)
    res.json({
      evolution_api_url:  config.evolution_api_url  || '',
      evolution_api_key:  config.evolution_api_key  || '',
      evolution_instance: config.evolution_instance || '',
      rh_whatsapp_numero: config.rh_whatsapp_numero || '',
      configurado: !!(config.evolution_api_url && config.evolution_api_key && config.evolution_instance)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────
// POST /configuracoes/whatsapp  — salva ou atualiza
// ──────────────────────────────────────────────────────────────
router.post('/whatsapp', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { evolution_api_url, evolution_api_key, evolution_instance, rh_whatsapp_numero } = req.body

    if (!evolution_api_url || !evolution_api_key || !evolution_instance)
      return res.status(400).json({ error: 'URL, chave de API e instância são obrigatórios.' })

    const { data, error } = await supabase
      .from('workspace_configuracoes')
      .upsert(
        { workspace_id, evolution_api_url, evolution_api_key, evolution_instance, rh_whatsapp_numero: rh_whatsapp_numero || null, atualizado_em: new Date().toISOString() },
        { onConflict: 'workspace_id' }
      )
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, message: 'Configuração salva com sucesso!', data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────
// POST /configuracoes/whatsapp/testar  — testa a conexão
// ──────────────────────────────────────────────────────────────
router.post('/whatsapp/testar', autenticar, async (req, res) => {
  try {
    const { evolution_api_url, evolution_api_key, evolution_instance } = req.body

    if (!evolution_api_url || !evolution_api_key || !evolution_instance)
      return res.status(400).json({ error: 'Preencha todos os campos antes de testar.' })

    const url = `${evolution_api_url.replace(/\/$/, '')}/instance/fetchInstances`
    const response = await fetch(url, {
      headers: { apikey: evolution_api_key, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      return res.status(400).json({ error: `Evolution API retornou ${response.status}. Verifique a URL e a chave.` })
    }

    const instances = await response.json()
    const instancia = Array.isArray(instances)
      ? instances.find(i => i.instance?.instanceName === evolution_instance || i.name === evolution_instance)
      : null

    if (!instancia)
      return res.status(404).json({ error: `Instância "${evolution_instance}" não encontrada. Verifique o nome.` })

    const conectado = instancia.instance?.state === 'open' || instancia.state === 'open'
    res.json({
      success: true,
      conectado,
      message: conectado ? '✅ WhatsApp conectado e pronto para enviar!' : '⚠️ Instância encontrada mas WhatsApp não está conectado. Escaneie o QR Code no painel da Evolution API.'
    })
  } catch (err) {
    if (err.name === 'TimeoutError')
      return res.status(400).json({ error: 'Tempo esgotado. Verifique se a URL da Evolution API está acessível.' })
    res.status(500).json({ error: 'Erro ao testar conexão: ' + err.message })
  }
})

export default router
