// backend/controllers/dashboardController.js
const supabase = require('../config/database');

exports.obterMetricas = async (req, res) => {
    try {
        // Utilizamos Promise.all para executar todas as consultas ao banco SIMULTANEAMENTE,
        // em vez de esperar uma terminar para começar a outra. (Ganho enorme de performance!)
        const [usuariosResult, cursosResult, agendamentosResult] = await Promise.all([
            // Conta apenas o total de usuários cadastrados (sem baixar os dados todos)
            supabase.from('usuarios').select('*', { count: 'exact', head: true }),

            // Conta os cursos ativos
            supabase.from('cursos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),

            // Baixa apenas a coluna 'status' dos agendamentos para fazermos a contagem em memória
            supabase.from('agendamentos').select('status')
        ]);

        if (usuariosResult.error) throw usuariosResult.error;
        if (cursosResult.error) throw cursosResult.error;
        if (agendamentosResult.error) throw agendamentosResult.error;

        // Processamento (Reduce/Filter) dos dados em memória
        const agendamentos = agendamentosResult.data || [];
        const metricasAgendamentos = {
            total: agendamentos.length,
            agendados: agendamentos.filter(a => a.status === 'agendado').length,
            concluidos: agendamentos.filter(a => a.status === 'concluido').length,
            cancelados: agendamentos.filter(a => a.status === 'cancelado').length,
        };

        // Calculando a taxa de absenteísmo/cancelamento
        const taxaCancelamento = metricasAgendamentos.total > 0
            ? ((metricasAgendamentos.cancelados / metricasAgendamentos.total) * 100).toFixed(1)
            : 0;

        res.json({
            totalUsuarios: usuariosResult.count || 0,
            totalCursosAtivos: cursosResult.count || 0,
            agendamentos: metricasAgendamentos,
            taxaCancelamento: `${taxaCancelamento}%`
        });

    } catch (error) {
        console.error('Erro ao buscar métricas do dashboard:', error.message);
        res.status(500).json({ erro: 'Erro interno ao processar as métricas.' });
    }
};