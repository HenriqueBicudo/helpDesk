-- Migração para adicionar campos de tarefa na tabela tickets

-- Adicionar novos campos
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS is_task BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS task_type task_type,
  ADD COLUMN IF NOT EXISTS parent_ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS task_code VARCHAR(50) UNIQUE;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_tickets_is_task ON tickets(is_task);
CREATE INDEX IF NOT EXISTS idx_tickets_parent_ticket_id ON tickets(parent_ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_task_code ON tickets(task_code) WHERE task_code IS NOT NULL;

-- Comentários
COMMENT ON COLUMN tickets.is_task IS 'Identifica se este ticket é uma tarefa';
COMMENT ON COLUMN tickets.task_type IS 'Tipo da tarefa: support (pausa ticket) ou parallel';
COMMENT ON COLUMN tickets.parent_ticket_id IS 'ID do ticket original ao qual esta tarefa está vinculada';
COMMENT ON COLUMN tickets.task_code IS 'Código único da tarefa no formato {ticketId}-T{número}';
