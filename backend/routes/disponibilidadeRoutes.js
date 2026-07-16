// backend/routes/disponibilidadeRoutes.js
const express = require('express');
const router = express.Router();
const disponibilidadeController = require('../controllers/disponibilidadeController');

const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// Qualquer usuário logado pode ver os horários de um curso específico
router.get('/curso/:curso_id', authMiddleware, disponibilidadeController.listarPorCurso);

// Apenas a administração e coordenação podem criar novas grades de horários
router.post('/', authMiddleware, autorizarPerfis('admin', 'coordenador'), disponibilidadeController.criar);

module.exports = router;