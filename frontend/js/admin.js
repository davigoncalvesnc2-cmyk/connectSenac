// frontend/js/admin.js

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'index.html';
}

let payloadToken = null;
try {
    // Descodificar o JWT para saber o nome e perfil do Admin conectado
    payloadToken = JSON.parse(atob(token.split('.')[1]));
    
    // RBAC Guard: Apenas admin e coordenador podem acessar
    if (payloadToken.perfil !== 'admin' && payloadToken.perfil !== 'coordenador') {
        if (payloadToken.perfil === 'profissional') {
            window.location.href = 'profissional.html';
        } else {
            window.location.href = 'painel.html';
        }
    }

    const usuarioLocal = localStorage.getItem('usuario') ? JSON.parse(localStorage.getItem('usuario')) : null;
    document.getElementById('userNome').textContent = usuarioLocal?.nome || payloadToken.email.split('@')[0];
    document.getElementById('userPerfil').textContent = payloadToken.perfil.toUpperCase();
} catch (e) {
    console.error('Erro ao ler token:', e);
    window.location.href = 'index.html';
}

// Se o utilizador for Coordenador, ocultamos a Tab de criar novos colaboradores (RBAC)
if (payloadToken?.perfil === 'coordenador') {
    const equipaTab = document.getElementById('equipa-tab');
    if (equipaTab) equipaTab.style.display = 'none';
}

document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
});

