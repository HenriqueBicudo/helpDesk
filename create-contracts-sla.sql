-- Script para criar apenas as tabelas SLA compatíveis com o schema existente
-- As tabelas contracts e calendars já existem

-- Criar tabela de regras de SLA (compatível com id VARCHAR da tabela contracts existente)
CREATE TABLE IF NOT EXISTS sla_rules (
    id SERIAL PRIMARY KEY,
    contract_id VARCHAR NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    priority priority NOT NULL, -- Usa o enum de prioridade já existente
    response_time_minutes INTEGER NOT NULL,
    solution_time_minutes INTEGER NOT NULL,
    escalation_time_minutes INTEGER,
    business_hours_only BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, priority)
);

-- Inserir regras de SLA para contratos existentes
-- Primeiro verificamos quais contratos existem
DO $$
DECLARE
    contract_record RECORD;
BEGIN
    -- Iterar sobre todos os contratos ativos
    FOR contract_record IN SELECT id FROM contracts WHERE status = 'active' LIMIT 3
    LOOP
        -- Inserir regras de SLA para cada contrato
        INSERT INTO sla_rules (contract_id, priority, response_time_minutes, solution_time_minutes, escalation_time_minutes, business_hours_only) VALUES 
            (contract_record.id, 'critical', 15, 240, 60, true),    -- 15min resposta, 4h solução
            (contract_record.id, 'high', 30, 480, 120, true),       -- 30min resposta, 8h solução  
            (contract_record.id, 'medium', 120, 1440, 240, true),   -- 2h resposta, 24h solução
            (contract_record.id, 'low', 480, 2880, null, true)      -- 8h resposta, 48h solução
        ON CONFLICT (contract_id, priority) DO NOTHING;
    END LOOP;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sla_rules_contract_id ON sla_rules(contract_id);
CREATE INDEX IF NOT EXISTS idx_sla_rules_priority ON sla_rules(priority);

COMMIT;
