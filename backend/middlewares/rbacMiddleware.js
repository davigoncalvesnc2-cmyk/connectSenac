// backend/middlewares/rbacMiddleware.js

const autorizarPerfis = (...perfisPermitidos) => {
    return (req, res, next) => {
        // O authMiddleware sempre deve rodar antes deste.
        // Se por algum motivo o usuário não estiver na requisição, barramos por segurança.
        if (!req.usuario || !req.usuario.perfil) {
            return res.status(401).json({ erro: 'Usuário não autenticado ou perfil não identificado.' });
        }

        // Verifica se o perfil do usuário logado está dentro do array de perfis autorizados para a rota
        if (!perfisPermitidos.includes(req.usuario.perfil)) {
            return res.status(403).json({
                erro: 'Acesso restrito. O seu perfil não tem permissão para realizar esta ação.'
            });
        }

        // Se o perfil for compatível, a catraca é liberada!
        next();
    };
};

module.exports = autorizarPerfis;