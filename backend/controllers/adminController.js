// backend/controllers/adminController.js
const supabase = require('../config/database');
const bcrypt = require('bcrypt');

// 1. Listar utilizadores com métricas (consome a nossa nova View)
exports.listarUtilizadores = async (req, res) => {
    try {
        const { data: utilizadores, error } = await supabase
            .from('view_usuarios_estatisticas')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;
        res.json(utilizadores);
    } catch (error) {
        console.error('Erro ao listar utilizadores:', error.message);
        res.status(500).json({ erro: 'Erro ao carregar a lista de utilizadores.' });
    }
};

// 2. Bloquear / Desbloquear utilizador (Moderação)
exports.alterarStatusBloqueio = async (req, res) => {
    const { id } = req.params;
    const { is_bloqueado } = req.body;

    try {
        const { data, error } = await supabase
            .from('usuarios')
            .update({ is_bloqueado })
            .eq('id', id)
            .select();

        if (error) throw error;

        const acao = is_bloqueado ? 'bloqueado' : 'desbloqueado';
        res.json({ mensagem: `Utilizador ${acao} com sucesso!`, utilizador: data[0] });
    } catch (error) {
        console.error('Erro ao moderar utilizador:', error.message);
        res.status(500).json({ erro: 'Erro ao alterar o estado do utilizador.' });
    }
};

// 3. Criar Novo Colaborador (Apenas administradores podem fazer isto)
exports.criarColaborador = async (req, res) => {
    const { nome, email, telefone, senha, perfil } = req.body;

    if (!nome || !email || !telefone || !senha || !perfil) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    if (!['admin', 'coordenador', 'profissional'].includes(perfil)) {
        return res.status(400).json({ erro: 'Perfil de colaborador inválido.' });
    }

    try {
        // Verificar se e-mail já existe
        const { data: existente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existente) {
            return res.status(400).json({ erro: 'Este e-mail já está registado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        const { data: novoColab, error } = await supabase
            .from('usuarios')
            .insert([{
                nome,
                email,
                telefone,
                senha: senhaHash,
                perfil,
                consentimento_termos: true, // Colaboradores institucionais
                consentimento_imagem: false
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            mensagem: `Colaborador (${perfil}) criado com sucesso!`,
            colaborador: { id: novoColab[0].id, nome: novoColab[0].nome }
        });
    } catch (error) {
        console.error('Erro ao criar colaborador:', error.message);
        res.status(500).json({ erro: 'Erro interno ao criar colaborador.' });
    }
};
// 4 Buscar profissionais (professores) ativos para carregar no dropdown do formulário de curso

exports.listarProfissionais = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('perfil', 'profissional')
            .eq('is_bloqueado', false);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao carregar profissionais.' });
    }
};
exports.excluirUsuario = async (req, res) => {
    const { id } = req.params;
    const executorPerfil = req.usuario.perfil; // Quem está solicitando a exclusão
    const executorId = req.usuario.id;

    if (id === executorId) {
        return res.status(400).json({ erro: 'Você não pode excluir sua própria conta por este painel.' });
    }

    try {
        // 1. Verificar o perfil do usuário alvo
        const { data: alvo, error: erroBusca } = await supabase
            .from('usuarios')
            .select('perfil')
            .eq('id', id)
            .single();

        if (erroBusca || !alvo) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }

        // 2. Aplicar regras restritivas do RBAC
        if (executorPerfil === 'coordenador' && alvo.perfil !== 'candidato') {
            return res.status(403).json({ erro: 'Coordenadores só possuem permissão para excluir contas de candidatos.' });
        }

        // 3. Executar deleção (O banco em cascata limpa agendamentos associados)
        const { error: erroExclusao } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', id);

        if (erroExclusao) throw erroExclusao;

        res.json({ mensagem: 'Usuário excluído do sistema com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error.message);
        res.status(500).json({ erro: 'Erro interno ao realizar exclusão.' });
    }
};