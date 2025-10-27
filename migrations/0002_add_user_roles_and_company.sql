-- Migration para adicionar novos roles e campo company aos usuários
-- Execute este script no seu banco PostgreSQL

-- 1. Primeiro, vamos adicionar os novos roles ao enum existente (um por vez)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'helpdesk_agent' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role')) THEN
        ALTER TYPE role ADD VALUE 'helpdesk_agent';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'helpdesk_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role')) THEN
        ALTER TYPE role ADD VALUE 'helpdesk_manager';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role')) THEN
        ALTER TYPE role ADD VALUE 'client_manager';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_user' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role')) THEN
        ALTER TYPE role ADD VALUE 'client_user';
    END IF;
END $$;

-- 2. Adicionar coluna company à tabela users se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company') THEN
        ALTER TABLE users ADD COLUMN company VARCHAR(100);
    END IF;
END $$;

-- 3. Adicionar coluna is_active à tabela users se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 5. Comentários para documentação
COMMENT ON COLUMN users.company IS 'Empresa do usuário (para usuários clientes)';
COMMENT ON COLUMN users.is_active IS 'Indica se o usuário está ativo no sistema';
