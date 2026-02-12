-- Migration para reestruturar sistema de SLA - Versão 2.0
-- Esta migration cria uma nova estrutura mais robusta e flexível

-- 1. NOVA TABELA: sla_templates (templates pré-configurados)
CREATE TABLE IF NOT EXISTS sla_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    contract_type VARCHAR(50) NOT NULL, -- support, maintenance, development, consulting
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. NOVA TABELA: sla_template_rules (regras do template por prioridade)
CREATE TABLE IF NOT EXISTS sla_template_rules (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES sla_templates(id) ON DELETE CASCADE,
    priority VARCHAR(20) NOT NULL, -- low, medium, high, urgent, critical
    
    -- Tempos em minutos (tempo útil)
    response_time_minutes INTEGER NOT NULL,
    solution_time_minutes INTEGER NOT NULL,
    
    -- Configurações de escalation (futuro)
    escalation_enabled BOOLEAN DEFAULT FALSE,
    escalation_time_minutes INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(template_id, priority)
);

-- 3. ATUALIZAR TABELA: contracts - adicionar referência ao template SLA
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS sla_template_id INTEGER REFERENCES sla_templates(id),
ADD COLUMN IF NOT EXISTS sla_enabled BOOLEAN DEFAULT TRUE;

-- 4. NOVA TABELA: business_calendars (mais detalhado que a atual)
CREATE TABLE IF NOT EXISTS business_calendars (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    
    -- Configurações gerais
    skip_weekends BOOLEAN DEFAULT TRUE,
    skip_holidays BOOLEAN DEFAULT TRUE,
    
    -- Horários de trabalho (JSON mais estruturado)
    working_hours JSONB NOT NULL DEFAULT '{
        "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "tuesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "wednesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "thursday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "friday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "saturday": {"enabled": false, "start": "09:00", "end": "12:00"},
        "sunday": {"enabled": false, "start": "09:00", "end": "12:00"}
    }',
    
    -- Lista de feriados (JSON estruturado)
    holidays JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. NOVA TABELA: sla_calculations (histórico de cálculos)
CREATE TABLE IF NOT EXISTS sla_calculations (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    
    -- Dados do cálculo
    calculated_at TIMESTAMP DEFAULT NOW(),
    priority VARCHAR(20) NOT NULL,
    
    -- Prazos calculados
    response_due_at TIMESTAMP,
    solution_due_at TIMESTAMP,
    
    -- Metadados do cálculo
    business_minutes_used INTEGER, -- minutos úteis consumidos
    calendar_id INTEGER REFERENCES business_calendars(id),
    sla_template_id INTEGER REFERENCES sla_templates(id),
    
    -- Status
    is_current BOOLEAN DEFAULT TRUE, -- marca se é o cálculo atual válido
    recalculated_reason TEXT, -- motivo de recálculo (mudança prioridade, etc)
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_sla_calculations_ticket_current ON sla_calculations(ticket_id, is_current);
CREATE INDEX IF NOT EXISTS idx_sla_calculations_due_dates ON sla_calculations(response_due_at, solution_due_at);
CREATE INDEX IF NOT EXISTS idx_contracts_sla_template ON contracts(sla_template_id);
CREATE INDEX IF NOT EXISTS idx_business_calendars_name ON business_calendars(name);

-- 7. INSERIR TEMPLATES SLA PADRÃO

-- Template para Suporte Técnico
INSERT INTO sla_templates (name, description, contract_type, is_default) 
VALUES ('Suporte Técnico Padrão', 'Template padrão para contratos de suporte técnico', 'support', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Regras do template de suporte
INSERT INTO sla_template_rules (template_id, priority, response_time_minutes, solution_time_minutes, escalation_enabled, escalation_time_minutes)
SELECT 
    (SELECT id FROM sla_templates WHERE name = 'Suporte Técnico Padrão'),
    priority,
    response_time_minutes,
    solution_time_minutes,
    escalation_enabled,
    escalation_time_minutes
FROM (VALUES 
    ('critical', 15, 240, TRUE, 30),    -- 15min resposta, 4h solução, escalar em 30min
    ('urgent', 60, 480, TRUE, 120),     -- 1h resposta, 8h solução, escalar em 2h
    ('high', 240, 1440, TRUE, 480),     -- 4h resposta, 24h solução, escalar em 8h
    ('medium', 480, 2880, FALSE, NULL), -- 8h resposta, 48h solução
    ('low', 1440, 7200, FALSE, NULL)    -- 24h resposta, 5 dias solução
) AS rules(priority, response_time_minutes, solution_time_minutes, escalation_enabled, escalation_time_minutes)
ON CONFLICT (template_id, priority) DO NOTHING;

-- Template para Manutenção
INSERT INTO sla_templates (name, description, contract_type, is_default) 
VALUES ('Manutenção Padrão', 'Template padrão para contratos de manutenção', 'maintenance', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO sla_template_rules (template_id, priority, response_time_minutes, solution_time_minutes, escalation_enabled, escalation_time_minutes)
SELECT 
    (SELECT id FROM sla_templates WHERE name = 'Manutenção Padrão'),
    priority,
    response_time_minutes,
    solution_time_minutes,
    escalation_enabled,
    escalation_time_minutes
FROM (VALUES 
    ('critical', 30, 480, TRUE, 60),
    ('urgent', 120, 960, TRUE, 240),
    ('high', 480, 2880, TRUE, 720),
    ('medium', 960, 5760, FALSE, NULL),
    ('low', 2880, 14400, FALSE, NULL)
) AS rules(priority, response_time_minutes, solution_time_minutes, escalation_enabled, escalation_time_minutes)
ON CONFLICT (template_id, priority) DO NOTHING;

-- 8. INSERIR CALENDÁRIO COMERCIAL PADRÃO BRASILEIRO
INSERT INTO business_calendars (name, description, timezone, skip_weekends, skip_holidays, working_hours, holidays)
VALUES (
    'Comercial Brasil',
    'Calendário comercial brasileiro padrão - Segunda a Sexta, 9h às 18h',
    'America/Sao_Paulo',
    TRUE,
    TRUE,
    '{
        "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "tuesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "wednesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "thursday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "friday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "saturday": {"enabled": false, "start": "09:00", "end": "12:00"},
        "sunday": {"enabled": false, "start": "09:00", "end": "12:00"}
    }',
    '[
        {"date": "2025-01-01", "name": "Confraternização Universal"},
        {"date": "2025-04-18", "name": "Sexta-feira Santa"},
        {"date": "2025-04-21", "name": "Tiradentes"},
        {"date": "2025-05-01", "name": "Dia do Trabalhador"},
        {"date": "2025-09-07", "name": "Independência do Brasil"},
        {"date": "2025-10-12", "name": "Nossa Senhora Aparecida"},
        {"date": "2025-11-02", "name": "Finados"},
        {"date": "2025-11-15", "name": "Proclamação da República"},
        {"date": "2025-12-25", "name": "Natal"}
    ]'
) ON CONFLICT (name) DO NOTHING;

-- 9. CALENDÁRIO 24/7 PARA CONTRATOS CRÍTICOS
INSERT INTO business_calendars (name, description, timezone, skip_weekends, skip_holidays, working_hours, holidays)
VALUES (
    'Suporte 24/7',
    'Calendário para suporte crítico 24 horas por dia, 7 dias por semana',
    'America/Sao_Paulo',
    FALSE,
    FALSE,
    '{
        "monday": {"enabled": true, "start": "00:00", "end": "23:59"},
        "tuesday": {"enabled": true, "start": "00:00", "end": "23:59"},
        "wednesday": {"enabled": true, "start": "00:00", "end": "23:59"},
        "thursday": {"enabled": true, "start": "00:00", "end": "23:59"},
        "friday": {"enabled": true, "start": "00:00", "end": "23:59"},
        "saturday": {"enabled": true, "start": "00:00", "end": "23:59"},
        "sunday": {"enabled": true, "start": "00:00", "end": "23:59"}
    }',
    '[]'
) ON CONFLICT (name) DO NOTHING;

