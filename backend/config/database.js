// backend/config/database.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Buscando as variáveis de ambiente protegidas
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERRO: Credenciais do Supabase ausentes no arquivo .env.');
    process.exit(1);
}

// Criando a instância de conexão com o banco de dados
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Conectado ao Supabase (PostgreSQL) com sucesso!');

// Exportamos a instância para ser usada pelos Controllers
module.exports = supabase;