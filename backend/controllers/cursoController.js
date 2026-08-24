// backend/controllers/cursoController.js
const supabase = require('../config/database');

// 1. [VITRINE] Listar todos os cursos ativos (Para o candidato)
exports.listarAtivos = async (req, res) => {
    try {
        const { data: cursos, error } = await supabase
            .from('cursos')
            .select(`id, nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, status, usuarios ( nome )`)
            .eq('status', 'ativo')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(cursos);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar o catálogo.' });
    }
};

// 2. [ADMIN] Listar TODOS os cursos (Ativos e Arquivados para Gestão)
exports.listarTodosAdmin = async (req, res) => {
    try {
        const { data: cursos, error } = await supabase
            .from('cursos')
            .select(`id, nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, status, profissional_id, usuarios ( nome )`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(cursos);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao listar os cursos para a administração.' });
    }
};

// 3. [ADMIN] Criar Curso
exports.criar = async (req, res) => {
    const { nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id } = req.body;

    if (!nome || !descricao || !profissional_id) {
        return res.status(400).json({ erro: 'Nome, descrição e professor são obrigatórios.' });
    }

    try {
        const { data: novoCurso, error } = await supabase
            .from('cursos')
            .insert([{ nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id }])
            .select();

        if (error) throw error;
        res.status(201).json({ mensagem: 'Curso criado com sucesso!', curso: novoCurso[0] });
    } catch (error) {
        res.status(500).json({ erro: 'Erro interno ao criar o curso.' });
    }
};

// 4. [ADMIN] Atualizar Curso
exports.atualizar = async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id } = req.body;

    try {
        const { data, error } = await supabase
            .from('cursos')
            .update({ nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, profissional_id })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ mensagem: 'Curso atualizado com sucesso!', curso: data[0] });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar o curso.' });
    }
};

// 5. [ADMIN] Arquivar Curso (Soft Delete)
exports.arquivar = async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('cursos')
            .update({ status: 'arquivado' })
            .eq('id', id);

        if (error) throw error;
        res.json({ mensagem: 'Curso arquivado e removido da vitrine!' });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao arquivar o curso.' });
    }
};