// backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// Rota estritamente administrativa
router.get(
    '/metricas',
    authMiddleware,
    autorizarPerfis('admin', 'coordenador'),
    dashboardController.obterMetricas
);

module.exports = router;