-- Adicionar coluna firstLogin na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS "first_login" BOOLEAN DEFAULT false;

-- Marcar usuários com senha temporária como primeiro login
UPDATE users SET "first_login" = true WHERE password = '123@MUDAR';

-- Comentário: Esta flag indica se é o primeiro login do usuário
COMMENT ON COLUMN users.first_login IS 'Indica se o usuário precisa trocar a senha no primeiro login';
