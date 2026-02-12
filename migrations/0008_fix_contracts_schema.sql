-- Migration: Corrigir schema da tabela contracts para usar UUID e adicionar campos faltantes
-- Data: 2025-11-07

-- 1. Remover constraint da sla_rules que referencia contracts
ALTER TABLE sla_rules DROP CONSTRAINT IF EXISTS sla_rules_contract_id_fkey;

-- 2. Criar tabela contracts com schema correto
CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR(255) PRIMARY KEY,  -- UUID como string
  contract_number VARCHAR(255) NOT NULL,
  company_id INTEGER NOT NULL,  -- Referencia companies.id
  service_package_id VARCHAR(255),
  type VARCHAR(50) NOT NULL,  -- support, maintenance, development, consulting
  status VARCHAR(50) NOT NULL,  -- active, inactive, expired, suspended
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  renewal_date TIMESTAMP,
  monthly_value NUMERIC(10,2) NOT NULL,
  setup_value NUMERIC(10,2),
  hourly_rate NUMERIC(10,2),
  included_hours INTEGER NOT NULL,
  used_hours NUMERIC(10,2) NOT NULL,
  reset_day INTEGER NOT NULL,
  last_reset TIMESTAMP NOT NULL,
  allow_overage BOOLEAN NOT NULL,
  auto_renewal BOOLEAN NOT NULL,
  notify_threshold INTEGER,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  calendar_id INTEGER  -- Referencia calendars.id (nullable)
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(type);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_contracts_calendar_id ON contracts(calendar_id);

-- 4. Adicionar foreign keys
ALTER TABLE contracts 
  ADD CONSTRAINT fk_contracts_calendar 
  FOREIGN KEY (calendar_id) 
  REFERENCES calendars(id) 
  ON DELETE SET NULL;

-- 5. Recriar tabela sla_rules com contract_id como VARCHAR
DROP TABLE IF EXISTS sla_rules;

CREATE TABLE sla_rules (
  id SERIAL PRIMARY KEY,
  contract_id VARCHAR(255) NOT NULL,  -- Referencia contracts.id (UUID)
  priority VARCHAR(20) NOT NULL,  -- low, medium, high, urgent, critical
  response_time_minutes INTEGER NOT NULL,
  solution_time_minutes INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Criar índices para sla_rules
CREATE INDEX IF NOT EXISTS idx_sla_rules_contract_id ON sla_rules(contract_id);
CREATE INDEX IF NOT EXISTS idx_sla_rules_priority ON sla_rules(priority);

-- 7. Adicionar foreign key para contracts
ALTER TABLE sla_rules 
  ADD CONSTRAINT fk_sla_rules_contract 
  FOREIGN KEY (contract_id) 
  REFERENCES contracts(id) 
  ON DELETE CASCADE;

-- 8. Adicionar constraint única para evitar duplicação de prioridade por contrato
ALTER TABLE sla_rules 
  ADD CONSTRAINT unique_contract_priority 
  UNIQUE(contract_id, priority);

-- 9. Adicionar constraints de validação
ALTER TABLE sla_rules 
  ADD CONSTRAINT check_response_time 
  CHECK (response_time_minutes > 0);

ALTER TABLE sla_rules 
  ADD CONSTRAINT check_solution_time 
  CHECK (solution_time_minutes > 0);

ALTER TABLE sla_rules 
  ADD CONSTRAINT check_time_hierarchy 
  CHECK (solution_time_minutes >= response_time_minutes);

-- 10. Comentários
COMMENT ON TABLE contracts IS 'Contratos de serviço entre empresas e o helpdesk';
COMMENT ON TABLE sla_rules IS 'Regras de SLA por prioridade para cada contrato';
COMMENT ON COLUMN contracts.id IS 'UUID único do contrato';
COMMENT ON COLUMN contracts.contract_number IS 'Número de identificação do contrato (legível por humanos)';
COMMENT ON COLUMN contracts.company_id IS 'ID da empresa proprietária do contrato';
COMMENT ON COLUMN contracts.included_hours IS 'Horas incluídas no contrato por mês';
COMMENT ON COLUMN contracts.used_hours IS 'Horas já utilizadas no período atual';
COMMENT ON COLUMN contracts.reset_day IS 'Dia do mês em que as horas são zeradas';
COMMENT ON COLUMN sla_rules.contract_id IS 'UUID do contrato ao qual esta regra pertence';
COMMENT ON COLUMN sla_rules.response_time_minutes IS 'Tempo máximo para primeira resposta em minutos';
COMMENT ON COLUMN sla_rules.solution_time_minutes IS 'Tempo máximo para solução completa em minutos';

