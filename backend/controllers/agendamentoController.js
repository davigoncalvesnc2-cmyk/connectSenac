// backend/controllers/agendamentoController.js
const db = require('../config/database');

// Função para Agendar Serviço
exports.criar = (req, res) => {
    const { servico_id, data_hora } = req.body;
    const usuario_id = req.usuario.id; // Veio do nosso Middleware!

    const dataAgendamento = new Date(data_hora);

    // Regra 1: Não agendar no passado
    if (dataAgendamento < new Date()) {
        return res.status(400).json({ erro: 'Não é possível agendar em um horário que já passou.' });
    }

    // Regra 2: Prevenir Overbooking (horário já reservado por outro)
    const queryDisponibilidade = `SELECT * FROM agendamentos WHERE data_hora = ? AND status = 'Agendado'`;

    db.get(queryDisponibilidade, [data_hora], (err, conflito) => {
        if (err) return res.status(500).json({ erro: 'Erro no servidor.' });
        if (conflito) return res.status(400).json({ erro: 'Este horário já está reservado.' });

        // Se passou por tudo, salva no banco
        const insertQuery = `INSERT INTO agendamentos (usuario_id, servico_id, data_hora) VALUES (?, ?, ?)`;
        db.run(insertQuery, [usuario_id, servico_id, data_hora], function(err){
            if (err) return res.status(500).json({ erro: 'Erro ao criar agendamento.' });
            res.status(201).json({ mensagem: 'Agendamento realizado com sucesso!', id: this.lastID });
        });
    });
};

// Função para Cancelar Serviço
exports.cancelar = (req, res) => {
    const agendamento_id = req.params.id;
    const usuario_id = req.usuario.id; // Garante que o usuário só cancele o PRÓPRIO agendamento

    const query = `SELECT data_hora FROM agendamentos WHERE id = ? AND usuario_id = ? AND status = 'Agendado'`;

    db.get(query, [agendamento_id, usuario_id], (err, agendamento) => {
        if (err) return res.status(500).json({ erro: 'Erro no servidor.' });
        if (!agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

        // Regra 3: Restrição de 2 horas para cancelamento
        const dataAgendamento = new Date(agendamento.data_hora);
        const agora = new Date();

        // Calcula a diferença em horas
        const diferencaHoras = (dataAgendamento - agora) / (1000 * 60 * 60);

        if (diferencaHoras < 2) {
            return res.status(400).json({
                erro: 'Cancelamento negado. A antecedência mínima é de 2 horas para não prejudicar as aulas práticas.'
            });
        }

        // Se estiver no prazo, atualiza o status para 'Cancelado'
        const updateQuery = `UPDATE agendamentos SET status = 'Cancelado' WHERE id = ?`;
        db.run(updateQuery, [agendamento_id], function(err){
            if (err) return res.status(500).json({ erro: 'Erro ao cancelar.' });
            res.json({ mensagem: 'Agendamento cancelado com sucesso.' });
        });
    });
};

// Função para Listar os Agendamentos do Usuário Logado (Com Lazy Update)
exports.listarMeus = (req, res) => {
    const usuario_id = req.usuario.id;
    
    // 1. Pegar a data e hora atual e ajustar para o fuso horário local
    // O input 'datetime-local' do HTML salva no formato YYYY-MM-DDTHH:mm
    const agora = new Date();
    const tzOffset = agora.getTimezoneOffset() * 60000; // Diferença de fuso em milissegundos
    const dataAtualLocal = new Date(agora.getTime() - tzOffset).toISOString().slice(0, 16); 

    // 2. Lazy Update: Atualiza para 'Concluido' tudo o que já passou da data atual
    const updateQuery = `
        UPDATE agendamentos 
        SET status = 'Concluido' 
        WHERE usuario_id = ? AND status = 'Agendado' AND data_hora < ?
    `;
    
    db.run(updateQuery, [usuario_id, dataAtualLocal], (err) => {
        if (err) {
            console.error('Erro ao fazer a atualização preguiçosa (Lazy Update):', err);
        }

        // 3. Após atualizar (ou se não houver nada a atualizar), busca os dados reais
        const selectQuery = `
            SELECT a.id, a.data_hora, a.status, s.nome as servico_nome 
            FROM agendamentos a 
            LEFT JOIN servicos s ON a.servico_id = s.id 
            WHERE a.usuario_id = ? 
            ORDER BY a.data_hora DESC
        `;
        
        db.all(selectQuery, [usuario_id], (err, agendamentos) => {
            if (err) return res.status(500).json({ erro: 'Erro ao buscar agendamentos.' });
            res.json(agendamentos);
        });
    });
};

// Função para a Coordenação: Listar TODOS os agendamentos do sistema
exports.listarTodos = (req, res) => {
    // JOIN triplo: Trazemos os dados do Agendamento, o Nome do Serviço e o Nome do Cliente (Usuário)
    const query = `
        SELECT a.id, a.data_hora, a.status, s.nome as servico_nome, u.nome as cliente_nome, u.telefone 
        FROM agendamentos a 
        INNER JOIN servicos s ON a.servico_id = s.id 
        INNER JOIN usuarios u ON a.usuario_id = u.id
        ORDER BY a.data_hora DESC
    `;
    
    db.all(query, [], (err, agendamentos) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar todos os agendamentos.' });
        res.json(agendamentos);
    });
};