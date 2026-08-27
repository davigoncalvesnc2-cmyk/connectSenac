function getApiBaseUrl() {
    const isFile = window.location.protocol === 'file:';
    const isDevPort = window.location.port && !['3000', '80', '443', ''].includes(window.location.port);
    if (isFile || isDevPort) {
        const host = window.location.hostname || 'localhost';
        return `http://${host}:3000/api`;
    }
    return '/api';
}

const API_URL = getApiBaseUrl();
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'index.html';
}

let payloadToken = null;
try {
    payloadToken = JSON.parse(atob(token.split('.')[1]));
    
    // RBAC: Permite acesso tanto para Admin quanto para Coordenador
    if (payloadToken.perfil !== 'admin' && payloadToken.perfil !== 'coordenador') {
        if (payloadToken.perfil === 'profissional') {
            window.location.href = 'profissional.html';
        } else {
            window.location.href = 'painel.html';
        }
    }

    const usuarioLocal = localStorage.getItem('usuario') ? JSON.parse(localStorage.getItem('usuario')) : null;
    const elUserNome = document.getElementById('userNome');
    const elUserPerfil = document.getElementById('userPerfil');
    const elHubBadgeTitle = document.getElementById('hubBadgeTitle');
    
    if (elUserNome) elUserNome.textContent = usuarioLocal?.nome || payloadToken.email.split('@')[0];
    
    // Ajuste dinâmico de interface baseado no perfil
    if (payloadToken.perfil === 'coordenador') {
        if (elUserPerfil) elUserPerfil.textContent = 'COORDENADOR DE UNIDADE';
        if (elHubBadgeTitle) elHubBadgeTitle.textContent = 'Coordenação Hub';
        
        // Remove a aba e o formulário de criar novos administradores
        const navItemEquipa = document.getElementById('navItemEquipa');
        const tabEquipa = document.getElementById('equipa');
        if (navItemEquipa) navItemEquipa.remove();
        if (tabEquipa) tabEquipa.remove();
    } else {
        if (elUserPerfil) elUserPerfil.textContent = 'ADMINISTRADOR GLOBAL';
    }

} catch (e) {
    console.error('Erro ao ler token:', e);
    window.location.href = 'index.html';
}

const btnSair = document.getElementById('btnSair');
if (btnSair) {
    btnSair.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    });
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

let cacheCursos = new Map();
let modalEditarCursoInstance = null;

// ============================================================================
// 1. DASHBOARD E MÉTRICAS
// ============================================================================
async function carregarMetricas() {
    try {
        const response = await fetch(`${API_URL}/dashboard/metricas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            const elUsuarios = document.getElementById('metricUsuarios');
            const elAgendados = document.getElementById('metricAgendados');
            const elConcluidos = document.getElementById('metricConcluidos');
            const elCancelamento = document.getElementById('metricCancelamento');

            if (elUsuarios) elUsuarios.textContent = data.totalUsuarios ?? '--';
            if (elAgendados) elAgendados.textContent = data.agendamentos?.agendados ?? '--';
            if (elConcluidos) elConcluidos.textContent = data.agendamentos?.concluidos ?? '--';
            if (elCancelamento) elCancelamento.textContent = data.taxaCancelamento ?? '--';
        }
    } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
    }
}

// ============================================================================
// 2. GESTÃO DE UTILIZADORES & MODERAÇÃO
// ============================================================================
async function carregarUtilizadores() {
    const tbody = document.getElementById('tabelaUsuariosBody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();

        tbody.innerHTML = '';
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">Nenhum utilizador registado.</td></tr>';
            return;
        }

        users.forEach(user => {
            const statusBadge = user.is_bloqueado
                ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1"><i class="bi bi-lock-fill me-1"></i>Bloqueado</span>'
                : '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1"><i class="bi bi-check-circle me-1"></i>Ativo</span>';

            const podeExcluir = payloadToken.perfil === 'admin' || (payloadToken.perfil === 'coordenador' && user.perfil === 'candidato');
            const nomeEscapado = escapeHTML(user.nome).replace(/'/g, "\\'");

            const btnExcluir = podeExcluir
                ? `<button class="btn btn-sm btn-outline-danger rounded-pill px-2" title="Excluir Usuário" onclick="excluirUsuario('${user.id}', '${nomeEscapado}')"><i class="bi bi-trash"></i></button>`
                : '';

            const btnBloqueio = payloadToken.perfil === 'admin'
                ? `<button class="btn btn-sm ${user.is_bloqueado ? 'btn-outline-success' : 'btn-outline-warning'} rounded-pill px-2" title="${user.is_bloqueado ? 'Desbloquear' : 'Bloquear'}" onclick="toggleBloqueio('${user.id}', ${Boolean(user.is_bloqueado)})">
                    <i class="bi ${user.is_bloqueado ? 'bi-unlock-fill' : 'bi-shield-slash-fill'}"></i>
                   </button>`
                : '';

            const dataFormatada = user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-';

            const row = `
                <tr>
                    <td>
                        <div class="fw-bold" style="color: var(--brand-primary);">${escapeHTML(user.nome)}</div>
                        <div class="text-muted small"><i class="bi bi-calendar3 me-1"></i>${dataFormatada}</div>
                    </td>
                    <td>
                        <div class="text-dark small">${escapeHTML(user.email)}</div>
                        <div class="text-muted small">${user.telefone ? `<i class="bi bi-whatsapp text-success me-1"></i>${escapeHTML(user.telefone)}` : 'Sem telefone'}</div>
                    </td>
                    <td>
                        <span class="badge-senac-primary">${escapeHTML(user.perfil?.toUpperCase() || '-')}</span>
                        <div class="mt-1">${statusBadge}</div>
                    </td>
                    <td><span class="text-secondary small">${escapeHTML(user.cursos_ativos || 'Nenhum')}</span></td>
                    <td class="text-center fw-bold" style="color: var(--brand-primary);">${user.total_agendados ?? 0}</td>
                    <td class="text-center fw-bold text-success">${user.total_concluidos ?? 0}</td>
                    <td class="text-center fw-bold text-danger">${user.total_cancelados ?? 0}</td>
                    <td class="text-end">
                        <div class="d-flex justify-content-end gap-1">
                            ${btnBloqueio}
                            ${btnExcluir}
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Erro ao ligar ao servidor.</td></tr>';
    }
}

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
            carregarUtilizadores();
            carregarMetricas();
        } else {
            const err = await response.json();
            alert(err.erro || 'Erro ao alterar estado do usuário.');
        }
    } catch (error) {
        alert("Erro de ligação.");
    }
}

