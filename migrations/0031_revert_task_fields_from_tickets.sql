-- Reverter migração 0030 - remover campos de tarefa dos tickets

-- Remover índices
DROP INDEX IF EXISTS idx_tickets_task_code;
DROP INDEX IF EXISTS idx_tickets_parent_ticket_id;
DROP INDEX IF EXISTS idx_tickets_is_task;

-- Remover colunas
ALTER TABLE tickets 
  DROP COLUMN IF EXISTS task_code,
  DROP COLUMN IF EXISTS parent_ticket_id,
  DROP COLUMN IF EXISTS task_type,
  DROP COLUMN IF EXISTS is_task;
