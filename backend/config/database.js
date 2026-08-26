// backend/config/database.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Buscando e sanitizando as variáveis de ambiente (remove espaços, /rest/v1 e barras finais acidentais)
let supabaseUrl = (process.env.SUPABASE_URL || '').trim();
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
    console.error('ERRO: Credenciais do Supabase ausentes no arquivo .env.');
    process.exit(1);
}

// Criando a instância de conexão com o banco de dados
const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`Conectado ao Supabase (PostgreSQL) com sucesso em: ${supabaseUrl}`);

// Exportamos a instância para ser usada pelos Controllers
module.exports = supabase;