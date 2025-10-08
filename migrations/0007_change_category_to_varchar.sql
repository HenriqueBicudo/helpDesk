-- Migração para alterar a coluna category de enum para varchar
-- Isso permite que a categoria seja definida dinamicamente pelos nomes dos teams

-- Primeiro, criar uma nova coluna temporária
ALTER TABLE tickets ADD COLUMN category_new VARCHAR(255);

-- Copiar dados da coluna antiga para a nova, mapeando os valores do enum
UPDATE tickets SET category_new = CASE 
    WHEN category = 'technical_support' THEN 'Suporte Técnico'
    WHEN category = 'financial' THEN 'Financeiro' 
    WHEN category = 'commercial' THEN 'Suporte Comercial'
    WHEN category = 'general' THEN 'Atendimento Geral'
    WHEN category = 'other' THEN 'Outros'
    ELSE category::text
END;

-- Remover a coluna antiga
ALTER TABLE tickets DROP COLUMN category;

-- Renomear a nova coluna
ALTER TABLE tickets RENAME COLUMN category_new TO category;

-- Adicionar constraint NOT NULL
ALTER TABLE tickets ALTER COLUMN category SET NOT NULL;

-- Adicionar um valor padrão
ALTER TABLE tickets ALTER COLUMN category SET DEFAULT 'Geral';
