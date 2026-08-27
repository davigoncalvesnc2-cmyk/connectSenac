function getApiBaseUrl() {
    const isFile = window.location.protocol === 'file:';
    const isDevPort = window.location.port && !['3000', '80', '443', ''].includes(window.location.port);
    if (isFile || isDevPort) {
        const host = window.location.hostname || 'localhost';
        return `http://${host}:3000/api/usuarios`;
    }
    return '/api/usuarios';
}

const API_URL = getApiBaseUrl();

function redirecionarPorPerfil(perfil) {
    switch (perfil) {
        case 'admin':
        case 'coordenador':
            return 'admin.html'; // Admin e Coordenador utilizam a mesma central
        case 'profissional':
            return 'profissional.html';
        default:
            return 'painel.html';
    }
}

// Auto-login se já autenticado na tela inicial
(function verificarSessaoAtiva() {
    const token = localStorage.getItem('token');
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');

    if (token && isLoginPage) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            window.location.href = redirecionarPorPerfil(payload.perfil);
        } catch (e) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
        }
    }
})();

// 1. Lógica de Login
const formLogin = document.getElementById('formLogin');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const senhaInput = document.getElementById('senha');
        const msgErro = document.getElementById('mensagemErro');
        const textoErro = document.getElementById('textoErro');
        const btnSubmit = formLogin.querySelector('button[type="submit"]');

        const email = emailInput.value.trim();
        const senha = senhaInput.value;

        if (msgErro) {
            if (textoErro) textoErro.textContent = '';
            else msgErro.textContent = '';
            msgErro.classList.add('d-none');
        }

        const textoOriginal = btnSubmit ? btnSubmit.innerHTML : '<span>Entrar na Plataforma</span>';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span><span>Validando credenciais...</span>';
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                if (data.utilizador) {
                    localStorage.setItem('usuario', JSON.stringify(data.utilizador));
                }
                const perfil = data.utilizador?.perfil;
                window.location.href = redirecionarPorPerfil(perfil);
            } else {
                if (msgErro) {
                    const msg = data.erro || 'Falha ao autenticar. Verifique o seu e-mail e senha.';
                    if (textoErro) {
                        textoErro.textContent = msg;
                    } else {
                        msgErro.textContent = msg;
                    }
                    msgErro.classList.remove('d-none');
                }
            }
        } catch (error) {
            if (msgErro) {
                const msg = 'Erro de ligação com o servidor. Verifique se a API está em execução.';
                if (textoErro) textoErro.textContent = msg;
                else msgErro.textContent = msg;
                msgErro.classList.remove('d-none');
            }
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = textoOriginal;
            }
        }
    });
}

// 2. Lógica de Cadastro
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = formCadastro.querySelector('button[type="submit"]');
        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefone = document.getElementById('telefone').value.trim();
        const senha = document.getElementById('senha').value;
        const confirmar_senha = document.getElementById('confirmar_senha').value;

        const consentimento_termos = document.getElementById('termoUso').checked ? 1 : 0;
        const consentimento_imagem = document.getElementById('termoImagem').checked ? 1 : 0;

        const msgDiv = document.getElementById('mensagemCadastro');
        const textoOriginal = btnSubmit ? btnSubmit.innerHTML : '<span>Finalizar Registo</span>';

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span><span>Processando registo...</span>';
        }

        try {
            const response = await fetch(`${API_URL}/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, telefone, senha, confirmar_senha, consentimento_termos, consentimento_imagem })
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-success"><i class="bi bi-check-circle-fill"></i><span>Registo realizado com sucesso! Redirecionando...</span></div>`;
                setTimeout(() => window.location.href = 'index.html', 1500);
            } else {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-triangle-fill"></i><span>${data.erro || 'Erro ao processar registo.'}</span></div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro de ligação ao servidor.</span></div>`;
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = textoOriginal;
            }
        }
    });
}

// 3. Solicitação de Recuperação de Senha
const formEsqueci = document.getElementById('formEsqueci');
if (formEsqueci) {
    formEsqueci.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgRecuperacao');
        const btnSubmit = formEsqueci.querySelector('button[type="submit"]');
        const email = document.getElementById('emailRecuperacao').value.trim();

        msgDiv.innerHTML = '<div class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>Processando solicitação...</div>';
        const textoOriginal = btnSubmit ? btnSubmit.innerHTML : '<span>Enviar Link</span>';

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span><span>Enviando...</span>';
        }

        try {
            const response = await fetch(`${API_URL}/esqueci-senha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-success"><i class="bi bi-check-circle-fill"></i><span>${data.mensagem || 'Link de recuperação enviado com sucesso!'}</span></div>`;
            } else {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-triangle-fill"></i><span>${data.erro || 'Não foi possível enviar o link.'}</span></div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro de ligação ao servidor.</span></div>';
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = textoOriginal;
            }
        }
    });
}

// 4. Redefinição de Senha
const formRedefinir = document.getElementById('formRedefinir');
if (formRedefinir) {
    formRedefinir.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgRedefinir');
        const btnSubmit = formRedefinir.querySelector('button[type="submit"]');
        const nova_senha = document.getElementById('novaSenha').value;
        const confirmar_senha = document.getElementById('confirmarNovaSenha').value;

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
            msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-octagon-fill"></i><span>Link de recuperação inválido (Token ausente).</span></div>';
            return;
        }

        if (nova_senha !== confirmar_senha) {
            msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-circle-fill"></i><span>As palavras-passe não coincidem.</span></div>';
            return;
        }

        const textoOriginal = btnSubmit ? btnSubmit.innerHTML : '<span>Atualizar Palavra-passe</span>';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span><span>Atualizando...</span>';
        }

        try {
            const response = await fetch(`${API_URL}/redefinir-senha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, nova_senha, confirmar_senha })
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-success"><i class="bi bi-check-circle-fill"></i><span>${data.mensagem || 'Senha atualizada!'} Redirecionando...</span></div>`;
                setTimeout(() => window.location.href = 'index.html', 2000);
            } else {
                msgDiv.innerHTML = `<div class="alert-custom alert-custom-danger"><i class="bi bi-exclamation-triangle-fill"></i><span>${data.erro || 'Erro ao redefinir senha.'}</span></div>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<div class="alert-custom alert-custom-danger"><i class="bi bi-wifi-off"></i><span>Erro de ligação ao servidor.</span></div>';
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = textoOriginal;
            }
        }
    });
}