// Utilitário de Sanitização contra XSS
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

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
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Nenhum utilizador registado.</td></tr>';
            return;
        }

        users.forEach(user => {
            const statusBadge = user.is_bloqueado
                ? '<span class="badge bg-danger">Bloqueado</span>'
                : '<span class="badge bg-success">Ativo</span>';

            // Controle de Exclusão por RBAC na Interface
            // Coordenador só vê botão excluir ativo se for candidato. Admin vê ativo para todos.
            const podeExcluir = payloadToken.perfil === 'admin' || (payloadToken.perfil === 'coordenador' && user.perfil === 'candidato');
            const nomeEscapado = escapeHTML(user.nome).replace(/'/g, "\\'");

            const btnExcluir = podeExcluir
                ? `<button class="btn btn-sm btn-danger ms-1" onclick="excluirUsuario('${user.id}', '${nomeEscapado}')">Excluir</button>`
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
                <div class="fw-bold">${escapeHTML(user.nome)}</div>
                <div class="text-muted small">Membro desde: ${new Date(user.created_at).toLocaleDateString('pt-BR')}</div>
            </td>
            <td>
                <div>${escapeHTML(user.email)}</div>
                <div class="text-muted small">${escapeHTML(user.telefone)}</div>
            </td>
            <td>
                <span class="badge bg-secondary">${escapeHTML(user.perfil.toUpperCase())}</span>
                <div class="mt-1">${statusBadge}</div>
            </td>
            <td><span class="text-muted small">${escapeHTML(user.cursos_ativos)}</span></td>
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
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Erro ao ligar ao servidor.</td></tr>';
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

    const payload = {
        nome: document.getElementById('nomeCurso').value,
        descricao: document.getElementById('descricaoCurso').value,
        motivo_modelo: document.getElementById('motivoCurso').value,
        restricoes: document.getElementById('restricoesCurso').value,
        foto_url: document.getElementById('fotoCurso')?.value || null,
        localizacao: document.getElementById('localCurso')?.value || 'SENAC',
        profissional_id: document.getElementById('selectProfissional').value
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

async function excluirUsuario(id, nome) {
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
// Instância do Modal de Edição (Adicione no topo junto às outras variáveis)
let modalEditarCursoInstance = null;

// Esperar o DOM carregar para instanciar o Modal
document.addEventListener("DOMContentLoaded", () => {
    const modalEl = document.getElementById('modalEditarCurso');
    if (modalEl) modalEditarCursoInstance = new bootstrap.Modal(modalEl);

    // Iniciar carregamentos
    carregarCursosAdmin();
});

// ==========================================
// 1. ATUALIZAR A CRIAÇÃO DE CURSOS
// ==========================================
// Procure o seu 'formCurso.addEventListener' e atualize o payload para incluir os novos campos:
/*
    const payload = {
        // ... (mantenha os campos existentes)
        foto_url: document.getElementById('fotoCurso').value,
        localizacao: document.getElementById('localCurso').value,
        profissional_id: document.getElementById('selectProfissional').value
    };
*/

// ==========================================
// 2. LISTAR CURSOS NA TABELA DE GESTÃO
// ==========================================
async function carregarCursosAdmin() {
    const tbody = document.getElementById('tabelaCursosBody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/cursos/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        tbody.innerHTML = '';
        if (cursos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum curso cadastrado.</td></tr>';
            return;
        }

        cursos.forEach(curso => {
            const profNome = curso.usuarios ? curso.usuarios.nome : 'Sem Professor';
            const statusBadge = curso.status === 'ativo'
                ? '<span class="badge bg-success">Ativo</span>'
                : '<span class="badge bg-secondary">Arquivado</span>';

            const nomeCursoEscapado = escapeHTML(curso.nome).replace(/'/g, "\\'");

            // O arquivamento é um Soft Delete. Só mostramos o botão se estiver ativo.
            const btnArquivar = curso.status === 'ativo'
                ? `<button class="btn btn-sm btn-outline-danger ms-1" onclick="arquivarCurso('${curso.id}', '${nomeCursoEscapado}')">Arquivar</button>`
                : '';

            const row = `
                <tr>
                    <td>
                        <div class="fw-bold text-dark">${escapeHTML(curso.nome)}</div>
                        <div class="small text-muted text-truncate" style="max-width: 200px;">${escapeHTML(curso.descricao)}</div>
                    </td>
                    <td>${escapeHTML(profNome)}</td>
                    <td class="small">${escapeHTML(curso.localizacao || '-')}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick='abrirModalEdicao(${JSON.stringify(curso).replace(/'/g, "&#39;")})'>Editar</button>
                        ${btnArquivar}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Erro ao carregar catálogo.</td></tr>';
    }
}

// ==========================================
// 3. EDITAR E ARQUIVAR CURSOS
// ==========================================
async function arquivarCurso(id, nome) {
    if (!confirm(`Deseja arquivar o curso "${nome}"? Ele sairá da vitrine dos alunos, mas o histórico será mantido.`)) return;

    try {
        const response = await fetch(`${API_URL}/cursos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarCursosAdmin(); // Atualiza a tabela
            carregarCursosNoSelect(); // Atualiza os selects de formulários
        } else {
            alert('Erro ao arquivar curso.');
        }
    } catch (error) {
        alert('Erro de conexão.');
    }
}

function abrirModalEdicao(curso) {
    document.getElementById('editCursoId').value = curso.id;
    document.getElementById('editNome').value = curso.nome;
    document.getElementById('editDescricao').value = curso.descricao;
    document.getElementById('editLocal').value = curso.localizacao;
    document.getElementById('editFoto').value = curso.foto_url || '';

    // Copiar opções do select de profissionais principal para o select do modal
    const selectPrincipal = document.getElementById('selectProfissional');
    const selectEdit = document.getElementById('editProfissional');
    selectEdit.innerHTML = selectPrincipal.innerHTML;
    selectEdit.value = curso.profissional_id;

    document.getElementById('msgEditCurso').innerHTML = '';
    modalEditarCursoInstance.show();
}

const formEditarCurso = document.getElementById('formEditarCurso');
if (formEditarCurso) {
    formEditarCurso.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editCursoId').value;
        const msgDiv = document.getElementById('msgEditCurso');
        msgDiv.innerHTML = '<span class="text-primary">A atualizar...</span>';

        const payload = {
            nome: document.getElementById('editNome').value,
            descricao: document.getElementById('editDescricao').value,
            localizacao: document.getElementById('editLocal').value,
            foto_url: document.getElementById('editFoto').value,
            profissional_id: document.getElementById('editProfissional').value
        };

        try {
            const response = await fetch(`${API_URL}/cursos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                msgDiv.innerHTML = '<span class="text-success">Atualizado com sucesso!</span>';
                carregarCursosAdmin();
                carregarCursosNoSelect();
                setTimeout(() => modalEditarCursoInstance.hide(), 1500);
            } else {
                msgDiv.innerHTML = '<span class="text-danger">Erro ao atualizar.</span>';
            }
        } catch (error) {
            msgDiv.innerHTML = '<span class="text-danger">Erro de conexão.</span>';
        }
    });
}
// Chame essa função na inicialização do arquivo (no final do admin.js)
carregarProfissionaisNoSelect();
// Inicialização de ecrã
carregarMetricas();
carregarCursosNoSelect();
carregarUtilizadores();