// backend/controllers/usuarioController.js
const supabase = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Biblioteca nativa do Node.js para criptografia

// 1. LÓGICA DE REGISTO (CADASTRO)
exports.registrar = async (req, res) => {
    const { nome, email, telefone, senha, confirmar_senha, consentimento_termos, consentimento_imagem } = req.body;

    // [Funcionalidade 1.2] Validação de Confirmação de Palavra-passe
    if (senha !== confirmar_senha) {
        return res.status(400).json({ erro: 'As palavras-passe não coincidem.' });
    }

    // Validação de LGPD
    if (!consentimento_termos) {
        return res.status(400).json({ erro: 'O consentimento dos termos de uso é obrigatório (LGPD).' });
    }

    try {
        // Verificar se o e-mail já existe no Supabase
        const { data: utilizadorExistente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .maybeSingle(); // Devolve o registo ou nulo se não encontrar

        if (utilizadorExistente) {
            return res.status(400).json({ erro: 'Este e-mail já está em uso.' });
        }

        // Criptografia da palavra-passe
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Inserção de dados no Supabase
        // Nota: O UUID, a data de criação e o perfil 'candidato' são gerados automaticamente pelo Postgres!
        const { data: novoUtilizador, error: erroInsercao } = await supabase
            .from('usuarios')
            .insert([
                {
                    nome,
                    email,
                    telefone,
                    senha: senhaHash,
                    consentimento_termos: consentimento_termos === 1 || consentimento_termos === true,
                    consentimento_imagem: consentimento_imagem === 1 || consentimento_imagem === true
                }
            ])
            .select(); // Força o retorno dos dados inseridos

        if (erroInsercao) throw erroInsercao;

        res.status(201).json({ mensagem: 'Utilizador registado com sucesso!', id: novoUtilizador[0].id });
    } catch (error) {
        console.error('Erro no registo:', error.message);
        res.status(500).json({ erro: 'Erro interno ao processar o registo.' });
    }
};

// 2. LÓGICA DE LOGIN
exports.login = async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Procurar o utilizador pelo e-mail no Supabase
        const { data: utilizador, error: erroBusca } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (erroBusca) throw erroBusca;
        if (!utilizador) return res.status(404).json({ erro: 'Utilizador não encontrado.' });

        // [Funcionalidade 2.2] Verificar se o utilizador está bloqueado pela administração
        if (utilizador.is_bloqueado) {
            return res.status(403).json({ erro: 'A sua conta está temporariamente suspensa. Contacte a coordenação.' });
        }

        // Comparar a palavra-passe digitada com o Hash do banco
        const senhaValida = await bcrypt.compare(senha, utilizador.senha);
        if (!senhaValida) return res.status(401).json({ erro: 'Palavra-passe incorreta.' });

        // Gerar o Token de Autenticação (JWT)
        // Guardamos o 'id' e o 'perfil' (role) dentro do token para o sistema de permissões (RBAC)
        const token = jwt.sign(
            { id: utilizador.id, email: utilizador.email, perfil: utilizador.perfil },
            process.env.JWT_SECRET || 'chave_super_secreta_senac',
            { expiresIn: '24h' }
        );

        res.json({
            mensagem: 'Login realizado com sucesso!',
            token: token,
            utilizador: { nome: utilizador.nome, email: utilizador.email, perfil: utilizador.perfil }
        });
    } catch (error) {
        console.error('Erro no login:', error.message);
        res.status(500).json({ erro: 'Erro interno ao realizar o login.' });
    }
};



// Adicionação de TOKENSSS 
// 3. SOLICITAR RECUPERAÇÃO DE PALAVRA-PASSE
exports.solicitarRecuperacao = async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Verificar se o utilizador existe
        const { data: utilizador, error: erroBusca } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('email', email)
            .maybeSingle();

        if (erroBusca) throw erroBusca;
        if (!utilizador) {
            // Por segurança, não dizemos se o e-mail existe ou não. Devolvemos sucesso sempre.
            return res.json({ mensagem: 'Se o e-mail existir, receberá um link de recuperação.' });
        }

        // 2. Gerar Token Aleatório (64 caracteres Hexadecimais)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 3. Definir expiração (ex: 1 hora a partir de agora)
        const expiraEm = new Date();
        expiraEm.setHours(expiraEm.getHours() + 1);

        // 4. Guardar o token e a expiração no banco
        await supabase
            .from('usuarios')
            .update({
                reset_token: resetToken,
                reset_token_expires: expiraEm.toISOString()
            })
            .eq('id', utilizador.id);

        // 5. Simular o envio de E-mail (No mundo real, usaríamos o Nodemailer aqui)
        // Como o Front-end e Back-end dividem a mesma origem, montamos o link dinamicamente
        const linkRecuperacao = `${req.protocol}://${req.get('host')}/definirSenha.html?token=${resetToken}`;

        console.log(`\n📧 [SIMULAÇÃO DE E-MAIL]`);
        console.log(`Para: ${email}`);
        console.log(`Assunto: Recuperação de Palavra-passe - Connect Senac`);
        console.log(`Link: ${linkRecuperacao}\n`);

        res.json({ mensagem: 'Se o e-mail existir, receberá um link de recuperação.' });

    } catch (error) {
        console.error('Erro na solicitação de recuperação:', error.message);
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

// 4. REDEFINIR A PALAVRA-PASSE
exports.redefinirSenha = async (req, res) => {
    const { token, nova_senha, confirmar_senha } = req.body;

    if (nova_senha !== confirmar_senha) {
        return res.status(400).json({ erro: 'As palavras-passe não coincidem.' });
    }

    try {
        // 1. Procurar o utilizador que tem este token e verificar se ainda é válido (data > agora)
        const agora = new Date().toISOString();
        const { data: utilizador, error: erroBusca } = await supabase
            .from('usuarios')
            .select('id')
            .eq('reset_token', token)
            .gt('reset_token_expires', agora) // Valida se ainda não expirou
            .maybeSingle();

        if (erroBusca || !utilizador) {
            return res.status(400).json({ erro: 'O link de recuperação é inválido ou já expirou.' });
        }

        // 2. Gerar o Hash da nova palavra-passe
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(nova_senha, salt);

        // 3. Atualizar a palavra-passe e limpar os tokens de recuperação
        await supabase
            .from('usuarios')
            .update({
                senha: senhaHash,
                reset_token: null,
                reset_token_expires: null
            })
            .eq('id', utilizador.id);

        res.json({ mensagem: 'Palavra-passe alterada com sucesso! Já pode fazer login.' });

    } catch (error) {
        console.error('Erro ao redefinir palavra-passe:', error.message);
        res.status(500).json({ erro: 'Erro interno ao redefinir a palavra-passe.' });
    }
};