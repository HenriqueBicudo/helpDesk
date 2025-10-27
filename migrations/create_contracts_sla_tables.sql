-- Migração para criação das tabelas do módulo de Contratos e SLAs
-- Execute em ordem: calendars -> contracts -> sla_rules

-- 1. Tabela de calendários de trabalho
CREATE TABLE IF NOT EXISTS calendars (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  working_hours JSONB NOT NULL,
  holidays JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calendars_name ON calendars(name);
CREATE INDEX IF NOT EXISTS idx_calendars_created_at ON calendars(created_at);

-- 2. Tabela de contratos
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL,
  calendar_id INTEGER NOT NULL REFERENCES calendars(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  monthly_hours INTEGER NOT NULL,
  base_value NUMERIC(10,2) NOT NULL,
  extra_hour_value NUMERIC(10,2) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contracts_requester_id ON contracts(requester_id);
CREATE INDEX IF NOT EXISTS idx_contracts_calendar_id ON contracts(calendar_id);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(type);
CREATE INDEX IF NOT EXISTS idx_contracts_is_active ON contracts(is_active);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);

-- 3. Tabela de regras de SLA
CREATE TABLE IF NOT EXISTS sla_rules (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  priority VARCHAR(20) NOT NULL,
  response_time_minutes INTEGER NOT NULL,
  solution_time_minutes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sla_rules_contract_id ON sla_rules(contract_id);
CREATE INDEX IF NOT EXISTS idx_sla_rules_priority ON sla_rules(priority);
CREATE INDEX IF NOT EXISTS idx_sla_rules_response_time ON sla_rules(response_time_minutes);
CREATE INDEX IF NOT EXISTS idx_sla_rules_solution_time ON sla_rules(solution_time_minutes);

-- Constraint única para evitar duplicação de prioridade por contrato
ALTER TABLE sla_rules ADD CONSTRAINT IF NOT EXISTS 
  unique_contract_priority UNIQUE(contract_id, priority);

-- Constraints de validação
ALTER TABLE contracts ADD CONSTRAINT IF NOT EXISTS 
  check_monthly_hours CHECK (monthly_hours > 0 AND monthly_hours <= 720);

ALTER TABLE contracts ADD CONSTRAINT IF NOT EXISTS 
  check_base_value CHECK (base_value >= 0);

ALTER TABLE contracts ADD CONSTRAINT IF NOT EXISTS 
  check_extra_hour_value CHECK (extra_hour_value >= 0);

ALTER TABLE contracts ADD CONSTRAINT IF NOT EXISTS 
  check_date_range CHECK (end_date IS NULL OR end_date > start_date);

ALTER TABLE sla_rules ADD CONSTRAINT IF NOT EXISTS 
  check_response_time CHECK (response_time_minutes > 0);

ALTER TABLE sla_rules ADD CONSTRAINT IF NOT EXISTS 
  check_solution_time CHECK (solution_time_minutes > 0);

ALTER TABLE sla_rules ADD CONSTRAINT IF NOT EXISTS 
  check_time_hierarchy CHECK (solution_time_minutes >= response_time_minutes);

-- Enums para validação (PostgreSQL)
DO $$ BEGIN
  CREATE TYPE contract_type_enum AS ENUM ('support', 'maintenance', 'development', 'consulting');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high', 'urgent', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Alterar colunas para usar enums (opcional, para maior segurança)
-- ALTER TABLE contracts ALTER COLUMN type TYPE contract_type_enum USING type::contract_type_enum;
-- ALTER TABLE sla_rules ALTER COLUMN priority TYPE priority_enum USING priority::priority_enum;

-- Inserir dados de exemplo para calendário padrão
INSERT INTO calendars (name, description, working_hours, holidays) 
VALUES (
  'Horário Comercial Padrão',
  'Horário de funcionamento comercial de segunda a sexta-feira',
  '{
    "monday": {"start": "09:00", "end": "18:00", "isWorking": true},
    "tuesday": {"start": "09:00", "end": "18:00", "isWorking": true},
    "wednesday": {"start": "09:00", "end": "18:00", "isWorking": true},
    "thursday": {"start": "09:00", "end": "18:00", "isWorking": true},
    "friday": {"start": "09:00", "end": "18:00", "isWorking": true},
    "saturday": {"start": "09:00", "end": "12:00", "isWorking": false},
    "sunday": {"start": "09:00", "end": "18:00", "isWorking": false}
  }'::JSONB,
  '[
    {"date": "2025-01-01", "name": "Ano Novo"},
    {"date": "2025-04-21", "name": "Tiradentes"},
    {"date": "2025-05-01", "name": "Dia do Trabalhador"},
    {"date": "2025-09-07", "name": "Independência do Brasil"},
    {"date": "2025-10-12", "name": "Nossa Senhora Aparecida"},
    {"date": "2025-11-02", "name": "Finados"},
    {"date": "2025-11-15", "name": "Proclamação da República"},
    {"date": "2025-12-25", "name": "Natal"}
  ]'::JSONB
) ON CONFLICT DO NOTHING;

-- Inserir calendário 24/7 para suporte crítico
INSERT INTO calendars (name, description, working_hours, holidays) 
VALUES (
  'Suporte 24/7',
  'Calendário para suporte crítico disponível 24 horas por dia',
  '{
    "monday": {"start": "00:00", "end": "23:59", "isWorking": true},
    "tuesday": {"start": "00:00", "end": "23:59", "isWorking": true},
    "wednesday": {"start": "00:00", "end": "23:59", "isWorking": true},
    "thursday": {"start": "00:00", "end": "23:59", "isWorking": true},
    "friday": {"start": "00:00", "end": "23:59", "isWorking": true},
    "saturday": {"start": "00:00", "end": "23:59", "isWorking": true},
    "sunday": {"start": "00:00", "end": "23:59", "isWorking": true}
  }'::JSONB,
  '[]'::JSONB
) ON CONFLICT DO NOTHING;

-- Comentários nas tabelas para documentação
COMMENT ON TABLE calendars IS 'Calendários de trabalho para cálculo de SLA';
COMMENT ON TABLE contracts IS 'Contratos entre a empresa e solicitantes';
COMMENT ON TABLE sla_rules IS 'Regras de SLA por prioridade para cada contrato';

COMMENT ON COLUMN calendars.working_hours IS 'Horários de trabalho por dia da semana em formato JSON';
COMMENT ON COLUMN calendars.holidays IS 'Lista de feriados em formato JSON';
COMMENT ON COLUMN contracts.monthly_hours IS 'Horas mensais incluídas no contrato';
COMMENT ON COLUMN contracts.base_value IS 'Valor base mensal do contrato';
COMMENT ON COLUMN contracts.extra_hour_value IS 'Valor da hora extra quando exceder o limite mensal';
COMMENT ON COLUMN sla_rules.response_time_minutes IS 'Tempo máximo para primeira resposta em minutos';
COMMENT ON COLUMN sla_rules.solution_time_minutes IS 'Tempo máximo para solução completa em minutos';
