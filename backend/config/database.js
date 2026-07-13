// backend/config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define o caminho onde o arquivo do banco será salvo (dentro da pasta config)
const dbPath = path.resolve(__dirname, 'database.sqlite');

// Inicia a conexão com o banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso.');
        criarTabelas(); // Executa a criação das tabelas assim que conectar
    }
});

// Função responsável por estruturar nosso banco de dados
function criarTabelas(){
    // 1. Tabela de Usuários (Foco nas regras da LGPD)
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            telefone TEXT NOT NULL,
            senha TEXT NOT NULL,
            consentimento_termos BOOLEAN NOT NULL CHECK (consentimento_termos IN (0, 1)),
            consentimento_imagem BOOLEAN NOT NULL CHECK (consentimento_imagem IN (0, 1)),
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Tabela de Serviços
    db.run(`
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            duracao_minutos INTEGER NOT NULL
        )
    `, () => {
        // Seeding: Popula os serviços iniciais automaticamente caso não existam
        db.get("SELECT COUNT(*) as count FROM servicos", (err, row) => {
            if (row && row.count === 0) {
                db.run("INSERT INTO servicos (id, nome, duracao_minutos) VALUES (1, 'Corte de Cabelo (Modelo)', 60)");
                db.run("INSERT INTO servicos (id, nome, duracao_minutos) VALUES (2, 'Maquilhagem Artística', 90)");
                db.run("INSERT INTO servicos (id, nome, duracao_minutos) VALUES (3, 'Manicure e Pedicure', 60)");
                console.log('Serviços iniciais inseridos com sucesso.');
            }
        });
    });

    // 3. Tabela de Agendamentos (O coração das regras de negócio)
    db.run(`
        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            servico_id INTEGER NOT NULL,
            data_hora DATETIME NOT NULL,
            status TEXT DEFAULT 'Agendado' CHECK (status IN ('Agendado', 'Concluido', 'Cancelado')),
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
            FOREIGN KEY (servico_id) REFERENCES servicos (id) ON DELETE CASCADE
        )
    `);

    console.log('Tabelas sincronizadas com sucesso.');
}

// Exporta o banco para ser usado nos Models depois
module.exports = db;