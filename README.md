# 🚀 Connect Senac

Plataforma de gestão e agendamento de **modelos voluntários** para cursos e procedimentos práticos das unidades do SENAC.

---

## 📌 Perfis de Acesso & Funcionalidades

O sistema conta com Controle de Acesso Baseado em Funções (**RBAC**):

1. **Candidato / Modelo:**
   * Cadastro com conformidade à **LGPD** (termos de uso e uso de imagem).
   * Vitrine de cursos disponíveis e horários livres com contagem de vagas em tempo real.
   * Reserva e cancelamento de vagas (com regra de antecedência mínima de 2 horas).
   * Avaliação por estrelas (1 a 5) e comentário após a conclusão do serviço.

2. **Profissional (Professor / Instrutor):**
   * Visualização das turmas sob sua responsabilidade.
   * Lista de presença de modelos com link direto para contato via WhatsApp.
   * Confirmação de presença e conclusão do atendimento.

3. **Coordenador da Unidade:**
   * Cadastro e arquivamento de cursos (*Soft Delete*).
   * Abertura de grades de datas, horários e vagas.
   * Moderação e exclusão de contas de candidatos.

4. **Administrador Geral:**
   * Acesso completo a todas as funções de coordenação.
   * Dashboard executivo com métricas em tempo real (Total de usuários, ativos, concluídos e taxa de absenteísmo).
   * Criação de novos colaboradores (Profissionais, Coordenadores e outros Administradores).
   * Bloqueio/Desbloqueio global de contas.

---

## 🛠️ Tecnologias Utilizadas

* **Runtime:** Node.js (CommonJS)
* **Framework Web:** Express 5.x
* **Banco de Dados:** Supabase (PostgreSQL)
* **Segurança:** JSON Web Tokens (JWT) & bcrypt (Hash de senhas)
* **Automação:** node-cron (Rotina em background para envio/notificação de lembretes)
* **Frontend:** HTML5, CSS3, Bootstrap 5.3, Bootstrap Icons e Vanilla JavaScript

---

## 📂 Estrutura de Pastas

```text
CONNECT-SENAC/
├── backend/
│   ├── config/
│   │   └── database.js               # Conexão com o Supabase
│   ├── controllers/                  # Controladores da API
│   │   ├── adminController.js
│   │   ├── agendamentoController.js
│   │   ├── cursoController.js
│   │   ├── dashboardController.js
│   │   ├── disponibilidadeController.js
│   │   ├── feedbackController.js
│   │   ├── profissionalController.js
│   │   └── usuarioController.js
│   ├── cron/
│   │   └── notificador.js            # Motor de notificações em segundo plano
│   ├── middlewares/
│   │   ├── authMiddleware.js         # Autenticação JWT e status de conta
│   │   └── rbacMiddleware.js         # Controle de autorização por perfil
│   └── routes/                       # Rotas da API REST
├── frontend/                         # Interface de Usuário
│   ├── js/                           # Scripts clientes (auth.js, painel.js, admin.js)
│   ├── index.html                    # Login
│   ├── cadastro.html                 # Registro
│   ├── painel.html                   # Painel do Candidato
│   ├── profissional.html             # Painel do Professor
│   ├── admin.html                    # Painel Administrativo / Coordenação
│   ├── esqueciSenha.html             # Solicitação de recuperação de senha
│   └── definirSenha.html             # Redefinição de senha com token
├── server.js                         # Inicialização da aplicação
├── package.json
└── README.md
```

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
* [Node.js](https://nodejs.org/) instalado (versão 18 ou superior).
* Projeto configurado no [Supabase](https://supabase.com/).

### 2. Variáveis de Ambiente (`.env`)
Crie um arquivo `.env` na raiz do projeto contendo:
```env
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon-ou-service-role
JWT_SECRET=sua-chave-secreta-jwt
```

### 3. Instalação e Execução
```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento (com nodemon)
npm run dev

# Executar em modo de produção
npm start
```

Após iniciar, acesse a aplicação em: **`http://localhost:3000`**

---

## 🗄️ Estrutura do Banco de Dados (Supabase / PostgreSQL)

### Tabelas Principais:
1. **`usuarios`**: `id` (UUID), `nome`, `email`, `telefone`, `senha` (Hash), `perfil` (`candidato`, `profissional`, `coordenador`, `admin`), `is_bloqueado` (BOOLEAN), `consentimento_termos`, `consentimento_imagem`, `reset_token`, `reset_token_expires`, `created_at`.
2. **`cursos`**: `id` (UUID), `nome`, `descricao`, `motivo_modelo`, `restricoes`, `foto_url`, `localizacao`, `status` (`ativo`, `arquivado`), `profissional_id` (FK -> `usuarios.id`), `created_at`.
3. **`disponibilidades`**: `id` (UUID), `curso_id` (FK -> `cursos.id`), `data_hora` (TIMESTAMPTZ), `vagas_totais` (INT), `vagas_ocupadas` (INT, default 0), `created_at`.
4. **`agendamentos`**: `id` (UUID), `usuario_id` (FK -> `usuarios.id`), `disponibilidade_id` (FK -> `disponibilidades.id`), `status` (`agendado`, `concluido`, `cancelado`), `created_at`.
5. **`feedbacks`**: `id` (UUID), `agendamento_id` (FK -> `agendamentos.id`, UNIQUE), `nota` (INT 1-5), `comentario` (TEXT), `created_at`.

### View de Estatísticas do Admin (`view_usuarios_estatisticas`):
```sql
CREATE OR REPLACE VIEW view_usuarios_estatisticas AS
SELECT 
    u.id,
    u.nome,
    u.email,
    u.telefone,
    u.perfil,
    u.is_bloqueado,
    u.created_at,
    COALESCE(cursos_count.total, 0) AS cursos_ativos,
    COALESCE(ag_agendados.total, 0) AS total_agendados,
    COALESCE(ag_concluidos.total, 0) AS total_concluidos,
    COALESCE(ag_cancelados.total, 0) AS total_cancelados
FROM usuarios u
LEFT JOIN (
    SELECT profissional_id, COUNT(*) AS total 
    FROM cursos WHERE status = 'ativo' 
    GROUP BY profissional_id
) cursos_count ON cursos_count.profissional_id = u.id
LEFT JOIN (
    SELECT usuario_id, COUNT(*) AS total 
    FROM agendamentos WHERE status = 'agendado' 
    GROUP BY usuario_id
) ag_agendados ON ag_agendados.usuario_id = u.id
LEFT JOIN (
    SELECT usuario_id, COUNT(*) AS total 
    FROM agendamentos WHERE status = 'concluido' 
    GROUP BY usuario_id
) ag_concluidos ON ag_concluidos.usuario_id = u.id
LEFT JOIN (
    SELECT usuario_id, COUNT(*) AS total 
    FROM agendamentos WHERE status = 'cancelado' 
    GROUP BY usuario_id
) ag_cancelados ON ag_cancelados.usuario_id = u.id;
```
