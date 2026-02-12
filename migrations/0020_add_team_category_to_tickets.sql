-- Migration: Add teamId and categoryId columns to tickets table
-- Permite vincular tickets a equipes e categorias hierárquicas

ALTER TABLE tickets
ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
ADD COLUMN category_id INTEGER REFERENCES team_categories(id) ON DELETE SET NULL;

-- Criar índices para performance
CREATE INDEX idx_tickets_team_id ON tickets(team_id);
CREATE INDEX idx_tickets_category_id ON tickets(category_id);

-- Comentários nas colunas
COMMENT ON COLUMN tickets.team_id IS 'ID da equipe (categoria principal) selecionada ao criar o ticket';
COMMENT ON COLUMN tickets.category_id IS 'ID da categoria hierárquica selecionada ao criar o ticket';
