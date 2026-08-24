// server.js
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require('express');
const cors = require('cors');
const db = require('./backend/config/database');
const usuarioRoutes = require('./backend/routes/usuarioRoutes');
const cursoRoutes = require('./backend/routes/cursoRoutes'); 
const agendamentoRoutes = require('./backend/routes/agendamentoRoutes'); 
const disponibilidadeRoutes = require('./backend/routes/disponibilidadeRoutes'); 

const path = require('path'); // Adicione esta linha para lidar com caminhos de pastas

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(cors()); 
app.use(express.json()); 

// Servir arquivos estáticos do Frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Healthcheck
app.get('/api/status', (req, res) => {
    res.json({ mensagem: "Servidor Connect Senac rodando com sucesso!", status: "OK" });
});

// Inicialização do Motor de Notificações em Background
require('./backend/cron/notificador');

// Agrupamento de Rotas da API REST
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/cursos', cursoRoutes); 
app.use('/api/disponibilidades', disponibilidadeRoutes); 
app.use('/api/agendamentos', agendamentoRoutes); 
app.use('/api/dashboard', require('./backend/routes/dashboardRoutes'));
app.use('/api/admin', require('./backend/routes/adminRoutes'));
app.use('/api/profissional', require('./backend/routes/profissionalRoutes'));
app.use('/api/feedbacks', require('./backend/routes/feedbackRoutes'));

// Rota 404 para endpoints não encontrados da API
app.use('/api', (req, res) => {
    res.status(404).json({ erro: 'Endpoint da API não encontrado.' });
});

// Middleware Global de Tratamento de Erros
app.use((err, req, res, next) => {
    console.error('❌ [ERRO INTERNO]:', err.stack || err.message);
    res.status(err.status || 500).json({
        erro: err.message || 'Ocorreu um erro interno no servidor.'
    });
});

// Iniciando o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Connect Senac rodando na porta ${PORT}`);
    console.log(`🌐 Acesso Web: http://localhost:${PORT}`);
    console.log(`📡 Status API: http://localhost:${PORT}/api/status`);
});