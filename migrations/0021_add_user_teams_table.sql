-- Migration: Add user_teams table for many-to-many relationship
-- Permite que um agente pertença a múltiplas equipes

CREATE TABLE user_teams (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, team_id)
);

-- Criar índices para performance
CREATE INDEX idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX idx_user_teams_team_id ON user_teams(team_id);
CREATE INDEX idx_user_teams_is_primary ON user_teams(is_primary);

-- Migrar dados existentes da coluna teamId para a nova tabela
INSERT INTO user_teams (user_id, team_id, is_primary)
SELECT id, team_id, true
FROM users
WHERE team_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE user_teams IS 'Relacionamento muitos-para-muitos entre usuários e equipes';
COMMENT ON COLUMN user_teams.is_primary IS 'Indica se esta é a equipe principal do usuário';
