// server.js
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require('express');
const cors = require('cors');
const db = require('./backend/config/database');
const usuarioRoutes = require('./backend/routes/usuarioRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Libera o acesso do Front-end
app.use(express.json()); // Ensina o Express a entender requisições no formato JSON

// Rota de teste simples
app.get('/api/status', (req, res) => {
    res.json({ mensagem: "Servidor Connect Senac rodando com sucesso!", status: "OK" });
});

// Usando as rotas na API
// Todas as rotas de usuário terão o prefixo /api/usuarios
app.use('/api/usuarios', usuarioRoutes);

// Iniciando o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}/api/status`);
});
