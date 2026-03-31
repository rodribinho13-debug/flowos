import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function gerarMensagemIA(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um assistente de IA para gerar mensagens de prospecção B2B. Seja conciso, profissional e persuasivo. Retorne apenas o texto da mensagem." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    })
    return response.choices[0].message.content
  } catch (error) {
    console.error("Erro ao gerar mensagem com IA:", error)
    throw new Error("Falha ao gerar mensagem com IA.")
  }
}

// ── Gerar mensagem de lembrete / comunicado para gestores ─────
// tipo: 'reuniao' | 'cobranca' | 'prazo' | 'aniversario' | 'meta' | 'custom'
export async function gerarLembrete({ tipo, dados, tom = 'profissional' }) {
  const SYSTEM = `Você é um assistente especializado em comunicação corporativa.
Gere mensagens curtas, diretas e no tom indicado (${tom}).
Retorne APENAS o texto da mensagem, sem explicações adicionais.
Use emojis com moderação. Máximo 3 parágrafos curtos.`

  const CONTEXTOS = {
    reuniao:     `Lembrete de reunião com os dados: ${JSON.stringify(dados)}`,
    cobranca:    `Mensagem de cobrança amigável com os dados: ${JSON.stringify(dados)}`,
    prazo:       `Lembrete de prazo/vencimento com os dados: ${JSON.stringify(dados)}`,
    aniversario: `Mensagem de aniversário/felicitação com os dados: ${JSON.stringify(dados)}`,
    meta:        `Comunicado sobre meta/resultado atingido com os dados: ${JSON.stringify(dados)}`,
    custom:      dados.instrucao || JSON.stringify(dados),
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user',   content: CONTEXTOS[tipo] || CONTEXTOS.custom },
      ],
      temperature: 0.65,
      max_tokens: 300,
    })
    return response.choices[0].message.content
  } catch (err) {
    console.error('Erro ao gerar lembrete:', err)
    throw new Error('Falha ao gerar mensagem.')
  }
}

export async function analisarDadosSemana(dados) {
  try {
    const prompt = `Analise os seguintes dados do módulo ${dados.modulo} para a semana e forneça um resumo executivo com insights e sugestões de ações. Use emojis e seja direto. Dados: ${JSON.stringify(dados)}`
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um analista de negócios sênior. Analise os dados da semana e produza um relatório executivo em 5 tópicos com emojis, focado em ações concretas." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: "json_object" },
    })
    return JSON.parse(response.choices[0].message.content)
  } catch (error) {
    console.error("Erro ao analisar dados com IA:", error)
    throw new Error("Falha ao analisar dados com IA.")
  }
}