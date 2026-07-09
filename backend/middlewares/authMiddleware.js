// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Busca o token no cabeçalho da requisição
    const token = req.header('Authorization');

    // Se não tiver token, barra a entrada
    if (!token) {
        return res.status(401).json({ erro: 'Acesso negado. Token não fornecido. Faça login.' });
    }

    try {
        // Verifica se o token é válido e foi gerado pela nossa API
        const tokenLimpo = token.replace('Bearer ', '');
        const decodificado = jwt.verify(tokenLimpo, process.env.JWT_SECRET || 'chave_super_secreta_senac');

        // Pendura os dados do usuário (id, email) na requisição para usarmos no Controller
        req.usuario = decodificado;

        // Libera a passagem para o Controller
        next();
    } catch (erro) {
        res.status(400).json({ erro: 'Token inválido ou expirado.' });
    }
};