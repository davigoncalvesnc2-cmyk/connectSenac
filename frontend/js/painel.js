// ============================================================================
// CONFIGURAÇÃO DA API & CONTROLE DE ACESSO (RBAC & MODO VISITANTE)
// ============================================================================
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

let payloadToken = null;
let isGuest = true;

if (token) {
    try {
        payloadToken = JSON.parse(atob(token.split('.')[1]));
        
        // Proteção de Rota: Redireciona perfis administrativos ou docentes para suas áreas
        if (payloadToken.perfil === 'admin' || payloadToken.perfil === 'coordenador') {
            window.location.href = 'admin.html';
        } else if (payloadToken.perfil === 'profissional') {
            window.location.href = 'profissional.html';
        } else {
            isGuest = false;
        }
    } catch (e) {
        console.error('Erro ao ler token:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        isGuest = true;
    }
}

// Configuração da Interface (Logado vs Modo Visitante)
function configurarInterfaceNavbar() {
    const badgePerfil = document.getElementById('badgePerfilNavbar');
    const userArea = document.getElementById('userAreaNavbar');
    const metricasWrapper = document.getElementById('metricasModelosWrapper');
    const filtrosWrapper = document.getElementById('filtrosMeusAgendamentosWrapper');
    const btnHeroCadastro = document.getElementById('btnHeroCadastro');
    const heroSubtitulo = document.getElementById('heroSubtitulo');

    if (isGuest) {
        if (badgePerfil) {
            badgePerfil.className = 'badge bg-warning text-dark border px-2 py-1';
            badgePerfil.innerHTML = '<i class="bi bi-eye"></i> Modo Visitante';
        }
        if (userArea) {
            userArea.innerHTML = `
                <a href="cadastro.html" class="btn btn-senac-accent btn-sm rounded-pill px-3 shadow-sm">
                    <i class="bi bi-person-plus-fill me-1"></i> Cadastre-se
                </a>
                <a href="index.html" class="btn btn-outline-light btn-sm rounded-pill px-3">
                    <i class="bi bi-box-arrow-in-right me-1"></i> Entrar
                </a>
            `;
        }
        if (btnHeroCadastro) {
            btnHeroCadastro.classList.remove('d-none');
        }
        if (heroSubtitulo) {
            heroSubtitulo.textContent = 'Explore todas as oportunidades de atendimento prático gratuito abertas no Senac. Crie sua conta gratuita em menos de 1 minuto para agendar seu horário!';
        }
    } else {
        if (badgePerfil) {
            badgePerfil.className = 'navbar-brand-badge';
            badgePerfil.textContent = 'Área do Modelo';
        }
        if (metricasWrapper) {
            metricasWrapper.classList.remove('d-none');
        }
        if (filtrosWrapper) {
            filtrosWrapper.classList.remove('d-none');
        }
        const elUserNome = document.getElementById('userNome');
        if (elUserNome) {
            const usuarioLocal = localStorage.getItem('usuario') ? JSON.parse(localStorage.getItem('usuario')) : null;
            elUserNome.textContent = usuarioLocal?.nome || payloadToken?.email?.split('@')[0] || 'Modelo';
        }

        const btnSair = document.getElementById('btnSair');
        if (btnSair) {
            btnSair.addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                window.location.href = 'index.html';
            });
        }
    }
}

// Sanitização de strings contra ataques XSS
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
const modalAgendamentoEl = document.getElementById('modalAgendamento');
const modalExigirCadastroEl = document.getElementById('modalExigirCadastro');
const modalFeedbackEl = document.getElementById('modalFeedback');

const modalAgendamento = modalAgendamentoEl ? new bootstrap.Modal(modalAgendamentoEl) : null;
const modalExigirCadastro = modalExigirCadastroEl ? new bootstrap.Modal(modalExigirCadastroEl) : null;
const modalFeedback = modalFeedbackEl ? new bootstrap.Modal(modalFeedbackEl) : null;

// ============================================================================
// 1. VITRINE DE CURSOS PÚBLICA (VISITANTES E MODELOS)
// ============================================================================
let todosOsCursos = [];

async function carregarCursos() {
    const divCursos = document.getElementById('listaCursos');
    if (!divCursos) return;

    try {
        const response = await fetch(`${API_URL}/cursos/ativos`);
        const cursos = await response.json();

        todosOsCursos = Array.isArray(cursos) ? cursos : [];
        renderizarCursosVitrine(todosOsCursos);
    } catch (error) {
        divCursos.innerHTML = '<div class="col-12"><div class="alert-custom alert-custom-danger text-center"><i class="bi bi-wifi-off"></i><span>Erro ao conectar com o catálogo de cursos.</span></div></div>';
    }
}

