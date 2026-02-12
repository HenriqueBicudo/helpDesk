-- Migração: Remover vínculo de equipe dos serviços
-- Os serviços agora são independentes e não pertencem a equipes específicas

-- Remover a constraint de foreign key se existir
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_team_id_teams_id_fk;

-- Remover a coluna team_id
ALTER TABLE services DROP COLUMN IF EXISTS team_id;

-- Adicionar comentário na tabela
COMMENT ON TABLE services IS 'Serviços oferecidos pelo sistema, independentes de equipes';
