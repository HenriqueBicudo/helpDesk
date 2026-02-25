-- Criar enum para tipo de tarefa
CREATE TYPE task_type AS ENUM ('support', 'parallel');

-- Criar enum para status de tarefa
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'pending', 'completed', 'cancelled');

-- Criar tabela de tarefas
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  task_number INTEGER NOT NULL,
  task_code VARCHAR(50) NOT NULL UNIQUE,
  type task_type NOT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'open',
  priority priority NOT NULL DEFAULT 'medium',
  team_id INTEGER REFERENCES teams(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  
  -- Campos de SLA
  response_due_at TIMESTAMP,
  solution_due_at TIMESTAMP,
  
  -- Controle de horas
  time_spent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  
  -- Data de conclusão
  completed_at TIMESTAMP,
  completed_by INTEGER REFERENCES users(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Índices para melhorar performance
  CONSTRAINT unique_task_per_ticket UNIQUE (ticket_id, task_number)
);

-- Criar tabela de interações de tarefas
CREATE TABLE task_interactions (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  type interaction_type NOT NULL,
  content TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  time_spent NUMERIC(5, 2),
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para melhorar performance de queries
CREATE INDEX idx_tasks_ticket_id ON tasks(ticket_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_task_interactions_task_id ON task_interactions(task_id);
CREATE INDEX idx_task_interactions_user_id ON task_interactions(user_id);

-- Adicionar coluna no tickets para controlar se está pausado por tarefa de apoio
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS paused_by_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_tickets_paused_by_task_id ON tickets(paused_by_task_id);

-- Comentários das tabelas
COMMENT ON TABLE tasks IS 'Tarefas associadas a tickets - podem ser de apoio (pausam o ticket) ou paralelas';
COMMENT ON TABLE task_interactions IS 'Interações (comentários, apontamentos, etc) das tarefas';
COMMENT ON COLUMN tasks.type IS 'Tipo de tarefa: support (pausa o ticket) ou parallel (não pausa)';
COMMENT ON COLUMN tasks.task_number IS 'Número sequencial da tarefa no contexto do ticket (1, 2, 3...)';
COMMENT ON COLUMN tasks.task_code IS 'Código único da tarefa no formato {ticketId}-T{taskNumber} ex: 123-T1';
COMMENT ON COLUMN tickets.paused_by_task_id IS 'ID da tarefa de apoio que está pausando este ticket (null se não pausado)';
