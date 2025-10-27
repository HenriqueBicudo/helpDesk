-- Migration para atualizar dados existentes após adicionar novos roles
-- Execute este script APÓS a primeira migration

-- 1. Migrar dados existentes (ajuste conforme necessário)
-- Usuários com role 'admin' permanecem como 'admin'
-- Usuários com role 'manager' viram 'helpdesk_manager' 
UPDATE users SET role = 'helpdesk_manager' WHERE role = 'manager';

-- Usuários com role 'agent' viram 'helpdesk_agent'
UPDATE users SET role = 'helpdesk_agent' WHERE role = 'agent';

-- 2. Atualizar o role padrão para novos usuários
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client_user';

-- 3. Mostrar os roles disponíveis agora
SELECT unnest(enum_range(NULL::role)) as available_roles;
