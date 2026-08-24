// backend/routes/cursoRoutes.js
const express = require('express');
const router = express.Router();
const cursoController = require('../controllers/cursoController');
const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// Rota Aberta (Vitrine)
router.get('/ativos', authMiddleware, cursoController.listarAtivos);

// Nova Rota Restrita (Gestão Completa)
router.get('/admin', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.listarTodosAdmin);

// Rotas de Criação e Edição
router.post('/', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.criar);
router.put('/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.atualizar);
router.delete('/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.arquivar);

module.exports = router;