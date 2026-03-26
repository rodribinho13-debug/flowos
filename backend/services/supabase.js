import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: SUPABASE_URL ou SUPABASE_SERVICE_KEY não estão definidos no arquivo .env")
  throw new Error("Supabase URL e/ou Service Key são obrigatórios no .env")
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase