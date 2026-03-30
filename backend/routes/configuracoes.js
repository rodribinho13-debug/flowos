// ══════════════════════════════════════════════════════════════
// FlowOS – routes/configuracoes.js
// Configurações por workspace + WhatsApp (QR code, status)
// URL e chave da Evolution ficam no .env (seu VPS)
// Cada workspace tem sua própria instância criada automaticamente
// ══════════════════════════════════════════════════════════════
import express from 'express'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'
import { criarInstancia, getQRCode, getStatus, desconectarInstancia } from '../services/evolution.js'

const router = express.Router()

// ── Helper: lê config do workspace ───────────────────────────
export async function getWorkspaceConfig(workspace_id) {
  const { data } = await supabase
    .from('workspace_configuracoes')
    .select('*')
    .eq('workspace_id', workspace_id)
    .maybeSingle()
  return data || {}
}

// ── Helper: nome da instância (slug do workspace) ─────────────
async function getInstanceName(workspace_id) {
  const cfg = await getWorkspaceConfig(workspace_id)
  if (cfg.evolution_instance) return cfg.evolution_instance

  // Fallback: busca slug do workspace
  const { data: ws } = await supabase
    .from('workspaces')
    .select('slug')
    .eq('id', workspace_id)
    .single()
  return ws?.slug || null
}

// ──────────────────────────────────────────────────────────────
// GET /configuracoes/whatsapp/status
// Retorna se o WhatsApp está conectado
// ──────────────────────────────────────────────────────────────
router.get('/whatsapp/status', autenticar, async (req, res) => {
  try {
    const instance = await getInstanceName(req.usuario.workspace_id)
    if (!instance) return res.json({ conectado: false, state: 'sem_instancia' })

    if (!process.env.EVOLUTION_API_URL) return res.json({ conectado: false, state: 'api_nao_configurada' })

    const status = await getStatus(instance)
    res.json({ ...status, instance })
  } catch (err) {
    res.json({ conectado: false, state: 'erro', message: err.message })
  }
})

// ──────────────────────────────────────────────────────────────
// GET /configuracoes/whatsapp/qrcode
// Retorna o QR code base64 para o cliente escanear
// ──────────────────────────────────────────────────────────────
router.get('/whatsapp/qrcode', autenticar, async (req, res) => {
  try {
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY)
      return res.status(503).json({ error: 'Servidor WhatsApp não configurado. Contate o suporte.' })

    let instance = await getInstanceName(req.usuario.workspace_id)

    // Se não tem instância ainda, cria agora
    if (!instance) {
      const { data: ws } = await supabase.from('workspaces').select('slug').eq('id', req.usuario.workspace_id).single()
      instance = ws.slug
      await criarInstancia(instance)
      await supabase.from('workspace_configuracoes').upsert(
        { workspace_id: req.usuario.workspace_id, evolution_instance: instance, atualizado_em: new Date().toISOString() },
        { onConflict: 'workspace_id' }
      )
    }

    // Verifica se já está conectado
    const status = await getStatus(instance)
    if (status.conectado) return res.json({ conectado: true, message: 'WhatsApp já está conectado!' })

    // Gera QR code
    const qr = await getQRCode(instance)
    const base64 = qr?.base64 || qr?.qrcode?.base64 || qr?.code || null

    if (!base64) return res.status(400).json({ error: 'QR code não disponível. Aguarde alguns segundos e tente novamente.' })

    res.json({ conectado: false, qrcode: base64, instance })
  } catch (err) {
    console.error('[QRCODE]', err.message)
    res.status(500).json({ error: 'Erro ao gerar QR code: ' + err.message })
  }
})

// ──────────────────────────────────────────────────────────────
// POST /configuracoes/whatsapp/desconectar
// ──────────────────────────────────────────────────────────────
router.post('/whatsapp/desconectar', autenticar, async (req, res) => {
  try {
    const instance = await getInstanceName(req.usuario.workspace_id)
    if (!instance) return res.status(400).json({ error: 'Nenhuma instância encontrada.' })

    await desconectarInstancia(instance)
    res.json({ success: true, message: 'WhatsApp desconectado.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────
// GET /configuracoes/whatsapp
// Info geral (para o frontend saber o estado inicial)
// ──────────────────────────────────────────────────────────────
router.get('/whatsapp', autenticar, async (req, res) => {
  try {
    const instance = await getInstanceName(req.usuario.workspace_id)
    const apiConfigurada = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY)

    if (!apiConfigurada) return res.json({ configurado: false, conectado: false, instance: null })

    if (!instance) return res.json({ configurado: true, conectado: false, instance: null })

    const status = await getStatus(instance).catch(() => ({ conectado: false, state: 'erro' }))
    res.json({ configurado: true, conectado: status.conectado, state: status.state, instance })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
