// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const supabase = require('../config/database'); // Importação do banco

module.exports = async (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ erro: 'Acesso negado. Faça login para continuar.' });
    }

    try {
        const tokenLimpo = token.replace('Bearer ', '');
        const decodificado = jwt.verify(tokenLimpo, process.env.JWT_SECRET || 'chave_super_secreta_senac');

        // CONSULTA DE SEGURANÇA EM TEMPO REAL:
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('is_bloqueado')
            .eq('id', decodificado.id)
            .single();

        if (error || !usuario) {
            return res.status(401).json({ erro: 'Usuário não encontrado no sistema.' });
        }

        if (usuario.is_bloqueado) {
            return res.status(403).json({ erro: 'Sua conta foi suspensa. Entre em contato com a coordenação.' });
        }

        req.usuario = decodificado;
        next();
    } catch (err) {
        return res.status(401).json({ erro: 'Sessão expirada ou inválida. Faça login novamente.' });
    }
};