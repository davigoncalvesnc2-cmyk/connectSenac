// frontend/js/painel.js

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

// Descodificar o JWT para verificar o perfil e exibir o nome do usuário
let payloadToken = null;
try {
    payloadToken = JSON.parse(atob(token.split('.')[1]));
    // Redireciona caso um professor ou admin acesse a área exclusiva de candidatos
    if (payloadToken.perfil === 'admin' || payloadToken.perfil === 'coordenador') {
        window.location.href = 'admin.html';
    } else if (payloadToken.perfil === 'profissional') {
        window.location.href = 'profissional.html';
    }

    const elUserNome = document.getElementById('userNome');
    if (elUserNome) {
        const usuarioLocal = localStorage.getItem('usuario') ? JSON.parse(localStorage.getItem('usuario')) : null;
        elUserNome.textContent = usuarioLocal?.nome || payloadToken.email.split('@')[0];
    }
} catch (e) {
    console.error('Erro ao ler token:', e);
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

// Instâncias dos Modais do Bootstrap
const modalAgendamento = new bootstrap.Modal(document.getElementById('modalAgendamento'));
const modalFeedback = new bootstrap.Modal(document.getElementById('modalFeedback'));

// ==========================================
// 1. CARREGAR A VITRINE DE CURSOS
// ==========================================
async function carregarCursos(){
    const divCursos = document.getElementById('listaCursos');
    try {
        const response = await fetch(`${API_URL}/cursos/ativos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        divCursos.innerHTML = '';
        if (cursos.length === 0) {
            divCursos.innerHTML = '<p class="text-muted">Nenhum serviço disponível de momento.</p>';
            return;
        }

        cursos.forEach(curso => {
            const profNome = curso.usuarios ? curso.usuarios.nome : 'A definir';
            const local = curso.localizacao ? `<div class="text-muted small mb-2"><i class="bi bi-geo-alt"></i> ${escapeHTML(curso.localizacao)}</div>` : '';
            const nomeCursoEscapado = escapeHTML(curso.nome).replace(/'/g, "\\'");
            const descCursoEscapada = escapeHTML(curso.descricao).replace(/'/g, "\\'");

            const card = `
                <div class="col-md-6 col-lg-4">
                    <div class="card shadow-sm h-100 card-curso">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title fw-bold text-dark">${escapeHTML(curso.nome)}</h5>
                            <h6 class="card-subtitle mb-2 text-muted small">Prof. ${escapeHTML(profNome)}</h6>
                            ${local}
                            <p class="card-text small text-secondary mt-2 flex-grow-1">${escapeHTML(curso.descricao)}</p>
                            <button class="btn btn-outline-primary btn-sm w-100 fw-bold mt-3" onclick="abrirModalAgendamento('${curso.id}', '${nomeCursoEscapado}', '${descCursoEscapada}')">Ver Horários</button>
                        </div>
                    </div>
                </div>
            `;
            divCursos.innerHTML += card;
        });
    } catch (error) {
        divCursos.innerHTML = '<p class="text-danger">Erro ao carregar os cursos.</p>';
    }
}

// ==========================================
// 2. FLUXO DE AGENDAMENTO (MODAL E HORÁRIOS)
// ==========================================
async function abrirModalAgendamento(cursoId, cursoNome, cursoDescricao){
    document.getElementById('modalCursoNome').textContent = cursoNome;
    document.getElementById('modalCursoDescricao').textContent = cursoDescricao;
    document.getElementById('msgAgendamento').innerHTML = '';

    const select = document.getElementById('selectHorarios');
    select.innerHTML = '<option value="" disabled selected>A procurar horários...</option>';

    const btnConfirmar = document.getElementById('btnConfirmarAgendamento');
    btnConfirmar.onclick = () => realizarAgendamento(select.value);

    modalAgendamento.show();

    try {
        const response = await fetch(`${API_URL}/disponibilidades/curso/${cursoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const horarios = await response.json();

        select.innerHTML = '<option value="" disabled selected>Escolha um horário...</option>';

        if (horarios.length === 0) {
            select.innerHTML = '<option value="" disabled selected>Sem vagas de momento.</option>';
            btnConfirmar.disabled = true;
            return;
        }

        btnConfirmar.disabled = false;
        horarios.forEach(h => {
            const dataFormatada = new Date(h.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const vagasLivres = h.vagas_totais - h.vagas_ocupadas;
            select.innerHTML += `<option value="${h.id}">${dataFormatada} (${vagasLivres} vagas livres)</option>`;
        });
    } catch (error) {
        select.innerHTML = '<option value="" disabled selected>Erro ao carregar horários.</option>';
    }
}

async function realizarAgendamento(disponibilidadeId){
    const msgDiv = document.getElementById('msgAgendamento');
    if (!disponibilidadeId) {
        msgDiv.innerHTML = '<span class="text-danger">Por favor, selecione um horário.</span>';
        return;
    }

    msgDiv.innerHTML = '<span class="text-primary">A confirmar...</span>';
    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ disponibilidade_id: disponibilidadeId })
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<span class="text-success">Agendamento concluído!</span>`;
            carregarMeusAgendamentos();
            setTimeout(() => modalAgendamento.hide(), 1500);
        } else {
            msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
        }
    } catch (error) {
        msgDiv.innerHTML = '<span class="text-danger">Erro de conexão.</span>';
    }
}

// ==========================================
// 3. CARREGAR E CANCELAR OS MEUS AGENDAMENTOS
// ==========================================
async function carregarMeusAgendamentos(){
    const divAgendamentos = document.getElementById('listaMeusAgendamentos');
    try {
        const response = await fetch(`${API_URL}/agendamentos/meus`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const agendamentos = await response.json();

        divAgendamentos.innerHTML = '';
        if (agendamentos.length === 0) {
            divAgendamentos.innerHTML = '<p class="text-muted small">Não possui nenhum agendamento ativo.</p>';
            return;
        }

        agendamentos.forEach(ag => {
            const cursoNome = ag.disponibilidades?.cursos?.nome || 'Curso';
            const dataHora = ag.disponibilidades?.data_hora 
                ? new Date(ag.disponibilidades.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                : 'Data a definir';
            
            let badge = '';
            let btnAcao = '';

            if (ag.status === 'agendado') {
                badge = '<span class="badge bg-primary">Confirmado</span>';
                btnAcao = `<button class="btn btn-sm btn-outline-danger mt-2 w-100" onclick="cancelarAgendamento('${ag.id}')">Cancelar Agendamento</button>`;
            } else if (ag.status === 'cancelado') {
                badge = '<span class="badge bg-danger">Cancelado</span>';
            } else {
                badge = '<span class="badge bg-success">Concluído</span>';
                btnAcao = `<button class="btn btn-sm btn-outline-success mt-2 w-100" onclick="abrirModalFeedback('${ag.id}')">⭐ Avaliar Atendimento</button>`;
            }

            const card = `
                <div class="col-12 col-md-6 col-xl-4">
                    <div class="card shadow-sm border-0 bg-white h-100">
                        <div class="card-body p-3 d-flex flex-column justify-content-between">
                            <div>
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fw-bold text-dark">${escapeHTML(cursoNome)}</span>
                                    ${badge}
                                </div>
                                <div class="text-secondary small mb-2"><i class="bi bi-calendar"></i> ${dataHora}</div>
                            </div>
                            <div>
                                ${btnAcao}
                                <div id="msg-canc-${ag.id}" class="small text-center mt-1"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            divAgendamentos.innerHTML += card;
        });
    } catch (error) {
        divAgendamentos.innerHTML = '<p class="text-danger">Erro ao carregar histórico.</p>';
    }
}

