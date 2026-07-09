// frontend/js/auth.js

// URL base da nossa API
const API_URL = 'http://localhost:3000/api/usuarios';

// Lógica de Login
const formLogin = document.getElementById('formLogin');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que a página recarregue ao submeter o formulário

        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const msgErro = document.getElementById('mensagemErro');

        try {
            // Fazendo a requisição POST para o Back-end
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (response.ok) {
                // Guarda o Token JWT no navegador para as próximas requisições
                localStorage.setItem('token', data.token);
                // Redireciona para o painel do utilizador
                window.location.href = 'painel.html';
            } else {
                msgErro.textContent = data.erro;
                msgErro.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    });
}

// Lógica de Registo
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const telefone = document.getElementById('telefone').value;
        const senha = document.getElementById('senha').value;

        // Transformamos o 'checked' em 1 ou 0 para o banco de dados
        const consentimento_termos = document.getElementById('termoUso').checked ? 1 : 0;
        const consentimento_imagem = document.getElementById('termoImagem').checked ? 1 : 0;

        const msgDiv = document.getElementById('mensagemCadastro');

        try {
            const response = await fetch(`${API_URL}/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, telefone, senha, consentimento_termos, consentimento_imagem })
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<span class="text-success">Registo realizado com sucesso! A redirecionar...</span>`;
                setTimeout(() => {
                    window.location.href = 'index.html'; // Volta para o login após registar
                }, 2000);
            } else {
                msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    });
}