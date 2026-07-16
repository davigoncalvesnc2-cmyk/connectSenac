// backend/routes/cursoRoutes.js
const express = require('express');
const router = express.Router();
const cursoController = require('../controllers/cursoController');

// Importando os nossos seguranças
const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// ----------------------------------------------------------------------
// Rota Aberta para Logados: Qualquer um com token pode ver a vitrine
// ----------------------------------------------------------------------
router.get('/ativos', authMiddleware, cursoController.listarAtivos);

// ----------------------------------------------------------------------
// Rotas Protegidas: Apenas a coordenação e a administração podem criar cursos
// ----------------------------------------------------------------------
router.post(
    '/',
    authMiddleware,
    autorizarPerfis('admin', 'coordenador'), // <-- O RBAC EM AÇÃO AQUI!
    cursoController.criar
);

// Apenas Admin e Coordenador podem alterar ou arquivar os cursos
router.put('/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.atualizar);
router.delete('/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.arquivar);

module.exports = router;

module.exports = router;