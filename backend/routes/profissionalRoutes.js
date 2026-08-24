// backend/routes/profissionalRoutes.js
const express = require('express');
const router = express.Router();
const profissionalController = require('../controllers/profissionalController');

const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// Adicione esta linha no seu backend/routes/profissionalRoutes.js

// Rota para o professor dar baixa na presença (concluir o serviço)
router.put(
    '/agendamentos/:id/concluir',
    authMiddleware,
    autorizarPerfis('profissional'),
    profissionalController.concluirAgendamento
);
// A "catraca" RBAC: Apenas utilizadores com o cargo 'profissional' passam por aqui
router.get(
    '/minhas-turmas',
    authMiddleware,
    autorizarPerfis('profissional'),
    profissionalController.minhasTurmas
);

module.exports = router;