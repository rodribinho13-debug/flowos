// ══════════════════════════════════════════════════════════════
// FlowOS – API Service
// Conecta ao backend em http://localhost:3001
// ══════════════════════════════════════════════════════════════

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── Token helpers ────────────────────────────────────────────
export const getToken  = ()        => localStorage.getItem('flowos_token')
export const setToken  = (t)       => localStorage.setItem('flowos_token', t)
export const clearToken = ()       => localStorage.removeItem('flowos_token')
export const getUsuario = ()       => {
  try { return JSON.parse(localStorage.getItem('flowos_usuario') || 'null') }
  catch { return null }
}
export const setUsuario = (u)      => localStorage.setItem('flowos_usuario', JSON.stringify(u))
export const clearUsuario = ()     => localStorage.removeItem('flowos_usuario')

// ─── Fetch base ───────────────────────────────────────────────
async function req(method, path, body, isFormData = false) {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const opts = { method, headers }
  if (body) opts.body = isFormData ? body : JSON.stringify(body)

  const res = await fetch(`${API_URL}${path}`, opts)

  if (res.status === 401) {
    clearToken()
    clearUsuario()
    window.location.href = '/login'
    return
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
export const authApi = {
  login: async (email, senha) => {
    const data = await req('POST', '/auth/login', { email, senha })
    if (data?.token) {
      setToken(data.token)
      setUsuario(data.usuario)
    }
    return data
  },
  cadastro: async (dados) => {
    const data = await req('POST', '/auth/cadastro', dados)
    if (data?.token) {
      setToken(data.token)
      setUsuario(data.usuario)
    }
    return data
  },
  logout: () => {
    clearToken()
    clearUsuario()
    window.location.href = '/login'
  },
  isLogado: () => !!getToken()
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
export const dashboardApi = {
  get: () => req('GET', '/dashboard')
}

// ══════════════════════════════════════════════════════════════
// KPIs
// ══════════════════════════════════════════════════════════════
export const kpisApi = {
  listar:     ()              => req('GET', '/kpis'),
  criar:      (dados)         => req('POST', '/kpis', dados),
  atualizar:  (id, dados)     => req('PATCH', `/kpis/${id}`, dados),
  deletar:    (id)            => req('DELETE', `/kpis/${id}`),
  registrar:  (id, dados)     => req('POST', `/kpis/${id}/registros`, dados),
}

// ══════════════════════════════════════════════════════════════
// LEADS & CRM
// ══════════════════════════════════════════════════════════════
export const leadsApi = {
  listar: (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString()
    return req('GET', `/leads?${params}`)
  },
  regioes:        ()              => req('GET', '/leads/regioes'),
  atualizarStatus:(id, dados)     => req('PATCH', `/leads/${id}/status`, dados),
  campanhas:      ()              => req('GET', '/leads/campanhas'),
  criarCampanha:  (dados)         => req('POST', '/leads/campanhas', dados),
}

// ══════════════════════════════════════════════════════════════
// MENSAGENS
// ══════════════════════════════════════════════════════════════
export const mensagensApi = {
  listar: (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString()
    return req('GET', `/mensagens?${params}`)
  },
  enviarWhatsApp: (dados)     => req('POST', '/mensagens/whatsapp', dados),
  gerar:          (dados)     => req('POST', '/mensagens/gerar', dados),
  lembrete:       (dados)     => req('POST', '/mensagens/lembrete', dados),
  templates:      ()          => req('GET', '/mensagens/templates'),
  criarTemplate:  (dados)     => req('POST', '/mensagens/templates', dados),
}

// ══════════════════════════════════════════════════════════════
// FINANCEIRO
// ══════════════════════════════════════════════════════════════
export const financeiroApi = {
  lancamentos: (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString()
    return req('GET', `/financeiro/lancamentos?${params}`)
  },
  criar:        (dados)         => req('POST', '/financeiro/lancamentos', dados),
  atualizar:    (id, dados)     => req('PATCH', `/financeiro/lancamentos/${id}`, dados),
  deletar:      (id)            => req('DELETE', `/financeiro/lancamentos/${id}`),
  dre:          (ano)           => req('GET', `/financeiro/dre?ano=${ano}`),
  fluxoCaixa:   (inicio, fim)   => req('GET', `/financeiro/fluxo-caixa?inicio=${inicio}&fim=${fim}`),
  importar: (arquivo, modulo = 'financeiro') => {
    const form = new FormData()
    form.append('arquivo', arquivo)
    form.append('modulo', modulo)
    return req('POST', '/financeiro/importar', form, true)
  },
  modeloUrl: () => `${API_URL}/financeiro/modelo-planilha?token=${getToken()}`,
}

// ══════════════════════════════════════════════════════════════
// RH
// ══════════════════════════════════════════════════════════════
export const rhApi = {
  funcionarios: (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString()
    return req('GET', `/rh/funcionarios?${params}`)
  },
  criar:          (dados)       => req('POST', '/rh/funcionarios', dados),
  atualizar:      (id, dados)   => req('PATCH', `/rh/funcionarios/${id}`, dados),
  ponto:          (dados)       => req('POST', '/rh/ponto', dados),
  calcularFolha:  (mes, ano)    => req('POST', '/rh/folha/calcular', { mes, ano }),
  folha:          (mes, ano)    => req('GET', `/rh/folha?mes=${mes}&ano=${ano}`),
  modeloUrl: () => `${API_URL}/rh/modelo-planilha?token=${getToken()}`,
}

// ══════════════════════════════════════════════════════════════
// OPERAÇÕES
// ══════════════════════════════════════════════════════════════
export const operacoesApi = {
  produtos: (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString()
    return req('GET', `/operacoes/produtos?${params}`)
  },
  criarProduto: (dados)       => req('POST', '/operacoes/produtos', dados),
  os: (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString()
    return req('GET', `/operacoes/os?${params}`)
  },
  criarOS:    (dados)         => req('POST', '/operacoes/os', dados),
  atualizarOS:(id, dados)     => req('PATCH', `/operacoes/os/${id}`, dados),
}

// ══════════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════════
export const exportApi = {
  csvUrl:     (tipo, filtros = {}) => `${API_URL}/export/csv/${tipo}?${new URLSearchParams(filtros)}`,
  excelUrl:   (tipo, filtros = {}) => `${API_URL}/export/excel/${tipo}?${new URLSearchParams(filtros)}`,
  powerbiUrl: (tipo)               => `${API_URL}/export/powerbi/${tipo}`,
  baixar: async (tipo, formato, filtros = {}) => {
    const url = formato === 'csv'
      ? exportApi.csvUrl(tipo, filtros)
      : exportApi.excelUrl(tipo, filtros)
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `flowos_${tipo}.${formato}`
    a.click()
  },

  baixarWorkbookBI: async () => {
    const res = await fetch(`${API_URL}/export/powerbi-workbook`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao gerar arquivo')
    }
    const blob = await res.blob()
    const header = res.headers.get('Content-Disposition') || ''
    const nomeMatch = header.match(/filename="(.+)"/)
    const nome = nomeMatch ? nomeMatch[1] : 'FlowOS_PowerBI.xlsx'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = nome
    a.click()
  },

  gerarDashboardHTML: async (dados) => {
    const res = await fetch(`${API_URL}/export/dashboard-html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(dados)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao gerar dashboard')
    }
    const blob = await res.blob()
    const header = res.headers.get('Content-Disposition') || ''
    const nomeMatch = header.match(/filename="(.+)"/)
    const nome = nomeMatch ? nomeMatch[1] : 'dashboard.html'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = nome
    a.click()
  }
}

// ══════════════════════════════════════════════════════════════
// PROSPECÇÃO
// ══════════════════════════════════════════════════════════════
export const prospeccaoApi = {
  consultarCNPJ: (cnpj)        => req('GET', `/prospeccao/cnpj/${cnpj}`),
  listar:        (filtros = {}) => req('GET', `/prospeccao?${new URLSearchParams(filtros)}`),
  salvar:        (dados)        => req('POST', '/prospeccao', dados),
  atualizar:     (id, dados)    => req('PATCH', `/prospeccao/${id}`, dados),
  remover:       (id)           => req('DELETE', `/prospeccao/${id}`),
}

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ══════════════════════════════════════════════════════════════
export const configuracoesApi = {
  whatsapp:           ()  => req('GET',  '/configuracoes/whatsapp'),
  whatsappStatus:     ()  => req('GET',  '/configuracoes/whatsapp/status'),
  whatsappQRCode:     ()  => req('GET',  '/configuracoes/whatsapp/qrcode'),
  whatsappDesconectar:()  => req('POST', '/configuracoes/whatsapp/desconectar'),
}

// ══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════
export const healthCheck = () =>
  fetch(`${API_URL}/health`).then(r => r.json()).catch(() => ({ status: 'offline' }))

export default {
  auth: authApi,
  prospeccao: prospeccaoApi,
  configuracoes: configuracoesApi,
  dashboard: dashboardApi,
  kpis: kpisApi,
  leads: leadsApi,
  mensagens: mensagensApi,
  financeiro: financeiroApi,
  rh: rhApi,
  operacoes: operacoesApi,
  export: exportApi,
  healthCheck
}
