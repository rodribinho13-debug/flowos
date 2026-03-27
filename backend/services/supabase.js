import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  ATENÇÃO: SUPABASE_URL ou SUPABASE_SERVICE_KEY não definidos no .env')
  console.error('   O servidor iniciará, mas chamadas ao banco de dados falharão.')
  console.error('   Copie .env.example para .env e preencha as credenciais.')
}

const supabase = createClient(
  supabaseUrl  || 'http://localhost:54321',
  supabaseKey  || 'missing-key'
)

export default supabase
