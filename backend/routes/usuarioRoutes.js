// backend/routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Definindo os Endpoints
router.post('/registrar', usuarioController.registrar);
router.post('/login', usuarioController.login);
// Adicione estas linhas no final do ficheiro backend/routes/usuarioRoutes.js

// Rotas públicas (não precisam de authMiddleware porque o utilizador esqueceu a senha)
router.post('/esqueci-senha', usuarioController.solicitarRecuperacao);
router.post('/redefinir-senha', usuarioController.redefinirSenha);
module.exports = router;