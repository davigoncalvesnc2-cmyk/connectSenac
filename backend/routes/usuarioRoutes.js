// backend/routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Definindo os Endpoints
router.post('/registrar', usuarioController.registrar);
router.post('/login', usuarioController.login);

module.exports = router;