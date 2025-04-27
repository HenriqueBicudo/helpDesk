-- Scripts para criar as tabelas no SQL Server

-- Tabela de usuários (agentes)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(100) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL DEFAULT 'agent',
        avatar_initials NVARCHAR(10) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END

-- Tabela de solicitantes (clientes)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'requesters')
BEGIN
    CREATE TABLE requesters (
        id INT IDENTITY(1,1) PRIMARY KEY,
        full_name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        company NVARCHAR(255) NULL,
        avatar_initials NVARCHAR(10) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END

-- Tabela de chamados (tickets)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tickets')
BEGIN
    CREATE TABLE tickets (
        id INT IDENTITY(1,1) PRIMARY KEY,
        subject NVARCHAR(255) NOT NULL,
        description NVARCHAR(4000) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        category VARCHAR(20) NOT NULL,
        requester_id INT NOT NULL,
        assignee_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_tickets_requesters FOREIGN KEY (requester_id) REFERENCES requesters(id),
        CONSTRAINT FK_tickets_users FOREIGN KEY (assignee_id) REFERENCES users(id),
        CONSTRAINT CK_tickets_status CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
        CONSTRAINT CK_tickets_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        CONSTRAINT CK_tickets_category CHECK (category IN ('technical_support', 'financial', 'commercial', 'other'))
    );
END

-- Inserir alguns dados iniciais de exemplo

-- Usuários (agentes)
IF NOT EXISTS (SELECT * FROM users WHERE username = 'jsilva')
BEGIN
    INSERT INTO users (username, password, full_name, email, role, avatar_initials)
    VALUES 
        ('jsilva', 'password123', 'João Silva', 'joao@example.com', 'agent', 'JS'),
        ('moliveira', 'password123', 'Maria Oliveira', 'maria@example.com', 'agent', 'MO'),
        ('psantos', 'password123', 'Pedro Santos', 'pedro@example.com', 'agent', 'PS'),
        ('asilva', 'password123', 'Ana Silva', 'ana@example.com', 'admin', 'AS');
END

-- Solicitantes (clientes)
IF NOT EXISTS (SELECT * FROM requesters WHERE email = 'marcos@example.com')
BEGIN
    INSERT INTO requesters (full_name, email, company, avatar_initials)
    VALUES 
        ('Marcos Santos', 'marcos@example.com', 'ABC Corp', 'MS'),
        ('Carlos Almeida', 'carlos@example.com', 'XYZ Corp', 'CA'),
        ('Julia Ferreira', 'julia@example.com', 'ABC Corp', 'JF'),
        ('Ricardo Lima', 'ricardo@example.com', '123 Corp', 'RL'),
        ('André Silva', 'andre@example.com', 'XYZ Corp', 'AS');
END

-- Chamados (tickets)
IF NOT EXISTS (SELECT * FROM tickets WHERE subject = 'Problema com login no sistema')
BEGIN
    INSERT INTO tickets (subject, description, status, priority, category, requester_id, assignee_id, created_at, updated_at)
    VALUES
        ('Problema com login no sistema', 'Não consigo acessar o sistema desde ontem.', 
         'in_progress', 'high', 'technical_support', 1, 1, 
         DATEADD(day, -2, GETDATE()), GETDATE()),
        
        ('Solicitação de novo equipamento', 'Preciso de um novo monitor para trabalho.',
         'resolved', 'medium', 'technical_support', 2, 2,
         DATEADD(day, -3, GETDATE()), GETDATE()),
        
        ('Erro ao gerar relatório financeiro', 'O sistema apresenta erro ao tentar gerar relatórios.',
         'pending', 'critical', 'financial', 3, 3,
         DATEADD(day, -4, GETDATE()), GETDATE()),
        
        ('Dúvida sobre uso da plataforma', 'Preciso de ajuda para configurar meu perfil.',
         'resolved', 'low', 'other', 4, 2,
         DATEADD(day, -5, GETDATE()), GETDATE()),
        
        ('Atualização do sistema operacional', 'Precisamos atualizar o sistema para a nova versão.',
         'open', 'medium', 'technical_support', 5, NULL,
         DATEADD(day, -5, GETDATE()), GETDATE());
END