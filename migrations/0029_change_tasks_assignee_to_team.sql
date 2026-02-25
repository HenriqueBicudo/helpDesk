-- Migração para alterar tarefas de assigneeId para teamId

-- Remover índice antigo
DROP INDEX IF EXISTS idx_tasks_assignee_id;

-- Alterar coluna assignee_id para team_id
ALTER TABLE tasks 
  DROP COLUMN IF EXISTS assignee_id,
  ADD COLUMN team_id INTEGER REFERENCES teams(id);

-- Criar novo índice para team_id
CREATE INDEX idx_tasks_team_id ON tasks(team_id);

-- Comentário da coluna
COMMENT ON COLUMN tasks.team_id IS 'ID da equipe responsável pela tarefa (ao invés de usuário individual)';