async function excluirUsuario(id, nome) {
    if (!confirm(`ATENÇÃO: Deseja remover a conta de ${nome}? Todos os seus agendamentos serão excluídos.`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarUtilizadores();
            carregarMetricas();
        } else {
            const err = await response.json();
            alert(err.erro || 'Erro ao excluir usuário.');
        }
    } catch (error) {
        alert("Erro na conexão com o servidor.");
    }
}

// ============================================================================
// 3. CRIAR NOVO COLABORADOR (APENAS ADMIN GLOBAL)
// ============================================================================
const formColaborador = document.getElementById('formColaborador');
if (formColaborador) {
    formColaborador.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgColab');
        msgDiv.innerHTML = '<div class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>A registar colaborador...</div>';

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
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-success"><i class="bi bi-check-circle-fill"></i><span>${data.mensagem}</span></div>`;
                formColaborador.reset();
                carregarUtilizadores();
                carregarProfissionaisNoSelect();
            } else {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-triangle-fill"></i><span>${data.erro}</span></div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro de ligação com o servidor.</span></div>';
        }
    });
}

// ============================================================================
// 4. CADASTRO DE CURSO & VAGAS
// ============================================================================
const formCurso = document.getElementById('formCurso');
if (formCurso) {
    formCurso.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgCurso');
        msgDiv.innerHTML = '<div class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>A guardar curso...</div>';

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
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-success"><i class="bi bi-check-circle-fill"></i><span>${data.mensagem}</span></div>`;
                formCurso.reset();
                carregarCursosNoSelect();
                carregarCursosAdmin();
            } else {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-triangle-fill"></i><span>${data.erro}</span></div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro de ligação.</span></div>';
        }
    });
}

async function carregarCursosNoSelect() {
    const select = document.getElementById('selectCurso');
    if (!select) return;

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
if (formVagas) {
    formVagas.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgVaga');
        msgDiv.innerHTML = '<div class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>A abrir vagas...</div>';

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
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-success"><i class="bi bi-check-circle-fill"></i><span>${data.mensagem}</span></div>`;
                formVagas.reset();
                carregarMetricas();
            } else {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-triangle-fill"></i><span>${data.erro}</span></div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro de ligação.</span></div>';
        }
    });
}

async function carregarProfissionaisNoSelect() {
    const selectPrincipal = document.getElementById('selectProfissional');
    if (!selectPrincipal) return;

    try {
        const response = await fetch(`${API_URL}/admin/profissionais`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profissionais = await response.json();
        
        selectPrincipal.innerHTML = '<option value="" disabled selected>Selecione o professor...</option>';
        profissionais.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.nome;
            selectPrincipal.appendChild(option);
        });
    } catch (error) {
        selectPrincipal.innerHTML = '<option value="" disabled>Erro ao carregar professores</option>';
    }
}

