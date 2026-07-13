// backend/routes/agendamentoRoutes.js
const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Ao colocar o middleware aqui, protegemos TODAS as rotas abaixo dele
router.use(authMiddleware);

router.post('/', agendamentoController.criar);
// Adicione esta linha junto das outras rotas (pode ser logo abaixo do router.get('/meus', ...))
router.get('/admin/todos', agendamentoController.listarTodos);
router.put('/:id/cancelar', agendamentoController.cancelar);
router.get('/meus', agendamentoController.listarMeus);

module.exports = router;