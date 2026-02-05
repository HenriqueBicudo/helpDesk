-- Criar tabela de artigos da base de conhecimento
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  views INTEGER NOT NULL DEFAULT 0,
  author_id INTEGER REFERENCES users(id),
  author VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_author_id ON knowledge_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_created_at ON knowledge_articles(created_at DESC);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_knowledge_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_articles_updated_at
BEFORE UPDATE ON knowledge_articles
FOR EACH ROW
EXECUTE FUNCTION update_knowledge_articles_updated_at();