// ============================================================================
// 5. GESTÃO DE CURSOS NA TABELA
// ============================================================================
async function carregarCursosAdmin() {
    const tbody = document.getElementById('tabelaCursosBody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/cursos/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        tbody.innerHTML = '';
        cacheCursos.clear();

        if (!cursos || cursos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">Nenhum curso cadastrado.</td></tr>';
            return;
        }

        cursos.forEach(curso => {
            cacheCursos.set(String(curso.id), curso);

            const profNome = curso.usuarios ? curso.usuarios.nome : 'Sem Professor';
            const statusBadge = curso.status === 'ativo'
                ? '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1">Ativo</span>'
                : '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-2 py-1">Arquivado</span>';

            const nomeCursoEscapado = escapeHTML(curso.nome).replace(/'/g, "\\'");

            const btnArquivar = curso.status === 'ativo'
                ? `<button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="arquivarCurso('${curso.id}', '${nomeCursoEscapado}')"><i class="bi bi-archive me-1"></i>Arquivar</button>`
                : '';

            const row = `
                <tr>
                    <td>
                        <div class="fw-bold" style="color: var(--brand-primary);">${escapeHTML(curso.nome)}</div>
                        <div class="small text-muted text-truncate" style="max-width: 280px;">${escapeHTML(curso.descricao)}</div>
                    </td>
                    <td>
                        <span class="badge-senac-primary"><i class="bi bi-person-badge me-1"></i>${escapeHTML(profNome)}</span>
                    </td>
                    <td class="small text-secondary"><i class="bi bi-geo-alt text-danger me-1"></i>${escapeHTML(curso.localizacao || '-')}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-senac-outline rounded-pill px-3" onclick="abrirModalEdicao('${curso.id}')">
                            <i class="bi bi-pencil me-1"></i>Editar
                        </button>
                        ${btnArquivar}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center py-4">Erro ao carregar catálogo.</td></tr>';
    }
}

async function arquivarCurso(id, nome) {
    if (!confirm(`Deseja arquivar o curso "${nome}"? Ele sairá da vitrine dos alunos, mas o histórico será mantido.`)) return;

    try {
        const response = await fetch(`${API_URL}/cursos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarCursosAdmin();
            carregarCursosNoSelect();
        } else {
            alert('Erro ao arquivar curso.');
        }
    } catch (error) {
        alert('Erro de conexão.');
    }
}

function abrirModalEdicao(cursoId) {
    const curso = cacheCursos.get(String(cursoId));
    if (!curso) return;

    document.getElementById('editCursoId').value = curso.id;
    document.getElementById('editNome').value = curso.nome || '';
    document.getElementById('editDescricao').value = curso.descricao || '';
    document.getElementById('editLocal').value = curso.localizacao || '';
    document.getElementById('editFoto').value = curso.foto_url || '';

    const selectPrincipal = document.getElementById('selectProfissional');
    const selectEdit = document.getElementById('editProfissional');
    if (selectPrincipal && selectEdit) {
        selectEdit.innerHTML = selectPrincipal.innerHTML;
        selectEdit.value = curso.profissional_id;
    }

    document.getElementById('msgEditCurso').innerHTML = '';

    const modalEl = document.getElementById('modalEditarCurso');
    if (modalEl) {
        modalEditarCursoInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalEditarCursoInstance.show();
    }
}

const formEditarCurso = document.getElementById('formEditarCurso');
if (formEditarCurso) {
    formEditarCurso.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editCursoId').value;
        const msgDiv = document.getElementById('msgEditCurso');
        msgDiv.innerHTML = '<div class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>A atualizar...</div>';

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
                msgDiv.innerHTML = '<div class="alert-custom alert-custom-success"><i class="bi bi-check-circle-fill"></i><span>Curso atualizado com sucesso!</span></div>';
                carregarCursosAdmin();
                carregarCursosNoSelect();
                setTimeout(() => {
                    if (modalEditarCursoInstance) modalEditarCursoInstance.hide();
                }, 1200);
            } else {
                const data = await response.json();
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-triangle-fill"></i><span>${data.erro || 'Erro ao atualizar.'}</span></div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro de conexão.</span></div>';
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const modalEl = document.getElementById('modalEditarCurso');
    if (modalEl) {
        modalEditarCursoInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    }
});

carregarProfissionaisNoSelect();
carregarMetricas();
carregarCursosNoSelect();
carregarUtilizadores();
carregarCursosAdmin();