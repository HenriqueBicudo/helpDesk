-- Adicionar coluna has_active_contract à tabela companies
ALTER TABLE companies 
ADD COLUMN has_active_contract BOOLEAN NOT NULL DEFAULT false;
