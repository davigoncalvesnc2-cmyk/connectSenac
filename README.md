# Connect Senac

Plataforma integrada de agendamento de serviços práticos para a comunidade escolar e atendimento ao público no Senac.

## 🚀 Funcionalidades

- **Autenticação & Perfis (RBAC):**
  - **Candidato:** Visualização de catálogo de cursos/serviços, agendamento de horários, cancelamento e avaliação com estrelas e comentários.
  - **Profissional (Professor):** Visualização de turmas vinculadas, lista de presença de modelos, confirmação de atendimento e contato via WhatsApp.
  - **Coordenador / Administrador:** Dashboard com métricas em tempo real, gestão de usuários, cadastro de cursos com fotos/localização, disponibilização de vagas e moderação.

- **Motor de Notificações Automáticas (CRON):**
  - Notificações enviadas com 24 horas e 3 horas de antecedência aos modelos agendados.

- **Segurança:**
  - Autenticação via JWT.
  - Criptografia de senhas com `bcryptjs`.
  - Sanitização de saídas no frontend contra Cross-Site Scripting (XSS).
  - Controle de concorrência e integridade referencial nas regras de agendamento e overbooking.

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js, Express 5, `@supabase/supabase-js`, `jsonwebtoken`, `bcryptjs`, `node-cron`, `dotenvx`.
- **Frontend:** HTML5, CSS3, Bootstrap 5, Bootstrap Icons, JavaScript (ES6+ Vanilla).
- **Banco de Dados:** PostgreSQL hospedado no Supabase.

## 📦 Instalação e Execução

1. Clone o repositório:
```bash
git clone https://github.com/davigoncalvesnc2-cmyk/connectSenac.git
cd connectSenac
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env` baseado no `.env.example`:
```env
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon-ou-service-role
JWT_SECRET=sua_chave_jwt_secreta
```

4. Execute o script DDL no seu banco PostgreSQL (Supabase SQL Editor):
Execute o conteúdo do arquivo `database/schema.sql`.

5. Inicie a aplicação:
```bash
npm start
```
Acesse `http://localhost:3000` no seu navegador.
