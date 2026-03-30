// ══════════════════════════════════════════════════════════════
// FlowOS – server.js  (salve como "server.js", não "server.js.js")
// ══════════════════════════════════════════════════════════════
import express    from 'express'
import cors       from 'cors'
import dotenv     from 'dotenv'
import rateLimit  from 'express-rate-limit'   // ← import NO TOPO (ES Modules exige)

import authRoutes       from './routes/auth.js'
import dashboardRoutes  from './routes/dashboard.js'
import leadsRoutes      from './routes/leads.js'
import kpisRoutes       from './routes/kpis.js'
import mensagensRoutes  from './routes/mensagens.js'
import exportRoutes     from './routes/export.js'
import financeiroRoutes from './routes/financeiro.js'
import { rhRouter }     from './routes/financeiro.js'
import operacoesRoutes  from './routes/operacoes.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3001

// ─── Middlewares ──────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ─── Rate Limiting ────────────────────────────────────────
// /auth tem limiter próprio; o geral ignora /auth para evitar double-limiting
app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }))
app.use((req, res, next) => {
  if (req.path.startsWith('/auth')) return next()
  return rateLimit({ windowMs: 15 * 60 * 1000, max: 200 })(req, res, next)
})

// ─── Health check ─────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() })
)

// ─── Rotas ────────────────────────────────────────────────
app.use('/auth',       authRoutes)        // POST /auth/login   POST /auth/cadastro
app.use('/dashboard',  dashboardRoutes)   // GET  /dashboard
app.use('/leads',      leadsRoutes)
app.use('/kpis',       kpisRoutes)
app.use('/mensagens',  mensagensRoutes)
app.use('/export',     exportRoutes)
app.use('/financeiro', financeiroRoutes)
app.use('/rh',         rhRouter)
app.use('/operacoes',  operacoesRoutes)

// ─── Webhook N8N ─────────────────────────────────────────
app.post('/webhook/n8n/:modulo', (req, res) =>
  res.json({ received: true, modulo: req.params.modulo })
)

// ─── Error handler ────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERRO]', err.message)
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  })
})

app.listen(PORT, () => {
  console.log(`✅ FlowOS Backend rodando em http://localhost:${PORT}`)
  console.log(`   Ambiente : ${process.env.NODE_ENV}`)
  console.log(`   Supabase : ${process.env.SUPABASE_URL ? '✓ configurado' : '✗ FALTANDO'}`)
})
