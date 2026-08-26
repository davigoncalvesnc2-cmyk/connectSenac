    // frontend/js/auth.js

    // Resolução inteligente da URL base da API
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

    // Lógica de Login
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que a página recarregue ao submeter o formulário

            const emailInput = document.getElementById('email');
            const senhaInput = document.getElementById('senha');
            const msgErro = document.getElementById('mensagemErro');
            const btnSubmit = formLogin.querySelector('button[type="submit"]');

            const email = emailInput.value.trim();
            const senha = senhaInput.value;

            // Limpar erros anteriores
            if (msgErro) {
                msgErro.textContent = '';
                msgErro.classList.add('d-none');
            }

            // Feedback visual no botão
            const textoOriginal = btnSubmit ? btnSubmit.innerHTML : 'Entrar na Plataforma';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>A validar credenciais...';
            }

            try {
                // Fazendo a requisição POST para o Back-end
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha })
                });

                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error('O servidor retornou uma resposta inesperada. Verifique se o backend está em execução.');
                }

                if (response.ok) {
                    // Guarda o Token JWT no navegador para as próximas requisições
                    localStorage.setItem('token', data.token);
                    if (data.utilizador) {
                        localStorage.setItem('usuario', JSON.stringify(data.utilizador));
                    }

                    // Redireciona para o painel correspondente ao perfil
                    const perfil = data.utilizador?.perfil;
                    if (perfil === 'admin' || perfil === 'coordenador') {
                        window.location.href = 'admin.html';
                    } else if (perfil === 'profissional') {
                        window.location.href = 'profissional.html';
                    } else {
                        window.location.href = 'painel.html';
                    }
                } else {
                    if (msgErro) {
                        msgErro.textContent = data.erro || 'Falha ao autenticar. Verifique o seu e-mail e senha.';
                        msgErro.classList.remove('d-none');
                    }
                }
            } catch (error) {
                console.error('Erro na requisição de login:', error);
                if (msgErro) {
                    msgErro.textContent = 'Erro de ligação com o servidor. Verifique se o backend está a rodar na porta 3000.';
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

    // Lógica de Registo
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

            // Transformamos o 'checked' em 1 ou 0 para o banco de dados
            const consentimento_termos = document.getElementById('termoUso').checked ? 1 : 0;
            const consentimento_imagem = document.getElementById('termoImagem').checked ? 1 : 0;

            const msgDiv = document.getElementById('mensagemCadastro');
            const textoOriginal = btnSubmit ? btnSubmit.innerHTML : 'Finalizar Registo';

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>A processar registo...';
            }

            try {
                const response = await fetch(`${API_URL}/registrar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, telefone, senha, confirmar_senha, consentimento_termos, consentimento_imagem })
                });

                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error('Resposta inválida do servidor.');
                }

                if (response.ok) {
                    msgDiv.innerHTML = `<span class="text-success fw-bold">Registo realizado com sucesso! A redirecionar...</span>`;
                    setTimeout(() => {
                        window.location.href = 'index.html'; // Volta para o login após registar
                    }, 2000);
                } else {
                    msgDiv.innerHTML = `<span class="text-danger fw-bold">${data.erro || 'Erro ao processar registo.'}</span>`;
                }
            } catch (error) {
                console.error('Erro no registo:', error);
                msgDiv.innerHTML = `<span class="text-danger fw-bold">Erro de ligação ao servidor (porta 3000).</span>`;
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = textoOriginal;
                }
            }
        });
    }

    // Lógica de Solicitar Recuperação
    const formEsqueci = document.getElementById('formEsqueci');
    if (formEsqueci) {
        formEsqueci.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('msgRecuperacao');
            const btnSubmit = formEsqueci.querySelector('button[type="submit"]');
            const email = document.getElementById('emailRecuperacao').value.trim();

            msgDiv.innerHTML = '<span class="text-primary">A processar...</span>';
            const textoOriginal = btnSubmit ? btnSubmit.innerHTML : 'Enviar Link';

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>A enviar...';
            }

            try {
                const response = await fetch(`${API_URL}/esqueci-senha`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();
                msgDiv.innerHTML = `<span class="text-success">${data.mensagem}</span>`;
            } catch (error) {
                msgDiv.innerHTML = '<span class="text-danger">Erro de ligação ao servidor.</span>';
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = textoOriginal;
                }
            }
        });
    }

    // Lógica de Redefinir Senha
    const formRedefinir = document.getElementById('formRedefinir');
    if (formRedefinir) {
        formRedefinir.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('msgRedefinir');
            const btnSubmit = formRedefinir.querySelector('button[type="submit"]');
            const nova_senha = document.getElementById('novaSenha').value;
            const confirmar_senha = document.getElementById('confirmarNovaSenha').value;

            // Capturar o token da URL (ex: ?token=abc123xyz)
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');

            if (!token) {
                msgDiv.innerHTML = '<span class="text-danger">Link de recuperação inválido (Token ausente).</span>';
                return;
            }

            if (nova_senha !== confirmar_senha) {
                msgDiv.innerHTML = '<span class="text-danger">As palavras-passe não coincidem.</span>';
                return;
            }

            const textoOriginal = btnSubmit ? btnSubmit.innerHTML : 'Atualizar Palavra-passe';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>A atualizar...';
            }

            try {
                const response = await fetch(`${API_URL}/redefinir-senha`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, nova_senha, confirmar_senha })
                });

                const data = await response.json();

                if (response.ok) {
                    msgDiv.innerHTML = `<span class="text-success">${data.mensagem} A redirecionar...</span>`;
                    setTimeout(() => window.location.href = 'index.html', 3000);
                } else {
                    msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
                }
            } catch (error) {
                msgDiv.innerHTML = '<span class="text-danger">Erro de ligação ao servidor.</span>';
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = textoOriginal;
                }
            }
        });
    }