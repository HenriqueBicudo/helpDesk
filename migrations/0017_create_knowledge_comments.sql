-- Criar tabela de comentários dos artigos da base de conhecimento
CREATE TABLE IF NOT EXISTS knowledge_comments (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  author VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_knowledge_comments_article_id ON knowledge_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_comments_author_id ON knowledge_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_comments_created_at ON knowledge_comments(created_at DESC);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_knowledge_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_comments_updated_at
BEFORE UPDATE ON knowledge_comments
FOR EACH ROW
EXECUTE FUNCTION update_knowledge_comments_updated_at();
