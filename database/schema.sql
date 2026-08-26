-- ============================================================================
-- CONNECT SENAC - SCHEMA DO BANCO DE DADOS (PostgreSQL / Supabase)
-- ============================================================================

-- 1. Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(50) DEFAULT 'candidato' CHECK (perfil IN ('candidato', 'profissional', 'coordenador', 'admin')),
    is_bloqueado BOOLEAN DEFAULT FALSE,
    consentimento_termos BOOLEAN DEFAULT TRUE,
    consentimento_imagem BOOLEAN DEFAULT FALSE,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela Cursos
CREATE TABLE IF NOT EXISTS cursos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    motivo_modelo TEXT,
    restricoes TEXT,
    foto_url TEXT,
    localizacao VARCHAR(255) DEFAULT 'SENAC',
    status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado')),
    profissional_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela Disponibilidades (Grades de Horários)
CREATE TABLE IF NOT EXISTS disponibilidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    data_hora TIMESTAMPTZ NOT NULL,
    vagas_totais INT NOT NULL CHECK (vagas_totais > 0),
    vagas_ocupadas INT DEFAULT 0 CHECK (vagas_ocupadas >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_curso_horario UNIQUE (curso_id, data_hora),
    CONSTRAINT check_vagas_limite CHECK (vagas_ocupadas <= vagas_totais)
);

-- 5. Tabela Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    disponibilidade_id UUID NOT NULL REFERENCES disponibilidades(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'agendado' CHECK (status IN ('agendado', 'concluido', 'cancelado')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_usuario_disponibilidade UNIQUE (usuario_id, disponibilidade_id)
);

-- 6. Tabela Feedbacks
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agendamento_id UUID UNIQUE NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
    nota INT NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. View Estatística para Painel de Moderação / Dashboard
CREATE OR REPLACE VIEW view_usuarios_estatisticas AS
SELECT 
    u.id,
    u.nome,
    u.email,
    u.telefone,
    u.perfil,
    u.is_bloqueado,
    u.created_at,
    COALESCE((SELECT COUNT(*) FROM cursos c WHERE c.profissional_id = u.id AND c.status = 'ativo'), 0) AS cursos_ativos,
    COALESCE(SUM(CASE WHEN a.status = 'agendado' THEN 1 ELSE 0 END), 0) AS total_agendados,
    COALESCE(SUM(CASE WHEN a.status = 'concluido' THEN 1 ELSE 0 END), 0) AS total_concluidos,
    COALESCE(SUM(CASE WHEN a.status = 'cancelado' THEN 1 ELSE 0 END), 0) AS total_cancelados
FROM usuarios u
LEFT JOIN agendamentos a ON a.usuario_id = u.id
GROUP BY u.id, u.nome, u.email, u.telefone, u.perfil, u.is_bloqueado, u.created_at;
