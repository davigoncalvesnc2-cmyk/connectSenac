// backend/controllers/agendamentoController.js
const supabase = require('../config/database');

// ============================================================================
// LÓGICA DO CANDIDATO
// ============================================================================

// [Funcionalidade] Candidato: Criar Agendamento (Inscrever-se na vaga)
exports.criar = async (req, res) => {
    const { disponibilidade_id } = req.body;
    const usuario_id = req.usuario.id; // Pegamos o ID de quem está logado pelo token!

    if (!disponibilidade_id) {
        return res.status(400).json({ erro: 'O ID da disponibilidade é obrigatório.' });
    }

    try {
        // 1. Verificar se a vaga existe e tem espaço (Regra de Overbooking)
        const { data: disponibilidade, error: erroDisp } = await supabase
            .from('disponibilidades')
            .select('vagas_totais, vagas_ocupadas')
            .eq('id', disponibilidade_id)
            .single();

        if (erroDisp || !disponibilidade) {
            return res.status(404).json({ erro: 'Horário não encontrado.' });
        }

        if (disponibilidade.vagas_ocupadas >= disponibilidade.vagas_totais) {
            return res.status(400).json({ erro: 'Infelizmente, não há mais vagas para este horário.' });
        }

        // 2. Inserir o Agendamento
        const { data: novoAgendamento, error: erroAgendamento } = await supabase
            .from('agendamentos')
            .insert([{ usuario_id, disponibilidade_id, status: 'agendado' }])
            .select();

        if (erroAgendamento) {
            // Se cair na regra UNIQUE do banco de dados (mesmo utilizador e mesma vaga)
            if (erroAgendamento.code === '23505') {
                return res.status(400).json({ erro: 'Você já está agendado para este exato horário!' });
            }
            throw erroAgendamento;
        }

        // 3. Atualizar o contador de vagas ocupadas
        await supabase
            .from('disponibilidades')
            .update({ vagas_ocupadas: disponibilidade.vagas_ocupadas + 1 })
            .eq('id', disponibilidade_id);

        res.status(201).json({
            mensagem: 'Agendamento realizado com sucesso!',
            agendamento: novoAgendamento[0]
        });

    } catch (error) {
        console.error('Erro ao agendar:', error.message);
        res.status(500).json({ erro: 'Erro interno ao realizar agendamento.' });
    }
};

// [Funcionalidade] Candidato: Listar os seus próprios agendamentos
exports.listarMeus = async (req, res) => {
    const usuario_id = req.usuario.id;

    try {
        const { data: meusAgendamentos, error } = await supabase
            .from('agendamentos')
            .select(`
                id, status, created_at,
                disponibilidades (
                    data_hora,
                    cursos ( nome, foto_url )
                )
            `)
            .eq('usuario_id', usuario_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(meusAgendamentos);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error.message);
        res.status(500).json({ erro: 'Erro ao carregar os seus agendamentos.' });
    }
};

// [Funcionalidade] Candidato: Cancelar Agendamento (Com Regra das 2 Horas)
exports.cancelar = async (req, res) => {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    try {
        // Busca o agendamento para verificar a data e o dono
        const { data: agendamento, error: erroBusca } = await supabase
            .from('agendamentos')
            .select('id, status, disponibilidades(data_hora, vagas_ocupadas, id)')
            .eq('id', id)
            .eq('usuario_id', usuario_id) // Garante que o usuário só cancela o DELE
            .single();

        if (erroBusca || !agendamento) {
            return res.status(404).json({ erro: 'Agendamento não encontrado ou não pertence a você.' });
        }

        if (agendamento.status === 'cancelado') {
            return res.status(400).json({ erro: 'Este agendamento já está cancelado.' });
        }

        // Validação da Regra das 2 Horas
        const dataHoraCurso = new Date(agendamento.disponibilidades.data_hora);
        const agora = new Date();
        const diferencaEmHoras = (dataHoraCurso - agora) / (1000 * 60 * 60);

        if (diferencaEmHoras < 2) {
            return res.status(403).json({
                erro: 'Não é possível cancelar com menos de 2 horas de antecedência. Em caso de emergência, contacte a coordenação.'
            });
        }

        // Atualiza status para cancelado
        await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id);

        // Liberta a vaga na tabela de disponibilidades
        await supabase
            .from('disponibilidades')
            .update({ vagas_ocupadas: agendamento.disponibilidades.vagas_ocupadas - 1 })
            .eq('id', agendamento.disponibilidades.id);

        res.json({ mensagem: 'Agendamento cancelado com sucesso. A sua vaga foi libertada.' });
    } catch (error) {
        console.error('Erro ao cancelar:', error.message);
        res.status(500).json({ erro: 'Erro interno ao cancelar o agendamento.' });
    }
};

// ============================================================================
// LÓGICA ADMINISTRATIVA (OVERRIDE)
// ============================================================================

// [Funcionalidade] Admin: Cancelar QUALQUER agendamento sem restrição de tempo
exports.adminCancelar = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: agendamento } = await supabase
            .from('agendamentos')
            .select('id, status, disponibilidades(vagas_ocupadas, id)')
            .eq('id', id)
            .single();

        if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

        // O Admin cancela sem verificar dono e sem verificar a regra das 2 horas!
        await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id);

        await supabase
            .from('disponibilidades')
            .update({ vagas_ocupadas: agendamento.disponibilidades.vagas_ocupadas - 1 })
            .eq('id', agendamento.disponibilidades.id);

        res.json({ mensagem: '[ADMIN] Agendamento cancelado forçadamente.' });
    } catch (error) {
        console.error('Erro no cancelamento admin:', error.message);
        res.status(500).json({ erro: 'Erro interno na operação administrativa.' });
    }
};