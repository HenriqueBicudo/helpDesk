-- Adicionar campo para armazenar o Message-ID da thread de email
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS email_thread_id VARCHAR(255);

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_tickets_email_thread_id ON tickets(email_thread_id);
