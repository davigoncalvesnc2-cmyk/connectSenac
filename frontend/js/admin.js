// frontend/js/admin.js

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

// Descodificar o JWT para saber o nome e perfil do Admin conectado
const payloadToken = JSON.parse(atob(token.split('.')[1]));
document.getElementById('userNome').textContent = payloadToken.email.split('@')[0];
document.getElementById('userPerfil').textContent = payloadToken.perfil.toUpperCase();

// Se o utilizador for Coordenador, ocultamos a Tab de criar novos colaboradores (RBAC)
if (payloadToken.perfil === 'coordenador') {
    const equipaTab = document.getElementById('equipa-tab');
    if (equipaTab) equipaTab.style.display = 'none';
}

document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// ============================================================================
// 1. CARREGAR MÉTRICAS DO DASHBOARD
// ============================================================================
async function carregarMetricas() {
    try {
        const response = await fetch(`${API_URL}/dashboard/metricas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('metricUsuarios').textContent = data.totalUsuarios;
            document.getElementById('metricAgendados').textContent = data.agendamentos.agendados;
            document.getElementById('metricConcluidos').textContent = data.agendamentos.concluidos;
            document.getElementById('metricCancelamento').textContent = data.taxaCancelamento;
        }
    } catch (error) {
        console.error("Erro ao carregar dados do dashboard.");
    }
}

// ============================================================================
// 2. GESTÃO DE UTILIZADORES & HISTÓRICO (MODERAÇÃO)
// ============================================================================
async function carregarUtilizadores() {
    const tbody = document.getElementById('tabelaUsuariosBody');
    try {
        const response = await fetch(`${API_URL}/admin/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();

        tbody.innerHTML = '';
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum utilizador registado.</td></tr>';
            return;
        }

        // Substitua o loop 'users.forEach' na função carregarUtilizadores por esta versão:
        users.forEach(user => {
            const statusBadge = user.is_bloqueado
                ? '<span class="badge bg-danger">Bloqueado</span>'
                : '<span class="badge bg-success">Ativo</span>';

            // Controle de Exclusão por RBAC na Interface
            // Coordenador só vê botão excluir ativo se for candidato. Admin vê ativo para todos.
            const podeExcluir = payloadToken.perfil === 'admin' || (payloadToken.perfil === 'coordenador' && user.perfil === 'candidato');

            const btnExcluir = podeExcluir
                ? `<button class="btn btn-sm btn-danger ms-1" onclick="excluirUsuario('${user.id}', '${user.nome}')">Excluir</button>`
                : '';

            const btnBloqueio = payloadToken.perfil === 'admin'
                ? `<button class="btn btn-sm ${user.is_bloqueado ? 'btn-outline-success' : 'btn-outline-danger'}"
            onclick="toggleBloqueio('${user.id}', ${user.is_bloqueado})">
            ${user.is_bloqueado ? 'Liberar' : 'Bloquear'}
           </button>`
                : '';

            const row = `
        <tr>
            <td>
                <div class="fw-bold">${user.nome}</div>
                <div class="text-muted small">Membro desde: ${new Date(user.created_at).toLocaleDateString('pt-BR')}</div>
            </td>
            <td>
                <div>${user.email}</div>
                <div class="text-muted small">${user.telefone}</div>
            </td>
            <td>
                <span class="badge bg-secondary">${user.perfil.toUpperCase()}</span>
                <div class="mt-1">${statusBadge}</div>
            </td>
            <td><span class="text-muted small">${user.cursos_ativos}</span></td>
            <td class="text-center fw-bold text-primary">${user.total_agendados}</td>
            <td class="text-center fw-bold text-success">${user.total_concluidos}</td>
            <td class="text-center fw-bold text-danger">${user.total_cancelados}</td>
            <td class="text-end">
                <div class="d-flex justify-content-end">
                    ${btnBloqueio}
                    ${btnExcluir}
                </div>
            </td>
        </tr>
    `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao ligar ao servidor.</td></tr>';
    }
}

// Lógica de Bloqueio/Desbloqueio (Moderação)
async function toggleBloqueio(id, statusAtual) {
    const acao = statusAtual ? 'desbloquear' : 'bloquear';
    if (!confirm(`Tem a certeza que deseja ${acao} este utilizador?`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${id}/bloquear`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_bloqueado: !statusAtual })
        });

        if (response.ok) {
            carregarUtilizadores(); // Recarrega a tabela de utilizadores
            carregarMetricas();     // Atualiza o dashboard
        } else {
            const err = await response.json();
            alert(err.erro);
        }
    } catch (error) {
        alert("Erro de ligação.");
    }
}

// ============================================================================
// 3. CRIAR NOVO COLABORADOR (APENAS ADMIN)
// ============================================================================
const formColaborador = document.getElementById('formColaborador');
if (formColaborador) {
    formColaborador.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgColab');
        msgDiv.innerHTML = '<span class="text-primary">A registar colaborador...</span>';

        const payload = {
            nome: document.getElementById('colabNome').value,
            email: document.getElementById('colabEmail').value,
            telefone: document.getElementById('colabTelefone').value,
            senha: document.getElementById('colabSenha').value,
            perfil: document.getElementById('colabPerfil').value
        };

        try {
            const response = await fetch(`${API_URL}/admin/colaboradores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<span class="text-success">${data.mensagem}</span>`;
                formColaborador.reset();
                carregarUtilizadores(); // Atualiza a lista caso a aba esteja aberta
            } else {
                msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<span class="text-danger">Erro de ligação com o servidor.</span>';
        }
    });
}

// ============================================================================
// LÓGICA DE CADASTRO DE CURSO & VAGAS
// ============================================================================
const formCurso = document.getElementById('formCurso');
formCurso.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById('msgCurso');
    msgDiv.innerHTML = '<span class="text-primary">A guardar curso...</span>';

    // Substitua o payload antigo por este que inclui o profissional_id
    const payload = {
        nome: document.getElementById('nomeCurso').value,
        descricao: document.getElementById('descricaoCurso').value,
        motivo_modelo: document.getElementById('motivoCurso').value,
        restricoes: document.getElementById('restricoesCurso').value,
        profissional_id: document.getElementById('selectProfissional').value // VÍNCULO ADICIONADO!
    };
    try {
        const response = await fetch(`${API_URL}/cursos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<span class="text-success">${data.mensagem}</span>`;
            formCurso.reset();
            carregarCursosNoSelect();
        } else {
            msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
        }
    } catch (error) {
        msgDiv.innerHTML = '<span class="text-danger">Erro de ligação.</span>';
    }
});

async function carregarCursosNoSelect() {
    const select = document.getElementById('selectCurso');
    try {
        const response = await fetch(`${API_URL}/cursos/ativos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        select.innerHTML = '<option value="" disabled selected>Selecione o curso...</option>';
        cursos.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso.id;
            option.textContent = curso.nome;
            select.appendChild(option);
        });
    } catch (error) {
        select.innerHTML = '<option value="" disabled>Erro ao carregar cursos</option>';
    }
}

const formVagas = document.getElementById('formVagas');
formVagas.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById('msgVaga');
    msgDiv.innerHTML = '<span class="text-primary">A abrir vagas...</span>';

    const payload = {
        curso_id: document.getElementById('selectCurso').value,
        data_hora: document.getElementById('dataHora').value,
        vagas_totais: parseInt(document.getElementById('vagasTotais').value)
    };

    try {
        const response = await fetch(`${API_URL}/disponibilidades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<span class="text-success">${data.mensagem}</span>`;
            formVagas.reset();
            carregarMetricas();
        } else {
            msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
        }
    } catch (error) {
        msgDiv.innerHTML = '<span class="text-danger">Erro de ligação.</span>';
    }
});

async function carregarProfissionaisNoSelect() {
    const select = document.getElementById('selectProfissional');
    try {
        const response = await fetch(`${API_URL}/admin/profissionais`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profissionais = await response.json();
        select.innerHTML = '<option value="" disabled selected>Selecione o professor...</option>';
        profissionais.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.nome;
            select.appendChild(option);
        });
    } catch (error) {
        select.innerHTML = '<option value="" disabled>Erro ao carregar professores</option>';
    }
}

async function excluirUsuario(id, nome){
    if (!confirm(`ATENÇÃO: Tem certeza absoluta que deseja remover a conta de ${nome}? Todos os seus agendamentos serão excluídos.`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarUtilizadores(); // Atualiza a tabela
            carregarMetricas();     // Atualiza o dashboard
        } else {
            const err = await response.json();
            alert(err.erro);
        }
    } catch (error) {
        alert("Erro na conexão com o servidor.");
    }
}
// Chame essa função na inicialização do arquivo (no final do admin.js)
carregarProfissionaisNoSelect();
// Inicialização de ecrã
carregarMetricas();
carregarCursosNoSelect();
carregarUtilizadores();