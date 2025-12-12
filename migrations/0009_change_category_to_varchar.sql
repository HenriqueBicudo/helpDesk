-- Migration para alterar category de ENUM para VARCHAR
-- Isso permite usar nomes de teams como categorias

-- Alterar a coluna category de enum para varchar
ALTER TABLE tickets ALTER COLUMN category DROP DEFAULT;
ALTER TABLE tickets ALTER COLUMN category TYPE VARCHAR(255) USING category::text;
ALTER TABLE tickets ALTER COLUMN category SET DEFAULT 'other';

-- Remover o enum category se não estiver sendo usado em outras tabelas
-- (Esta linha pode falhar se houver outras dependências, mas não afetará o resultado)
DROP TYPE IF EXISTS category;

-- Comentário para documentar a mudança
COMMENT ON COLUMN tickets.category IS 'Nome do team responsável pelo ticket (ex: Suporte Técnico, Atendimento Geral)';