-- Migração para alinhar sla_templates com o schema Drizzle
-- Converte estrutura relacional para estrutura com JSON

-- 1. Backup dos dados atuais
CREATE TEMP TABLE sla_templates_backup AS 
SELECT 
    st.*,
    json_agg(
        json_build_object(
            'priority', str.priority,
            'responseTimeMinutes', str.response_time_minutes,
            'solutionTimeMinutes', str.solution_time_minutes
        )
    ) as rules_json
FROM sla_templates st
LEFT JOIN sla_template_rules str ON st.id = str.template_id
GROUP BY st.id, st.name, st.description, st.contract_type, st.is_default, st.created_at, st.updated_at, st.type;

-- 2. Dropar tabelas existentes (mas manter backup temporário)
DROP TABLE IF EXISTS sla_template_rules CASCADE;
DROP TABLE IF EXISTS sla_templates CASCADE;

-- 3. Recriar sla_templates conforme schema Drizzle
CREATE TABLE sla_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL, -- support, maintenance, development, consulting
    rules TEXT NOT NULL, -- JSON string das regras
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Converter e inserir dados do backup
INSERT INTO sla_templates (id, name, description, type, rules, is_active, created_at, updated_at)
SELECT 
    'template_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || SUBSTR(MD5(RANDOM()::text), 1, 10),
    name,
    description,
    COALESCE(type, contract_type), -- usar type se existir, senão contract_type
    COALESCE(rules_json::text, '[{"priority":"medium","responseTimeMinutes":480,"solutionTimeMinutes":1440}]'),
    CASE WHEN is_default THEN 1 ELSE 1 END,
    created_at,
    updated_at
FROM sla_templates_backup;

-- 5. Criar índices
CREATE INDEX IF NOT EXISTS idx_sla_templates_type ON sla_templates(type);
CREATE INDEX IF NOT EXISTS idx_sla_templates_active ON sla_templates(is_active);

-- 6. Comentários
COMMENT ON TABLE sla_templates IS 'Templates de SLA com regras em formato JSON - Schema Drizzle';
COMMENT ON COLUMN sla_templates.rules IS 'Regras SLA em formato JSON: [{"priority":"critical","responseTimeMinutes":15,"solutionTimeMinutes":240}]';
COMMENT ON COLUMN sla_templates.is_active IS 'Status ativo (1=ativo, 0=inativo) - compatível com Drizzle';