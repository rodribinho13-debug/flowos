import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const evolution = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    'apikey': process.env.EVOLUTION_API_KEY,
    'Content-Type': 'application/json'
  }
})

export async function enviarWhatsApp(numero, mensagem) {
  try {
    const numeroLimpo = numero.replace(/\D/g, '')
    const numeroFormatado = numeroLimpo.startsWith('55')
      ? `${numeroLimpo}@s.whatsapp.net`
      : `55${numeroLimpo}@s.whatsapp.net`

    const { data } = await evolution.post(
      `/message/sendText/${process.env.EVOLUTION_INSTANCE}`,
      { number: numeroFormatado, text: mensagem }
    )

    return { sucesso: true, data }
  } catch (err) {
    console.error('Erro Evolution API:', err.response?.data || err.message)
    return { sucesso: false, erro: err.response?.data || err.message }
  }
}

export async function verificarStatus() {
  try {
    const { data } = await evolution.get(
      `/instance/fetchInstances`
    )
    return data
  } catch (err) {
    return { erro: err.message }
  }
}

export default evolution