function renderizarCursosVitrine(cursos) {
    const divCursos = document.getElementById('listaCursos');
    if (!divCursos) return;

    divCursos.innerHTML = '';
    if (!cursos || cursos.length === 0) {
        divCursos.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="content-card p-5 text-muted shadow-sm">
                    <i class="bi bi-inbox fs-1 d-block mb-3 text-warning"></i>
                    <h5 class="fw-bold text-dark mb-1">Nenhum serviço disponível no momento</h5>
                    <p class="small mb-0">Novos horários e turmas de práticas serão abertos em breve pelos professores.</p>
                </div>
            </div>`;
        return;
    }

    cursos.forEach(curso => {
        const profNome = curso.usuarios ? curso.usuarios.nome : 'Instrutor Especialista Senac';
        const local = curso.localizacao 
            ? `<div class="text-muted small mb-2 d-flex align-items-center gap-1"><i class="bi bi-geo-alt-fill text-danger"></i> <span class="text-truncate">${escapeHTML(curso.localizacao)}</span></div>` 
            : '';
        const nomeCursoEscapado = escapeHTML(curso.nome).replace(/'/g, "\\'");
        const descCursoEscapada = escapeHTML(curso.descricao).replace(/'/g, "\\'");

        // Capa com fallback
        let mediaCoverHTML = '';
        if (curso.foto_url && curso.foto_url.trim() !== '') {
            mediaCoverHTML = `
                <div class="course-img-wrapper">
                    <img src="${escapeHTML(curso.foto_url)}" alt="Capa do curso ${escapeHTML(curso.nome)}" class="course-img" loading="lazy" onerror="this.parentElement.innerHTML = getPlaceholderCover('${nomeCursoEscapado}');">
                    <span class="badge-senac-accent position-absolute top-0 end-0 m-3 shadow-sm"><i class="bi bi-check2"></i> Vagas Abertas</span>
                </div>
            `;
        } else {
            mediaCoverHTML = getPlaceholderCover(curso.nome);
        }

        const btnAcao = isGuest
            ? `<button class="btn btn-senac-accent w-100 py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm" onclick="solicitarInscricaoVisitante('${nomeCursoEscapado}')">
                   <i class="bi bi-person-check-fill"></i>
                   <span>Quero ser Modelo (Inscrever-se)</span>
               </button>`
            : `<button class="btn btn-senac-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2" onclick="abrirModalAgendamento('${curso.id}', '${nomeCursoEscapado}', '${descCursoEscapada}')">
                   <span>Ver Horários Disponíveis</span>
                   <i class="bi bi-arrow-right"></i>
               </button>`;

        const card = `
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="card card-course h-100 shadow-sm d-flex flex-column">
                    ${mediaCoverHTML}
                    <div class="card-body p-4 d-flex flex-column flex-grow-1">
                        <span class="badge-senac-primary align-self-start mb-2 px-2 py-1 small fw-semibold">
                            <i class="bi bi-person-badge me-1"></i> Prof. ${escapeHTML(profNome)}
                        </span>
                        <h3 class="h5 card-title fw-bold mb-2" style="color: var(--brand-primary);">${escapeHTML(curso.nome)}</h3>
                        ${local}
                        <p class="card-text small text-secondary mb-4 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                            ${escapeHTML(curso.descricao)}
                        </p>
                        ${btnAcao}
                    </div>
                </div>
            </div>
        `;
        divCursos.innerHTML += card;
    });
}

function getPlaceholderCover(nomeCurso) {
    const iniciais = (nomeCurso || 'CS').substring(0, 2).toUpperCase();
    return `
        <div class="course-img-wrapper d-flex align-items-center justify-content-center text-center p-3 text-white">
            <div>
                <i class="bi bi-mortarboard display-5 text-warning mb-1 opacity-75"></i>
                <div class="fw-bold small letter-spacing-1 text-uppercase text-white-50">${iniciais} • Senac Práticas</div>
            </div>
            <span class="badge-senac-accent position-absolute top-0 end-0 m-3 shadow-sm">Atendimento Gratuito</span>
        </div>
    `;
}

// Interceptação de Inscrição em Modo Visitante (Exige Cadastro)
function solicitarInscricaoVisitante(nomeCurso) {
    const elNome = document.getElementById('nomeCursoExigirCadastro');
    if (elNome) elNome.textContent = nomeCurso || 'selecionado';
    if (modalExigirCadastro) modalExigirCadastro.show();
}

// Filtro de Busca na Vitrine de Cursos
const inputBuscaVitrine = document.getElementById('buscaCursosVitrine');
if (inputBuscaVitrine) {
    inputBuscaVitrine.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase().trim();
        const filtrados = todosOsCursos.filter(c => 
            c.nome.toLowerCase().includes(termo) || 
            (c.descricao && c.descricao.toLowerCase().includes(termo)) ||
            (c.localizacao && c.localizacao.toLowerCase().includes(termo)) ||
            (c.usuarios?.nome && c.usuarios.nome.toLowerCase().includes(termo))
        );
        renderizarCursosVitrine(filtrados);
    });
}

// ============================================================================
// 2. MODAL & PROCESSO DE AGENDAMENTO (USUÁRIO AUTENTICADO)
// ============================================================================
async function abrirModalAgendamento(cursoId, cursoNome, cursoDescricao) {
    if (isGuest) {
        solicitarInscricaoVisitante(cursoNome);
        return;
    }

    document.getElementById('modalCursoNome').textContent = cursoNome;
    document.getElementById('modalCursoDescricao').textContent = cursoDescricao;
    document.getElementById('msgAgendamento').innerHTML = '';

    const select = document.getElementById('selectHorarios');
    select.innerHTML = '<option value="" disabled selected>A procurar horários...</option>';

    const btnConfirmar = document.getElementById('btnConfirmarAgendamento');
    btnConfirmar.onclick = () => realizarAgendamento(select.value);

    if (modalAgendamento) modalAgendamento.show();

    try {
        const response = await fetch(`${API_URL}/disponibilidades/curso/${cursoId}`);
        const horarios = await response.json();

        select.innerHTML = '<option value="" disabled selected>Escolha uma data e horário...</option>';

        if (!horarios || horarios.length === 0) {
            select.innerHTML = '<option value="" disabled selected>Sem vagas abertas no momento.</option>';
            btnConfirmar.disabled = true;
            return;
        }

        btnConfirmar.disabled = false;
        horarios.forEach(h => {
            const dataFormatada = new Date(h.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const vagasLivres = h.vagas_totais - h.vagas_ocupadas;
            select.innerHTML += `<option value="${h.id}">📅 ${dataFormatada} (${vagasLivres} vagas restantes)</option>`;
        });
    } catch (error) {
        select.innerHTML = '<option value="" disabled selected>Erro ao carregar horários.</option>';
    }
}

async function realizarAgendamento(disponibilidadeId) {
    const msgDiv = document.getElementById('msgAgendamento');
    if (!disponibilidadeId) {
        msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-circle-fill"></i><span>Por favor, selecione um horário disponível.</span></div>';
        return;
    }

    msgDiv.innerHTML = '<div class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>A confirmar presença...</div>';
    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ disponibilidade_id: disponibilidadeId })
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<div class="alert-custom alert-custom-success"><i class="bi bi-check-circle-fill"></i><span>Agendamento confirmado com sucesso!</span></div>`;
            carregarMeusAgendamentos();
            setTimeout(() => {
                if (modalAgendamento) modalAgendamento.hide();
            }, 1400);
        } else {
            msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-triangle-fill"></i><span>${data.erro || 'Falha ao processar agendamento.'}</span></div>`;
        }
    } catch (error) {
        msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro de comunicação com o servidor.</span></div>';
    }
}

