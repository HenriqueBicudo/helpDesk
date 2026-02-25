-- Adicionar coluna para atribuir tarefa a um usuário específico
ALTER TABLE tasks ADD COLUMN assigned_to_id INTEGER REFERENCES users(id);

-- Criar índice para melhorar performance de queries
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_id);
