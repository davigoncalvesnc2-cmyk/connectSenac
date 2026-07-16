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

// Middlewares
app.use(cors()); 
app.use(express.json()); 
app.use('/api/disponibilidades', disponibilidadeRoutes); 
app.use('/api/cursos', cursoRoutes); 
app.use(express.static(path.join(__dirname, 'frontend')));


app.get('/api/status', (req, res) => {
    res.json({ mensagem: "Servidor Connect Senac rodando com sucesso!", status: "OK" });
});


// Usando as rotas na API
// Todas as rotas de usuário terão o prefixo /api/usuarios
require('./backend/cron/notificador');

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/agendamentos', agendamentoRoutes); 
app.use('/api/dashboard', require('./backend/routes/dashboardRoutes'));
app.use('/api/admin', require('./backend/routes/adminRoutes'));
app.use('/api/profissional', require('./backend/routes/profissionalRoutes'));
app.use('/api/feedbacks', require('./backend/routes/feedbackRoutes'));
// Iniciando o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}/api/status`);
});