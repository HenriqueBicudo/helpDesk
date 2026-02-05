-- Criar tabela de categorias hierárquicas de equipes
CREATE TABLE IF NOT EXISTS team_categories (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_category_id INTEGER REFERENCES team_categories(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_team_categories_team_id ON team_categories(team_id);
CREATE INDEX IF NOT EXISTS idx_team_categories_parent_id ON team_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_team_categories_sort_order ON team_categories(sort_order);

-- Criar tabela de relacionamento entre categorias e usuários
CREATE TABLE IF NOT EXISTS team_category_users (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  category_id INTEGER NOT NULL REFERENCES team_categories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 1,
  auto_assign BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Garantir que um usuário não seja adicionado duas vezes na mesma categoria
  UNIQUE(category_id, user_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_team_category_users_category_id ON team_category_users(category_id);
CREATE INDEX IF NOT EXISTS idx_team_category_users_user_id ON team_category_users(user_id);
CREATE INDEX IF NOT EXISTS idx_team_category_users_auto_assign ON team_category_users(auto_assign);

-- Comentários para documentação
COMMENT ON TABLE team_categories IS 'Categorias hierárquicas de equipes para organização e distribuição de tickets';
COMMENT ON TABLE team_category_users IS 'Relacionamento entre categorias e usuários responsáveis';
COMMENT ON COLUMN team_categories.parent_category_id IS 'ID da categoria pai (NULL para categorias raiz)';
COMMENT ON COLUMN team_category_users.priority IS 'Prioridade do usuário na categoria (1 = primeira opção)';
COMMENT ON COLUMN team_category_users.auto_assign IS 'Se o usuário pode receber tickets automaticamente nesta categoria';