// ============================================================================
// 3. ARQUIVO DE MODELOS & GESTÃO DAS PARTICIPAÇÕES
// ============================================================================
let meusAgendamentosData = [];
let filtroStatusAtivo = 'todos';
let filtroBuscaTexto = '';

async function carregarMeusAgendamentos() {
    const divAgendamentos = document.getElementById('listaMeusAgendamentos');
    if (!divAgendamentos) return;

    if (isGuest) {
        divAgendamentos.innerHTML = `
            <div class="col-12">
                <div class="p-4 p-md-5 bg-white rounded-4 border text-center shadow-sm">
                    <div class="p-3 rounded-circle bg-primary-subtle text-primary fs-1 d-inline-flex mb-3">
                        <i class="bi bi-folder-check"></i>
                    </div>
                    <h5 class="fw-bold text-dark mb-2">Arquivo de Inscrições do Modelo</h5>
                    <p class="text-muted small mb-4 mx-auto" style="max-width: 520px;">
                        Você está no <strong>Modo Visitante</strong>. Para visualizar os cursos em que escolheu participar, horários confirmados e histórico de atendimentos, acesse sua conta ou faça um cadastro gratuito.
                    </p>
                    <div class="d-flex flex-wrap justify-content-center gap-2">
                        <a href="cadastro.html" class="btn btn-senac-primary px-4 py-2">
                            <i class="bi bi-person-plus-fill me-1"></i> Cadastre-se como Modelo
                        </a>
                        <a href="index.html" class="btn btn-senac-outline px-4 py-2">
                            <i class="bi bi-box-arrow-in-right me-1"></i> Fazer Login
                        </a>
                    </div>
                </div>
            </div>`;
        return;
    }

    try {
        const response = await fetch(`${API_URL}/agendamentos/meus`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const agendamentos = await response.json();

        meusAgendamentosData = Array.isArray(agendamentos) ? agendamentos : [];
        atualizarMetricasModelos(meusAgendamentosData);
        renderizarListaAgendamentos();
    } catch (error) {
        divAgendamentos.innerHTML = '<div class="col-12"><div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro ao carregar o histórico de agendamentos.</span></div></div>';
    }
}

function atualizarMetricasModelos(lista) {
    const total = lista.length;
    const confirmados = lista.filter(a => a.status === 'agendado').length;
    const concluidos = lista.filter(a => a.status === 'concluido').length;
    const cancelados = lista.filter(a => a.status === 'cancelado').length;

    const elTotal = document.getElementById('metricaTotal');
    const elConf = document.getElementById('metricaConfirmados');
    const elConc = document.getElementById('metricaConcluidos');
    const elCanc = document.getElementById('metricaCancelados');

    if (elTotal) elTotal.textContent = total;
    if (elConf) elConf.textContent = confirmados;
    if (elConc) elConc.textContent = concluidos;
    if (elCanc) elCanc.textContent = cancelados;
}

function renderizarListaAgendamentos() {
    const divAgendamentos = document.getElementById('listaMeusAgendamentos');
    if (!divAgendamentos) return;

    let filtrados = meusAgendamentosData.filter(ag => {
        const matchStatus = filtroStatusAtivo === 'todos' || ag.status === filtroStatusAtivo;
        const cursoNome = (ag.disponibilidades?.cursos?.nome || '').toLowerCase();
        const local = (ag.disponibilidades?.cursos?.localizacao || '').toLowerCase();
        const prof = (ag.disponibilidades?.cursos?.usuarios?.nome || '').toLowerCase();
        const matchBusca = !filtroBuscaTexto || cursoNome.includes(filtroBuscaTexto) || local.includes(filtroBuscaTexto) || prof.includes(filtroBuscaTexto);
        return matchStatus && matchBusca;
    });

    divAgendamentos.innerHTML = '';
    if (filtrados.length === 0) {
        divAgendamentos.innerHTML = `
            <div class="col-12">
                <div class="p-4 bg-white rounded-4 border text-muted small d-flex align-items-center gap-3 shadow-sm">
                    <div class="p-2 rounded-circle bg-light text-primary fs-4">
                        <i class="bi bi-info-circle-fill text-primary"></i>
                    </div>
                    <div>
                        <h6 class="fw-bold text-dark mb-0">Nenhum curso encontrado neste filtro</h6>
                        <span class="text-muted">Explore os cursos disponíveis na vitrine abaixo e participe como modelo!</span>
                    </div>
                </div>
            </div>`;
        return;
    }

    filtrados.forEach(ag => {
        const curso = ag.disponibilidades?.cursos;
        const cursoNome = curso?.nome || 'Curso Prático Senac';
        const local = curso?.localizacao ? escapeHTML(curso.localizacao) : 'Senac Bahia';
        const profNome = curso?.usuarios?.nome ? escapeHTML(curso.usuarios.nome) : 'Docente Especialista';
        const dataHora = ag.disponibilidades?.data_hora 
            ? new Date(ag.disponibilidades.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            : 'Data a definir';
        
        let badge = '';
        let btnAcao = '';

        if (ag.status === 'agendado') {
            badge = '<span class="badge-senac-primary"><i class="bi bi-check2"></i> Confirmado</span>';
            btnAcao = `<button class="btn btn-sm btn-outline-danger w-100 rounded-pill mt-2" onclick="cancelarAgendamento('${ag.id}')"><i class="bi bi-x-circle me-1"></i> Cancelar Agendamento</button>`;
        } else if (ag.status === 'cancelado') {
            badge = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1">Cancelado</span>';
        } else {
            badge = '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1"><i class="bi bi-check-all"></i> Concluído</span>';
            btnAcao = `<button class="btn btn-sm btn-senac-accent w-100 rounded-pill mt-2 fw-semibold" onclick="abrirModalFeedback('${ag.id}')">⭐ Avaliar Atendimento</button>`;
        }

        const card = `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="content-card h-100 p-4 d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <h4 class="h6 fw-bold mb-0" style="color: var(--brand-primary);">${escapeHTML(cursoNome)}</h4>
                            ${badge}
                        </div>
                        <div class="text-muted small mb-1">
                            <i class="bi bi-person-badge text-primary me-1"></i> Prof. ${profNome}
                        </div>
                        <div class="text-muted small mb-1">
                            <i class="bi bi-geo-alt text-danger me-1"></i> ${local}
                        </div>
                        <div class="text-secondary small mb-3">
                            <i class="bi bi-clock-fill text-warning me-1"></i> ${dataHora}
                        </div>
                    </div>
                    <div>
                        ${btnAcao}
                        <div id="msg-canc-${ag.id}" class="small text-center mt-1" aria-live="polite"></div>
                    </div>
                </div>
            </div>
        `;
        divAgendamentos.innerHTML += card;
    });
}

// Configuração dos Botões de Filtro de Agendamentos
const containerBotoesFiltro = document.getElementById('botoesFiltroAgendamento');
if (containerBotoesFiltro) {
    containerBotoesFiltro.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            containerBotoesFiltro.querySelectorAll('button').forEach(b => {
                b.className = 'btn btn-sm btn-outline-secondary filter-btn-model';
            });
            btn.className = 'btn btn-sm btn-senac-primary filter-btn-model active';
            filtroStatusAtivo = btn.dataset.filtro;
            renderizarListaAgendamentos();
        });
    });
}

