// backend/cron/notificador.js
const cron = require('node-cron');
const supabase = require('../config/database');

// Expressão CRON: '* * * * *' significa "Executar a cada minuto"
// Na vida real, poderíamos usar '0 * * * *' (a cada hora) ou '0 8 * * *' (todos os dias às 08h00)
cron.schedule('* * * * *', async () => {
    console.log('🤖 [CRON] A executar varredura de notificações de agendamentos...');

    try {
        const agora = new Date();

        // Calcula o limite: daqui a exatas 24 horas
        const daquiA24Horas = new Date(agora.getTime() + (24 * 60 * 60 * 1000));
        const limiteInferior = agora.toISOString();
        const limiteSuperior = daquiA24Horas.toISOString();

        // 1. Procurar agendamentos confirmados que acontecem nas próximas 24h
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select(`
                id,
                status,
                usuarios ( nome, email, telefone ),
                disponibilidades ( data_hora, cursos ( nome ) )
            `)
            .eq('status', 'agendado')
            // Filtro de tempo: data_hora é MAIOR que agora, mas MENOR que amanhã à mesma hora
            .gt('disponibilidades.data_hora', limiteInferior)
            .lt('disponibilidades.data_hora', limiteSuperior);

        if (error) throw error;

        if (!agendamentos || agendamentos.length === 0) {
            return; // Nada a fazer, encerra o ciclo silenciosamente
        }

        // 2. Disparar os avisos
        agendamentos.forEach(ag => {
            
            // [NOVA TRAVA DE SEGURANÇA] - Programação Defensiva
            // Se por algum motivo o agendamento for órfão e não tiver disponibilidade, saltamos ele!
            if (!ag.disponibilidades || !ag.disponibilidades.data_hora) {
                console.log(`⚠️ [CRON AVISO] Agendamento ignorado: Dados de horário ausentes.`);
                return; // O return dentro de um forEach funciona como um 'continue', indo para o próximo item
            }

            const dataCurso = new Date(ag.disponibilidades.data_hora);
            const diferencaEmMinutos = Math.floor((dataCurso - agora) / (1000 * 60));

            // Só envia se faltarem exatas 24h (1440 min) ou 3h (180 min)
            if (diferencaEmMinutos === 1440 || diferencaEmMinutos === 180) {
                // Outra trava de segurança para garantir que o curso e o usuário existem
                const curso = ag.disponibilidades.cursos?.nome || 'Curso não identificado';
                const cliente = ag.usuarios?.nome || 'Aluno';
                const horaFormatada = dataCurso.toLocaleString('pt-BR', { timeStyle: 'short' });

                console.log(`\n📧 [EMAIL ENVIADO] Para: ${ag.usuarios?.email || 'Sem e-mail'}`);
                console.log(`Olá, ${cliente}! Lembramos que o seu agendamento para ${curso} é amanhã/hoje às ${horaFormatada}.`);
                console.log(`Em caso de imprevistos, cancele na plataforma com 2 horas de antecedência.\n`);
            }
        });

    } catch (error) {
        console.error('❌ [CRON ERRO] Falha ao varrer notificações:', error.message);
    }
});

console.log('⏳ Motor de Notificações (CRON) ativado e a aguardar...');