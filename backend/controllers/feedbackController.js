// backend/controllers/feedbackController.js
const supabase = require('../config/database');

exports.criar = async (req, res) => {
    const { agendamento_id, nota, comentario } = req.body;
    const usuario_id = req.usuario.id;

    if (!agendamento_id || !nota) {
        return res.status(400).json({ erro: 'O ID do agendamento e a nota são obrigatórios.' });
    }

    if (nota < 1 || nota > 5) {
        return res.status(400).json({ erro: 'A nota deve ser entre 1 e 5.' });
    }

    try {
        // 1. Validar se o agendamento pertence ao utilizador e se está CONCLUÍDO
        const { data: agendamento, error: erroBusca } = await supabase
            .from('agendamentos')
            .select('status, usuario_id')
            .eq('id', agendamento_id)
            .single();

        if (erroBusca || !agendamento) {
            return res.status(404).json({ erro: 'Agendamento não encontrado.' });
        }

        if (agendamento.usuario_id !== usuario_id) {
            return res.status(403).json({ erro: 'Não tem permissão para avaliar este serviço.' });
        }

        if (agendamento.status !== 'concluido') {
            return res.status(400).json({ erro: 'Só é possível avaliar serviços que já foram concluídos.' });
        }

        // 2. Inserir o Feedback
        const { data: novoFeedback, error: erroInsert } = await supabase
            .from('feedbacks')
            .insert([{ agendamento_id, nota, comentario }])
            .select();

        if (erroInsert) {
            // Tratamento da regra UNIQUE do nosso banco (1 feedback por agendamento)
            if (erroInsert.code === '23505') {
                return res.status(400).json({ erro: 'Já enviou uma avaliação para este serviço.' });
            }
            throw erroInsert;
        }

        res.status(201).json({ mensagem: 'Obrigado! A sua avaliação foi registada.', feedback: novoFeedback[0] });

    } catch (error) {
        console.error('Erro ao enviar feedback:', error.message);
        res.status(500).json({ erro: 'Erro interno ao processar a avaliação.' });
    }
};