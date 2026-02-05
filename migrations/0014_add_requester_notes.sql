-- Migração: Adicionar tabela de anotações sobre clientes
-- Data: 2026-01-20
-- Descrição: Cria tabela requester_notes para armazenar anotações internas sobre clientes

CREATE TABLE IF NOT EXISTS requester_notes (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES requesters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_important BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_requester_notes_requester_id ON requester_notes(requester_id);
CREATE INDEX idx_requester_notes_author_id ON requester_notes(author_id);
CREATE INDEX idx_requester_notes_created_at ON requester_notes(created_at DESC);

-- Comentários
COMMENT ON TABLE requester_notes IS 'Anotações internas sobre clientes/solicitantes';
COMMENT ON COLUMN requester_notes.requester_id IS 'ID do cliente ao qual a anotação se refere';
COMMENT ON COLUMN requester_notes.content IS 'Conteúdo da anotação';
COMMENT ON COLUMN requester_notes.author_id IS 'ID do usuário que criou a anotação';
COMMENT ON COLUMN requester_notes.is_important IS 'Indica se a anotação é importante e deve ser destacada';