-- 10. ATUALIZAR CONTRATOS EXISTENTES COM SLA PADRÃO
-- Vincula contratos de suporte ao template padrão
UPDATE contracts 
SET 
    sla_template_id = (SELECT id FROM sla_templates WHERE name = 'Suporte Técnico Padrão'),
    calendar_id = (SELECT id FROM business_calendars WHERE name = 'Comercial Brasil'),
    sla_enabled = TRUE
WHERE type = 'support' AND sla_template_id IS NULL;

-- Vincula contratos de manutenção ao template padrão  
UPDATE contracts 
SET 
    sla_template_id = (SELECT id FROM sla_templates WHERE name = 'Manutenção Padrão'),
    calendar_id = (SELECT id FROM business_calendars WHERE name = 'Comercial Brasil'),
    sla_enabled = TRUE
WHERE type = 'maintenance' AND sla_template_id IS NULL;

-- 11. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE sla_templates IS 'Templates de SLA pré-configurados por tipo de contrato';
COMMENT ON TABLE sla_template_rules IS 'Regras de tempo por prioridade dentro de cada template SLA';
COMMENT ON TABLE business_calendars IS 'Calendários de negócio com horários comerciais e feriados';
COMMENT ON TABLE sla_calculations IS 'Histórico de cálculos de SLA para auditoria e recálculos';

COMMENT ON COLUMN contracts.sla_template_id IS 'Template SLA aplicado a este contrato';
COMMENT ON COLUMN contracts.sla_enabled IS 'Se TRUE, aplica SLA aos tickets deste contrato';
COMMENT ON COLUMN sla_template_rules.escalation_enabled IS 'Se TRUE, ticket escala automaticamente após escalation_time_minutes';
COMMENT ON COLUMN business_calendars.timezone IS 'Fuso horário para cálculos de SLA (padrão: America/Sao_Paulo)';
COMMENT ON COLUMN sla_calculations.is_current IS 'Apenas um cálculo por ticket pode ser current=TRUE';

-- 12. FUNÇÃO PARA RECALCULAR SLA DE UM TICKET
CREATE OR REPLACE FUNCTION recalculate_ticket_sla(ticket_id_param INTEGER, reason TEXT DEFAULT 'Manual')
RETURNS BOOLEAN AS $$
BEGIN
    -- Marcar cálculo anterior como obsoleto
    UPDATE sla_calculations 
    SET is_current = FALSE,
        recalculated_reason = reason
    WHERE ticket_id = ticket_id_param AND is_current = TRUE;
    
    -- Trigger do sistema irá calcular novo SLA automaticamente
    -- quando o ticket for atualizado
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;