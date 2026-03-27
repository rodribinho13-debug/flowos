import express    from 'express'
import cors       from 'cors'
import dotenv     from 'dotenv'
import rateLimit  from 'express-rate-limit'

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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Rate limiters separados — /auth não conta no global
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' }
})
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: (req) => req.path.startsWith('/auth')
})
app.use('/auth', authLimiter)
app.use(globalLimiter)

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() })
)

app.use('/auth',       authRoutes)
app.use('/dashboard',  dashboardRoutes)
app.use('/leads',      leadsRoutes)
app.use('/kpis',       kpisRoutes)
app.use('/mensagens',  mensagensRoutes)
app.use('/export',     exportRoutes)
app.use('/financeiro', financeiroRoutes)
app.use('/rh',         rhRouter)
app.use('/operacoes',  operacoesRoutes)

app.post('/webhook/n8n/:modulo', (req, res) =>
  res.json({ received: true, modulo: req.params.modulo })
)

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
