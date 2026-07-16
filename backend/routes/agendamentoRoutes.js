// backend/routes/agendamentoRoutes.js
const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');

const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// ----------------------------------------------------------------------
// Rotas do Candidato (Qualquer utilizador autenticado)
// ----------------------------------------------------------------------
router.post('/', authMiddleware, agendamentoController.criar);
router.get('/meus', authMiddleware, agendamentoController.listarMeus);
router.put('/:id/cancelar', authMiddleware, agendamentoController.cancelar);

// ----------------------------------------------------------------------
// Rotas Administrativas (Apenas Admin e Coordenador)
// ----------------------------------------------------------------------
router.put(
    '/admin/:id/cancelar',
    authMiddleware,
    autorizarPerfis('admin', 'coordenador'), // Apenas a chefia pode usar este atalho
    agendamentoController.adminCancelar
);

module.exports = router;