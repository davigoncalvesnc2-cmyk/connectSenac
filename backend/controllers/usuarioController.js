// backend/controllers/usuarioController.js
const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Função para Cadastrar Usuário
exports.registrar = async (req, res) => {
    const { nome, email, telefone, senha, consentimento_termos, consentimento_imagem } = req.body;

    // Validação básica de LGPD
    if (!consentimento_termos) {
        return res.status(400).json({ erro: 'O consentimento dos termos de uso é obrigatório (LGPD).' });
    }

    try {
        // Criptografando a senha antes de salvar no banco (NUNCA salve senhas em texto puro!)
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        const query = `INSERT INTO usuarios (nome, email, telefone, senha, consentimento_termos, consentimento_imagem)
                       VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(query, [nome, email, telefone, senhaHash, consentimento_termos, consentimento_imagem], function(err){
            if (err) {
                // Erro comum: E-mail já cadastrado (UNIQUE constraint)
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ erro: 'Este e-mail já está em uso.' });
                }
                return res.status(500).json({ erro: 'Erro interno ao cadastrar usuário.' });
            }
            res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', id: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao processar o cadastro.' });
    }
};

// Função para Fazer Login
exports.login = (req, res) => {
    const { email, senha } = req.body;

    const query = `SELECT * FROM usuarios WHERE email = ?`;

    db.get(query, [email], async (err, usuario) => {
        if (err) return res.status(500).json({ erro: 'Erro no servidor.' });
        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });

        // Compara a senha digitada com o Hash salvo no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) return res.status(401).json({ erro: 'Senha incorreta.' });

        // Gera o Token de Autenticação (JWT)
        // Usamos uma chave secreta (idealmente vinda do .env) para assinar o token
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email },
            process.env.JWT_SECRET || 'chave_super_secreta_senac',
            { expiresIn: '24h' } // O token expira em 1 dia
        );

        res.json({
            mensagem: 'Login realizado com sucesso!',
            token: token,
            usuario: { nome: usuario.nome, email: usuario.email }
        });
    });
};