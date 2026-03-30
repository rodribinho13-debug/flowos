import express from 'express'
import supabase from '../services/supabase.js'
import { autenticar } from './auth.js'
import { gerarMensagemIA } from '../services/openai.js'
import { getWorkspaceConfig } from './configuracoes.js'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

// Configuração do Nodemailer (para SendGrid)
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false, // use TLS
  auth: {
    user: 'apikey', // SendGrid usa 'apikey' como usuário
    pass: process.env.SENDGRID_API_KEY
  }
})

// ─── Templates de Mensagem ───────────────────────────────────
router.get('/templates', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('criado_em', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/templates', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const payload = { ...req.body, workspace_id }
    const { data, error } = await supabase
      .from('templates')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Mensagens Enviadas ──────────────────────────────────────
router.get('/', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { lead_id, canal, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let q = supabase
      .from('mensagens_enviadas')
      .select('*, leads(nome, empresa)', { count: 'exact' })
      .eq('workspace_id', workspace_id)
      .order('enviado_em', { ascending: false })
      .range(offset, offset + limit - 1)

    if (lead_id) q = q.eq('lead_id', lead_id)
    if (canal)   q = q.eq('canal', canal)

    const { data, count, error } = await q
    if (error) throw error
    res.json({ mensagens: data, total: count, page: +page, limit: +limit })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Enviar WhatsApp (via Evolution API) ─────────────────────
router.post('/whatsapp', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { lead_id, numero, mensagem } = req.body

    // Prioridade: config salva pelo cliente no banco; fallback para .env
    const wsCfg = await getWorkspaceConfig(workspace_id)
    const apiUrl      = wsCfg.evolution_api_url  || process.env.EVOLUTION_API_URL
    const apiKey      = wsCfg.evolution_api_key   || process.env.EVOLUTION_API_KEY
    const instance    = wsCfg.evolution_instance  || process.env.EVOLUTION_INSTANCE

    if (!apiUrl || !apiKey || !instance) {
      return res.status(500).json({ error: 'WhatsApp não configurado. Acesse Configurações → WhatsApp e preencha os dados da Evolution API.' })
    }

    const numeroLimpo  = String(numero).replace(/\D/g, '')
    const numeroFmt    = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`

    const evolutionUrl = `${apiUrl.replace(/\/$/, '')}/message/sendText/${instance}`
    const headers      = { apikey: apiKey, 'Content-Type': 'application/json' }
    const body         = { number: `${numeroFmt}@s.whatsapp.net`, textMessage: { text: mensagem } }

    const response = await fetch(evolutionUrl, { method: 'POST', headers, body: JSON.stringify(body) })
    const data     = await response.json()

    if (!response.ok) throw new Error(data.message || 'Erro ao enviar WhatsApp')

    await supabase.from('mensagens_enviadas').insert({
      workspace_id, lead_id: lead_id || null, canal: 'whatsapp', corpo: mensagem, status: 'enviado'
    })

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Enviar Email (via SendGrid) ─────────────────────────────
router.post('/email', autenticar, async (req, res) => {
  try {
    const { workspace_id } = req.usuario
    const { lead_id, para, assunto, corpo } = req.body

    if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
      return res.status(500).json({ error: 'Configuração do SendGrid ou EMAIL_FROM ausente no .env' })
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: para,
      subject: assunto,
      html: corpo
    }

    await transporter.sendMail(mailOptions)

    // Registrar mensagem enviada
    await supabase.from('mensagens_enviadas').insert({
      workspace_id, lead_id, canal: 'email', assunto, corpo, status: 'enviado'
    })

    res.json({ success: true, message: 'Email enviado com sucesso!' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Gerar Mensagem com IA ───────────────────────────────────
router.post('/gerar', autenticar, async (req, res) => {
  try {
    const { prompt } = req.body
    const mensagemGerada = await gerarMensagemIA(prompt) // Usando a função correta
    res.json({ mensagem: mensagemGerada })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router