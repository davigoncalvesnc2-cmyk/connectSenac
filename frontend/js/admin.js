// frontend/js/admin.js

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;

async function carregarTodosAgendamentos() {
    try {
        // Como é uma rota administrativa de MVP, no momento ela está protegida pelo mesmo
        // middleware JWT. Portanto, precisamos de estar logados para aceder (usando o token local)
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Acesso negado. Faça login para ver o painel da coordenação.');
            window.location.href = 'index.html';
            return;
        }

        const response = await fetch(`${API_URL}/agendamentos/admin/todos`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const agendamentos = await response.json();
        const tbody = document.getElementById('tabelaAdmin');
        tbody.innerHTML = ''; 

        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum agendamento no sistema.</td></tr>';
            return;
        }

        agendamentos.forEach(agendamento => {
            const dataFormatada = new Date(agendamento.data_hora).toLocaleString('pt-PT');
            
            // Definindo as cores dos crachás (badges) conforme o estado
            let corBadge = 'primary'; // Agendado
            if (agendamento.status === 'Cancelado') corBadge = 'danger';
            if (agendamento.status === 'Concluido') corBadge = 'success';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${dataFormatada}</strong></td>
                <td>${agendamento.cliente_nome}</td>
                <td><a href="https://wa.me/55${agendamento.telefone.replace(/\D/g, '')}" target="_blank" class="text-decoration-none">${agendamento.telefone}</a></td>
                <td>${agendamento.servico_nome}</td>
                <td><span class="badge bg-${corBadge}">${agendamento.status}</span></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Erro ao carregar painel admin:', error);
    }
}

// Inicia o carregamento assim que a página abre
carregarTodosAgendamentos();