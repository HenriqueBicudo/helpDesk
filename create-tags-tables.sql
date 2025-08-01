-- Criar enum para tipos de link se não existir
DO $$ BEGIN
    CREATE TYPE link_type AS ENUM ('related', 'duplicate', 'blocks', 'blocked_by', 'child', 'parent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela de tags
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL, -- Para cores em formato hex #ffffff
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Criar tabela de relacionamento ticket_tags
CREATE TABLE IF NOT EXISTS ticket_tags (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(ticket_id, tag_id)
);

-- Criar tabela de links entre tickets
CREATE TABLE IF NOT EXISTS linked_tickets (
    id SERIAL PRIMARY KEY,
    source_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    target_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    link_type link_type NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT no_self_link CHECK (source_ticket_id != target_ticket_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ticket_tags_ticket_id ON ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tags_tag_id ON ticket_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_linked_tickets_source ON linked_tickets(source_ticket_id);
CREATE INDEX IF NOT EXISTS idx_linked_tickets_target ON linked_tickets(target_ticket_id);

-- Inserir algumas tags padrão
INSERT INTO tags (name, color) VALUES 
    ('Urgente', '#ff4444'),
    ('Bug', '#ff6b35'),
    ('Melhoria', '#4dabf7'),
    ('Dúvida', '#69db7c'),
    ('Cliente VIP', '#ffd43b'),
    ('Produção', '#ff8787'),
    ('Desenvolvimento', '#74c0fc'),
    ('Mobile', '#9775fa'),
    ('Web', '#51cf66'),
    ('API', '#ffd43b')
ON CONFLICT (name) DO NOTHING;

COMMIT;
