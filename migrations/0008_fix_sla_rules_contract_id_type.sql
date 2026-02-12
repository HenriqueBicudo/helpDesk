-- Migration: Corrigir tipo de contract_id em sla_rules de INTEGER para VARCHAR
-- Data: 2025-11-13
-- Descrição: A coluna contract_id em sla_rules estava como INTEGER mas contracts.id é VARCHAR(255)

-- Passo 1: Dropar constraint de foreign key (se existir)
ALTER TABLE sla_rules 
DROP CONSTRAINT IF EXISTS sla_rules_contract_id_contracts_id_fk;

-- Passo 2: Alterar tipo da coluna de INTEGER para VARCHAR(255)
ALTER TABLE sla_rules 
ALTER COLUMN contract_id TYPE VARCHAR(255) USING contract_id::TEXT;

-- Passo 3: Recriar foreign key constraint
ALTER TABLE sla_rules 
ADD CONSTRAINT sla_rules_contract_id_contracts_id_fk 
  FOREIGN KEY (contract_id) 
  REFERENCES contracts(id) 
  ON DELETE CASCADE;

-- Verificar resultado
SELECT 
  column_name, 
  data_type, 
  character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'sla_rules' 
  AND column_name = 'contract_id';
