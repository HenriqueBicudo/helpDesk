-- Adiciona campos de rastreamento de edição aos artigos da base de conhecimento
ALTER TABLE knowledge_articles 
ADD COLUMN IF NOT EXISTS last_edited_by_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_edited_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP;

-- Comentários
COMMENT ON COLUMN knowledge_articles.last_edited_by_id IS 'ID do último usuário que editou o artigo';
COMMENT ON COLUMN knowledge_articles.last_edited_by IS 'Nome do último usuário que editou o artigo';
COMMENT ON COLUMN knowledge_articles.last_edited_at IS 'Data e hora da última edição';
