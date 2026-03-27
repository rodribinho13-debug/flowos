const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const getToken   = ()  => localStorage.getItem('flowos_token')
export const setToken   = (t) => localStorage.setItem('flowos_token', t)
export const clearToken  = () => localStorage.removeItem('flowos_token')
export const getUsuario  = () => {
  try { return JSON.parse(localStorage.getItem('flowos_usuario') || 'null') }
  catch { return null }
}
export const setUsuario  = (u) => localStorage.setItem('flowos_usuario', JSON.stringify(u))
export const clearUsuario = () => localStorage.removeItem('flowos_usuario')

async function req(method, path, body, isFormData = false) {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFormData) headers['Content-Type'] = 'application/json'
  const opts = { method, headers }
  if (body) opts.body = isFormData ? body : JSON.stringify(body)

  const res = await fetch(`${API_URL}${path}`, opts)
  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    clearToken()
    clearUsuario()
    // Rotas de auth jogam o erro — outras redirecionam para login
    if (!path.startsWith('/auth')) { window.location.href = '/login'; return }
    throw new Error(data.error || 'Não autorizado.')
  }

  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

export const authApi = {
  login: async (email, senha) => {
    const data = await req('POST', '/auth/login', { email, senha })
    if (data?.token) { setToken(data.token); setUsuario(data.usuario) }
    return data
  },
  cadastro: async (dados) => {
    const data = await req('POST', '/auth/cadastro', dados)
    if (data?.token) { setToken(data.token); setUsuario(data.usuario) }
    return data
  },
  logout: () => { clearToken(); clearUsuario(); window.location.href = '/login' },
  isLogado: () => !!getToken()
}

export const dashboardApi = { get: () => req('GET', '/dashboard') }

export const kpisApi = {
  listar:    ()          => req('GET', '/kpis'),
  criar:     (d)         => req('POST', '/kpis', d),
  atualizar: (id, d)     => req('PUT', `/kpis/${id}`, d),
  deletar:   (id)        => req('DELETE', `/kpis/${id}`),
  registrar: (id, d)     => req('POST', `/kpis/${id}/registros`, d),
}

export const leadsApi = {
  listar: (f = {})       => req('GET', `/leads?${new URLSearchParams(f)}`),
  regioes:         ()    => req('GET', '/leads/regioes'),
  atualizarStatus: (id,d)=> req('PATCH', `/leads/${id}/status`, d),
  campanhas:       ()    => req('GET', '/leads/campanhas'),
  criarCampanha:   (d)   => req('POST', '/leads/campanhas', d),
}

export const mensagensApi = {
  listar: (f = {})       => req('GET', `/mensagens?${new URLSearchParams(f)}`),
  enviarWhatsApp: (d)    => req('POST', '/mensagens/whatsapp', d),
  gerar:          (d)    => req('POST', '/mensagens/gerar', d),
  templates:      ()     => req('GET', '/mensagens/templates'),
  criarTemplate:  (d)    => req('POST', '/mensagens/templates', d),
}

export const financeiroApi = {
  lancamentos: (f = {})  => req('GET', `/financeiro/lancamentos?${new URLSearchParams(f)}`),
  criar:      (d)        => req('POST', '/financeiro/lancamentos', d),
  atualizar:  (id, d)    => req('PATCH', `/financeiro/lancamentos/${id}`, d),
  deletar:    (id)       => req('DELETE', `/financeiro/lancamentos/${id}`),
  dre:        (ano)      => req('GET', `/financeiro/dre?ano=${ano}`),
  fluxoCaixa: (i, f)     => req('GET', `/financeiro/fluxo-caixa?inicio=${i}&fim=${f}`),
  importar: (arquivo, modulo = 'financeiro') => {
    const form = new FormData()
    form.append('arquivo', arquivo)
    form.append('modulo', modulo)
    return req('POST', '/financeiro/importar', form, true)
  },
  modeloUrl: () => `${API_URL}/financeiro/modelo-planilha?token=${getToken()}`,
}

export const rhApi = {
  funcionarios: (f = {}) => req('GET', `/rh/funcionarios?${new URLSearchParams(f)}`),
  criar:         (d)     => req('POST', '/rh/funcionarios', d),
  atualizar:     (id, d) => req('PATCH', `/rh/funcionarios/${id}`, d),
  ponto:         (d)     => req('POST', '/rh/ponto', d),
  calcularFolha: (m, a)  => req('POST', '/rh/folha/calcular', { mes: m, ano: a }),
  folha:         (m, a)  => req('GET', `/rh/folha?mes=${m}&ano=${a}`),
  modeloUrl: () => `${API_URL}/rh/modelo-planilha?token=${getToken()}`,
}

export const operacoesApi = {
  produtos: (f = {})     => req('GET', `/operacoes/produtos?${new URLSearchParams(f)}`),
  criarProduto: (d)      => req('POST', '/operacoes/produtos', d),
  os: (f = {})           => req('GET', `/operacoes/os?${new URLSearchParams(f)}`),
  criarOS:     (d)       => req('POST', '/operacoes/os', d),
  atualizarOS: (id, d)   => req('PATCH', `/operacoes/os/${id}`, d),
}

export const exportApi = {
  csvUrl:     (tipo, f={}) => `${API_URL}/export/csv/${tipo}?${new URLSearchParams(f)}`,
  excelUrl:   (tipo, f={}) => `${API_URL}/export/excel/${tipo}?${new URLSearchParams(f)}`,
  powerbiUrl: (tipo)       => `${API_URL}/export/powerbi/${tipo}`,
  baixar: async (tipo, formato, f = {}) => {
    const url = formato === 'csv' ? exportApi.csvUrl(tipo, f) : exportApi.excelUrl(tipo, f)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `flowos_${tipo}.${formato}`
    a.click()
  }
}

export const healthCheck = () =>
  fetch(`${API_URL}/health`).then(r => r.json()).catch(() => ({ status: 'offline' }))

export default { auth: authApi, dashboard: dashboardApi, kpis: kpisApi, leads: leadsApi,
  mensagens: mensagensApi, financeiro: financeiroApi, rh: rhApi, operacoes: operacoesApi,
  export: exportApi, healthCheck }
