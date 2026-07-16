// backend/routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apenas utilizadores autenticados podem enviar feedbacks
router.post('/', authMiddleware, feedbackController.criar);

module.exports = router;