// Busca nos Agendamentos
const inputBuscaAgendamentos = document.getElementById('buscaMeusAgendamentos');
if (inputBuscaAgendamentos) {
    inputBuscaAgendamentos.addEventListener('input', (e) => {
        filtroBuscaTexto = e.target.value.toLowerCase().trim();
        renderizarListaAgendamentos();
    });
}

async function cancelarAgendamento(agendamentoId) {
    if (!confirm("Tem certeza que deseja cancelar sua vaga neste horário?")) return;

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
            if (msgDiv) msgDiv.innerHTML = `<span class="text-danger fw-bold">${data.erro || 'Falha ao cancelar.'}</span>`;
        }
    } catch (error) {
        if (msgDiv) msgDiv.innerHTML = '<span class="text-danger">Erro de rede.</span>';
    }
}

// ============================================================================
// 4. MÓDULO DE FEEDBACK & AVALIAÇÃO
// ============================================================================
function abrirModalFeedback(agendamentoId) {
    document.getElementById('feedbackAgendamentoId').value = agendamentoId;
    document.getElementById('feedbackNota').value = '5';
    document.getElementById('feedbackComentario').value = '';
    document.getElementById('msgFeedback').innerHTML = '';
    if (modalFeedback) modalFeedback.show();
}

const formFeedback = document.getElementById('formFeedback');
if (formFeedback) {
    formFeedback.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgFeedback');
        msgDiv.innerHTML = '<div class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>Enviando avaliação...</div>';

        const payload = {
            agendamento_id: document.getElementById('feedbackAgendamentoId').value,
            nota: parseInt(document.getElementById('feedbackNota').value, 10),
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
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-success"><i class="bi bi-check-circle-fill"></i><span>${data.mensagem}</span></div>`;
                setTimeout(() => {
                    if (modalFeedback) modalFeedback.hide();
                }, 1300);
            } else {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-triangle-fill"></i><span>${data.erro || 'Erro ao enviar feedback.'}</span></div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro de conexão.</span></div>';
        }
    });
}

// Inicialização
configurarInterfaceNavbar();
carregarCursos();
carregarMeusAgendamentos();