// backend/routes/agendamentoRoutes.js
const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Ao colocar o middleware aqui, protegemos TODAS as rotas abaixo dele
router.use(authMiddleware);

router.post('/', agendamentoController.criar);
router.put('/:id/cancelar', agendamentoController.cancelar);
router.get('/meus', agendamentoController.listarMeus);

module.exports = router;