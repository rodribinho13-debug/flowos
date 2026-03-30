// ══════════════════════════════════════════════════════════════
// FlowOS – services/evolution.js
// Wrapper para a Evolution API (rodando no seu VPS)
// URL e chave globais ficam no .env; instância é por workspace
// ══════════════════════════════════════════════════════════════
import dotenv from 'dotenv'
dotenv.config()

function baseUrl()  { return (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '') }
function globalKey(){ return process.env.EVOLUTION_API_KEY || '' }

function headers() {
  return { 'apikey': globalKey(), 'Content-Type': 'application/json' }
}

async function evFetch(method, path, body) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Evolution API ${res.status}`)
  return data
}

// ── Criar instância para o workspace ─────────────────────────
export async function criarInstancia(instanceName) {
  return evFetch('POST', '/instance/create', {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS'
  })
}

// ── Obter QR code (base64) ────────────────────────────────────
export async function getQRCode(instanceName) {
  return evFetch('GET', `/instance/connect/${instanceName}`)
}

// ── Status da conexão ─────────────────────────────────────────
export async function getStatus(instanceName) {
  const data = await evFetch('GET', `/instance/connectionState/${instanceName}`)
  // Evolution v2: { instance: { state: 'open'|'close'|'connecting' } }
  const state = data?.instance?.state || data?.state || 'unknown'
  return {
    conectado: state === 'open',
    state,
    raw: data
  }
}

// ── Desconectar (logout) ──────────────────────────────────────
export async function desconectarInstancia(instanceName) {
  return evFetch('DELETE', `/instance/logout/${instanceName}`)
}

// ── Deletar instância (ao excluir workspace) ──────────────────
export async function deletarInstancia(instanceName) {
  return evFetch('DELETE', `/instance/delete/${instanceName}`)
}

// ── Enviar texto ──────────────────────────────────────────────
export async function enviarTexto(instanceName, numero, texto) {
  const numeroLimpo = String(numero).replace(/\D/g, '')
  const numeroFmt   = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`
  return evFetch('POST', `/message/sendText/${instanceName}`, {
    number: `${numeroFmt}@s.whatsapp.net`,
    textMessage: { text: texto }
  })
}
