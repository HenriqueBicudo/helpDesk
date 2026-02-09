-- Migration: Corrigir schema SLA V2
-- Esta migration corrige conflitos de schema e aplica a estrutura correta do SLA V2

BEGIN;

-- 1. Limpar dados existentes para evitar conflitos
DELETE FROM sla_template_rules WHERE EXISTS (SELECT 1 FROM sla_templates WHERE id = template_id);
DELETE FROM sla_templates;

-- 2. Dropar e recriar tabelas em ordem
DROP TABLE IF EXISTS sla_calculations CASCADE;
DROP TABLE IF EXISTS sla_template_rules CASCADE;
DROP TABLE IF EXISTS business_calendars CASCADE;
DROP TABLE IF EXISTS sla_templates CASCADE;

-- 3. Remover colunas antigas de contracts se existirem
ALTER TABLE contracts DROP COLUMN IF EXISTS sla_template_id CASCADE;
ALTER TABLE contracts DROP COLUMN IF EXISTS sla_enabled CASCADE;

-- 4. Criar sla_templates com schema correto
CREATE TABLE sla_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    contract_type VARCHAR(50) NOT NULL DEFAULT 'support',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Criar sla_template_rules
CREATE TABLE sla_template_rules (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES sla_templates(id) ON DELETE CASCADE,
    priority VARCHAR(20) NOT NULL,
    response_time_minutes INTEGER NOT NULL,
    solution_time_minutes INTEGER NOT NULL,
    escalation_enabled BOOLEAN DEFAULT FALSE,
    escalation_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(template_id, priority)
);

-- 6. Criar business_calendars
CREATE TABLE business_calendars (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    skip_weekends BOOLEAN DEFAULT TRUE,
    skip_holidays BOOLEAN DEFAULT TRUE,
    working_hours JSONB DEFAULT '{"monday": {"start": "09:00", "end": "18:00"}, "tuesday": {"start": "09:00", "end": "18:00"}, "wednesday": {"start": "09:00", "end": "18:00"}, "thursday": {"start": "09:00", "end": "18:00"}, "friday": {"start": "09:00", "end": "18:00"}}'::jsonb,
    holidays JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Criar sla_calculations
CREATE TABLE sla_calculations (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sla_template_id INTEGER REFERENCES sla_templates(id),
    calendar_id INTEGER REFERENCES business_calendars(id),
    priority VARCHAR(20) NOT NULL,
    response_due_at TIMESTAMP,
    solution_due_at TIMESTAMP,
    response_completed_at TIMESTAMP,
    solution_completed_at TIMESTAMP,
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ticket_id)
);

-- 8. Adicionar colunas em contracts
ALTER TABLE contracts 
ADD COLUMN sla_template_id INTEGER REFERENCES sla_templates(id),
ADD COLUMN sla_enabled BOOLEAN DEFAULT TRUE;

-- 9. Criar índices
CREATE INDEX idx_sla_template_rules_template ON sla_template_rules(template_id);
CREATE INDEX idx_business_calendars_name ON business_calendars(name);
CREATE INDEX idx_sla_calculations_ticket ON sla_calculations(ticket_id);
CREATE INDEX idx_sla_calculations_template ON sla_calculations(sla_template_id);

-- 10. Inserir templates padrão
INSERT INTO sla_templates (name, description, contract_type, is_default, is_active) VALUES
('Suporte Básico', 'Template básico para contratos de suporte', 'support', true, true),
('Suporte Premium', 'Template premium com SLAs mais rígidos', 'support', false, true),
('Manutenção', 'Template para contratos de manutenção', 'maintenance', false, true),
('Desenvolvimento', 'Template para projetos de desenvolvimento', 'development', false, true);

-- 9. Inserir regras do template básico
INSERT INTO sla_template_rules (template_id, priority, response_time_minutes, solution_time_minutes) VALUES
((SELECT id FROM sla_templates WHERE name = 'Suporte Básico'), 'low', 1440, 2880),      -- 24h resposta, 48h solução
((SELECT id FROM sla_templates WHERE name = 'Suporte Básico'), 'medium', 480, 1440),    -- 8h resposta, 24h solução
((SELECT id FROM sla_templates WHERE name = 'Suporte Básico'), 'high', 120, 480),       -- 2h resposta, 8h solução
((SELECT id FROM sla_templates WHERE name = 'Suporte Básico'), 'urgent', 30, 120);      -- 30min resposta, 2h solução

-- 10. Inserir regras do template premium
INSERT INTO sla_template_rules (template_id, priority, response_time_minutes, solution_time_minutes) VALUES
((SELECT id FROM sla_templates WHERE name = 'Suporte Premium'), 'low', 480, 1440),      -- 8h resposta, 24h solução
((SELECT id FROM sla_templates WHERE name = 'Suporte Premium'), 'medium', 240, 480),    -- 4h resposta, 8h solução
((SELECT id FROM sla_templates WHERE name = 'Suporte Premium'), 'high', 60, 240),       -- 1h resposta, 4h solução
((SELECT id FROM sla_templates WHERE name = 'Suporte Premium'), 'urgent', 15, 60);      -- 15min resposta, 1h solução

-- 11. Inserir calendário padrão
INSERT INTO business_calendars (name, description, timezone, skip_weekends, skip_holidays, working_hours, holidays) VALUES
('Comercial Brasil', 
 'Horário comercial brasileiro padrão',
 'America/Sao_Paulo',
 true,
 true,
 '{"monday": {"start": "09:00", "end": "18:00"}, "tuesday": {"start": "09:00", "end": "18:00"}, "wednesday": {"start": "09:00", "end": "18:00"}, "thursday": {"start": "09:00", "end": "18:00"}, "friday": {"start": "09:00", "end": "18:00"}}'::jsonb,
 '[
   {"date": "2025-01-01", "name": "Ano Novo"},
   {"date": "2025-02-12", "name": "Carnaval"},
   {"date": "2025-04-18", "name": "Sexta-feira Santa"},
   {"date": "2025-04-21", "name": "Tiradentes"},
   {"date": "2025-05-01", "name": "Dia do Trabalho"},
   {"date": "2025-06-19", "name": "Corpus Christi"},
   {"date": "2025-09-07", "name": "Independência"},
   {"date": "2025-10-12", "name": "Nossa Senhora Aparecida"},
   {"date": "2025-11-02", "name": "Finados"},
   {"date": "2025-11-15", "name": "Proclamação da República"},
   {"date": "2025-12-25", "name": "Natal"}
 ]'::jsonb
),
('24x7', 
 'Atendimento 24 horas, 7 dias por semana',
 'America/Sao_Paulo',
 false,
 false,
 '{"monday": {"start": "00:00", "end": "23:59"}, "tuesday": {"start": "00:00", "end": "23:59"}, "wednesday": {"start": "00:00", "end": "23:59"}, "thursday": {"start": "00:00", "end": "23:59"}, "friday": {"start": "00:00", "end": "23:59"}, "saturday": {"start": "00:00", "end": "23:59"}, "sunday": {"start": "00:00", "end": "23:59"}}'::jsonb,
 '[]'::jsonb
);

-- 12. Comentários
COMMENT ON TABLE sla_templates IS 'Templates de SLA pré-configurados';
COMMENT ON TABLE sla_template_rules IS 'Regras de SLA por prioridade para cada template';
COMMENT ON TABLE business_calendars IS 'Calendários de negócio com horários comerciais e feriados';
COMMENT ON TABLE sla_calculations IS 'Cálculos de SLA para cada ticket';

COMMIT;
