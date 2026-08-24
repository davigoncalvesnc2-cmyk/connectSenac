// backend/controllers/profissionalController.js
const supabase = require('../config/database');

exports.minhasTurmas = async (req, res) => {
    // O authMiddleware pendurou o ID do utilizador (Professor) na requisição
    const profissional_id = req.usuario.id;

    try {
        const { data: cursos, error } = await supabase
            .from('cursos')
            .select(`
                id, nome,
                disponibilidades (
                    id, data_hora, vagas_totais, vagas_ocupadas,
                    agendamentos (
                        id, status,
                        usuarios ( nome, telefone )
                    )
                )
            `)
            .eq('profissional_id', profissional_id)
            .eq('status', 'ativo')
            .order('data_hora', { foreignTable: 'disponibilidades', ascending: true });

        if (error) throw error;

        res.json(cursos);
    } catch (error) {
        console.error('Erro ao buscar turmas do professor:', error.message);
        res.status(500).json({ erro: 'Erro ao carregar as suas listas de modelos.' });
    }
};

// Adicione no final de backend/controllers/profissionalController.js

exports.concluirAgendamento = async (req, res) => {
    const { id } = req.params;
    const profissional_id = req.usuario.id; // Quem está a tentar fazer a ação

    try {
        // 1. Validação de Segurança (Deep Join):
        // Vamos buscar o agendamento e verificar quem é o professor responsável pelo curso daquela vaga
        const { data: agendamento, error: erroBusca } = await supabase
            .from('agendamentos')
            .select('id, status, disponibilidades(cursos(profissional_id))')
            .eq('id', id)
            .single();

        if (erroBusca || !agendamento) {
            return res.status(404).json({ erro: 'Agendamento não encontrado.' });
        }

        // A "Catraca" de Propriedade: O ID do professor do curso bate com o ID de quem está logado?
        if (agendamento.disponibilidades.cursos.profissional_id !== profissional_id) {
            return res.status(403).json({ erro: 'Não tem permissão para alterar a pauta de outro professor.' });
        }

        if (agendamento.status !== 'agendado') {
            return res.status(400).json({ erro: `Este agendamento não pode ser concluído pois já está: ${agendamento.status}` });
        }

        // 2. Efetivar a Conclusão
        const { error: erroUpdate } = await supabase
            .from('agendamentos')
            .update({ status: 'concluido' })
            .eq('id', id);

        if (erroUpdate) throw erroUpdate;

        res.json({ mensagem: 'Atendimento concluído com sucesso! O modelo já pode avaliar o serviço.' });

    } catch (error) {
        console.error('Erro ao concluir agendamento:', error.message);
        res.status(500).json({ erro: 'Erro interno ao processar a pauta de presença.' });
    }
};