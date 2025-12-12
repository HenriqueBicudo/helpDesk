-- Migração simplificada para alinhar com Drizzle schema
-- Altera a tabela existente ao invés de recriá-la

-- 1. Primeiro, vamos alterar a estrutura existente
ALTER TABLE sla_templates 
DROP COLUMN IF EXISTS id CASCADE,
ADD COLUMN id_new VARCHAR(255),
ADD COLUMN rules TEXT,
ALTER COLUMN is_default DROP DEFAULT,
ADD COLUMN is_active INTEGER DEFAULT 1;

-- 2. Criar os novos IDs únicos
UPDATE sla_templates 
SET id_new = 'template_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || SUBSTR(MD5(RANDOM()::text), 1, 10);

-- 3. Buscar as regras da tabela relacionada e converter para JSON
UPDATE sla_templates 
SET rules = (
    SELECT json_agg(
        json_build_object(
            'priority', str.priority,
            'responseTimeMinutes', str.response_time_minutes,
            'solutionTimeMinutes', str.solution_time_minutes
        )
    )::text
    FROM sla_template_rules str 
    WHERE str.template_id = sla_templates.id
);

-- 4. Preencher regras padrão onde não existir
UPDATE sla_templates 
SET rules = '[
    {"priority":"critical","responseTimeMinutes":15,"solutionTimeMinutes":240},
    {"priority":"high","responseTimeMinutes":60,"solutionTimeMinutes":480},
    {"priority":"medium","responseTimeMinutes":240,"solutionTimeMinutes":1440},
    {"priority":"low","responseTimeMinutes":480,"solutionTimeMinutes":2880}
]'
WHERE rules IS NULL OR rules = 'null';

-- 5. Ajustar coluna is_active
UPDATE sla_templates 
SET is_active = CASE WHEN is_default THEN 1 ELSE 1 END;

-- 6. Ajustar coluna type usando contract_type
UPDATE sla_templates 
SET type = COALESCE(type, contract_type);

-- 7. Reorganizar colunas - dropar antigas e renomear novas
ALTER TABLE sla_templates 
DROP COLUMN IF EXISTS is_default,
DROP COLUMN IF EXISTS contract_type;

-- Renomear id_new para id
ALTER TABLE sla_templates 
DROP CONSTRAINT IF EXISTS sla_templates_pkey,
ADD PRIMARY KEY (id_new);

-- Dropar coluna id antiga e renomear id_new
ALTER TABLE sla_templates 
RENAME COLUMN id_new TO id;

-- 8. Garantir que rules não seja null
ALTER TABLE sla_templates 
ALTER COLUMN rules SET NOT NULL,
ALTER COLUMN type SET NOT NULL,
ALTER COLUMN is_active SET NOT NULL;