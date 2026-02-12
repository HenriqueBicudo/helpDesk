-- Migração para adicionar colunas necessárias para Drizzle
-- Mantém compatibilidade com estrutura existente

-- 1. Adicionar coluna rules (JSON das regras)
ALTER TABLE sla_templates ADD COLUMN IF NOT EXISTS rules TEXT;

-- 2. Adicionar coluna is_active (compatível com Drizzle)
ALTER TABLE sla_templates ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1;

-- 3. Preencher rules com dados da sla_template_rules
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
)
WHERE rules IS NULL;

-- 4. Preencher regras padrão onde não existir dados relacionados
UPDATE sla_templates 
SET rules = '[
    {"priority":"critical","responseTimeMinutes":15,"solutionTimeMinutes":240},
    {"priority":"high","responseTimeMinutes":60,"solutionTimeMinutes":480},
    {"priority":"medium","responseTimeMinutes":240,"solutionTimeMinutes":1440},
    {"priority":"low","responseTimeMinutes":480,"solutionTimeMinutes":2880}
]'
WHERE rules IS NULL OR rules = 'null' OR rules = '';

-- 5. Atualizar is_active baseado em is_default
UPDATE sla_templates 
SET is_active = CASE WHEN is_default THEN 1 ELSE 1 END;

-- 6. Garantir que type existe (usar contract_type se não tiver)
UPDATE sla_templates 
SET type = contract_type 
WHERE type IS NULL OR type = '';

-- 7. Definir NOT NULL nas novas colunas
UPDATE sla_templates SET rules = '[]' WHERE rules IS NULL;
UPDATE sla_templates SET is_active = 1 WHERE is_active IS NULL;
UPDATE sla_templates SET type = 'support' WHERE type IS NULL OR type = '';

ALTER TABLE sla_templates 
ALTER COLUMN rules SET NOT NULL,
ALTER COLUMN is_active SET NOT NULL;

-- 8. Criar novos IDs como VARCHAR se necessário (manter os existentes funcionando)
-- Por enquanto, vamos manter os IDs como INTEGER e ajustar o service