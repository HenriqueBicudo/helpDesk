-- Tabela de solicitantes adicionais do ticket (múltiplos solicitantes)
CREATE TABLE IF NOT EXISTS ticket_requesters (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  requester_id INTEGER NOT NULL REFERENCES requesters(id),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, requester_id)
);

-- Tabela de pessoas em cópia (CC) do ticket
CREATE TABLE IF NOT EXISTS ticket_cc (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  email VARCHAR(100) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, email)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ticket_requesters_ticket_id ON ticket_requesters(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_requesters_requester_id ON ticket_requesters(requester_id);
CREATE INDEX IF NOT EXISTS idx_ticket_cc_ticket_id ON ticket_cc(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_cc_email ON ticket_cc(email);

-- Migrar solicitantes principais existentes para a nova tabela
INSERT INTO ticket_requesters (ticket_id, requester_id, is_primary, created_at)
SELECT id, requester_id, true, created_at
FROM tickets
WHERE requester_id IS NOT NULL
ON CONFLICT (ticket_id, requester_id) DO NOTHING;
