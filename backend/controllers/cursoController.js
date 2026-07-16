// backend/controllers/cursoController.js
const supabase = require('../config/database');

// Função PÚBLICA: Listar todos os cursos ativos (Para a vitrine do candidato)
exports.listarAtivos = async (req, res) => {
    try {
        const { data: cursos, error } = await supabase
            .from('cursos')
            .select(`
                id, nome, descricao, motivo_modelo, restricoes, foto_url, status,
                usuarios ( nome ) -- Faz o JOIN automático para pegar o nome do professor responsável
            `)
            .eq('status', 'ativo')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(cursos);
    } catch (error) {
        console.error('Erro ao listar cursos:', error.message);
        res.status(500).json({ erro: 'Erro ao buscar o catálogo de cursos.' });
    }
};

// Função RESTRITA (Admin/Coordenador): Criar um novo curso
exports.criar = async (req, res) => {
    const { nome, descricao, motivo_modelo, restricoes, profissional_id } = req.body;

    // Validação básica
    if (!nome || !descricao) {
        return res.status(400).json({ erro: 'Nome e descrição são obrigatórios.' });
    }

    try {
        const { data: novoCurso, error } = await supabase
            .from('cursos')
            .insert([{
                nome,
                descricao,
                motivo_modelo,
                restricoes,
                profissional_id
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            mensagem: 'Curso criado com sucesso!',
            curso: novoCurso[0]
        });
    } catch (error) {
        console.error('Erro ao criar curso:', error.message);
        res.status(500).json({ erro: 'Erro interno ao criar o curso.' });
    }
};

// Atualizar dados de um curso existente
exports.atualizar = async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, motivo_modelo, restricoes, profissional_id } = req.body;

    try {
        const { data, error } = await supabase
            .from('cursos')
            .update({ nome, descricao, motivo_modelo, restricoes, profissional_id })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ mensagem: 'Curso atualizado com sucesso!', curso: data[0] });
    } catch (error) {
        console.error('Erro ao atualizar curso:', error.message);
        res.status(500).json({ erro: 'Erro interno ao atualizar o curso.' });
    }
};

// Arquivar curso (Soft Delete para manter histórico de agendamentos intacto)
exports.arquivar = async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('cursos')
            .update({ status: 'arquivado' })
            .eq('id', id);

        if (error) throw error;
        res.json({ mensagem: 'Curso arquivado com sucesso e removido do catálogo!' });
    } catch (error) {
        console.error('Erro ao arquivar curso:', error.message);
        res.status(500).json({ erro: 'Erro ao remover o curso do catálogo.' });
    }
};