async function cancelarAgendamento(agendamentoId){
    if(!confirm("Tem a certeza que deseja cancelar a sua inscrição neste horário?")) return;

    const msgDiv = document.getElementById(`msg-canc-${agendamentoId}`);
    try {
        const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}/cancelar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            carregarMeusAgendamentos();
        } else {
            msgDiv.innerHTML = `<span class="text-danger fw-bold">${data.erro}</span>`;
        }
    } catch (error) {
        msgDiv.innerHTML = '<span class="text-danger">Erro ao processar pedido.</span>';
    }
}

// ==========================================
// 4. MÓDULO DE FEEDBACK
// ==========================================
function abrirModalFeedback(agendamentoId){
    document.getElementById('feedbackAgendamentoId').value = agendamentoId;
    document.getElementById('feedbackNota').value = '5';
    document.getElementById('feedbackComentario').value = '';
    document.getElementById('msgFeedback').innerHTML = '';
    modalFeedback.show();
}

const formFeedback = document.getElementById('formFeedback');
if (formFeedback) {
    formFeedback.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgFeedback');
        msgDiv.innerHTML = '<span class="text-primary">A processar avaliação...</span>';

        const payload = {
            agendamento_id: document.getElementById('feedbackAgendamentoId').value,
            nota: parseInt(document.getElementById('feedbackNota').value),
            comentario: document.getElementById('feedbackComentario').value
        };

        try {
            const response = await fetch(`${API_URL}/feedbacks`, {
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
                setTimeout(() => {
                    modalFeedback.hide();
                }, 1500);
            } else {
                msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<span class="text-danger">Erro de ligação.</span>';
        }
    });
}

// Inicializa a página carregando dados
carregarCursos();
carregarMeusAgendamentos();