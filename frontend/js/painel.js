// frontend/js/painel.js

// const API_URL = 'http://localhost:3000/api';

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;

// 1. Verificação de Segurança (Proteger a Rota)
const token = localStorage.getItem('token');
if (!token) {
    // Se não houver token, expulsa o utilizador para o ecrã de login
    window.location.href = 'index.html';
}

// 2. Função para Carregar a Lista de Agendamentos
async function carregarMeusAgendamentos(){
    try {
        const response = await fetch(`${API_URL}/agendamentos/meus`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Passando o crachá de acesso
            }
        });

        if (response.status === 401) {
            // Token expirado ou inválido
            terminarSessao();
        }

        const agendamentos = await response.json();
        const tbody = document.getElementById('tabelaAgendamentos');
        tbody.innerHTML = ''; // Limpa a tabela antes de popular

        if (agendamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum agendamento encontrado.</td></tr>';
            return;
        }

        agendamentos.forEach(agendamento => {
            // Formata a data para o padrão de Portugal (PT-PT)
            const dataFormatada = new Date(agendamento.data_hora).toLocaleString('pt-PT');

            // Define o botão de cancelar apenas se estiver 'Agendado'
            let botaoAcao = '';
            if (agendamento.status === 'Agendado') {
                botaoAcao = `<button class="btn btn-sm btn-outline-danger" onclick="cancelarAgendamento(${agendamento.id})">Cancelar</button>`;
            }

            // Cria a linha da tabela (Tr e Td)
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${agendamento.servico_nome || 'Serviço não cadastrado'}</td>
                <td><span class="badge bg-${agendamento.status === 'Agendado' ? 'primary' : (agendamento.status === 'Cancelado' ? 'danger' : 'success')}">${agendamento.status}</span></td>
                <td>${botaoAcao}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
    }
}

// 3. Lógica para Criar um Novo Agendamento
const formAgendamento = document.getElementById('formAgendamento');
formAgendamento.addEventListener('submit', async (e) => {
    e.preventDefault();

    const servico_id = document.getElementById('servico').value;
    const data_hora = document.getElementById('dataHora').value;
    const msgDiv = document.getElementById('msgAgendamento');

    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ servico_id, data_hora })
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<span class="text-success">${data.mensagem}</span>`;
            carregarMeusAgendamentos(); // Atualiza a tabela imediatamente
            formAgendamento.reset(); // Limpa o formulário
        } else {
            msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
    }
});

// 4. Lógica para Cancelar um Agendamento (Regra das 2 Horas)
async function cancelarAgendamento(id){
    if (!confirm('Tem a certeza de que deseja cancelar este agendamento?')) return;

    try {
        const response = await fetch(`${API_URL}/agendamentos/${id}/cancelar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.mensagem);
            carregarMeusAgendamentos(); // Atualiza a tabela para mostrar o status "Cancelado"
        } else {
            // Se a regra de negócio do back-end (ex: menos de 2h de antecedência) for violada, o erro aparece aqui
            alert(data.erro);
        }
    } catch (error) {
        console.error('Erro ao cancelar:', error);
    }
}

// 5. Lógica para Sair (Logout)
function terminarSessao(){
    localStorage.removeItem('token'); // Destrói o crachá
    window.location.href = 'index.html'; // Redireciona para o login
}

// Inicia o carregamento dos dados assim que o script for lido
carregarMeusAgendamentos();