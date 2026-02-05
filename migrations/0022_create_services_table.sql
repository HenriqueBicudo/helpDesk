-- Criar tabela de serviços hierárquica (independente de equipes)
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  parent_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX idx_services_parent_id ON services(parent_id);
CREATE INDEX idx_services_is_active ON services(is_active);

-- Adicionar coluna service_id na tabela tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_service_id ON tickets(service_id);

-- Inserir alguns serviços de exemplo
INSERT INTO services (name, description, parent_id, "order") VALUES
  ('Infraestrutura', 'Serviços relacionados a infraestrutura de TI', NULL, 1),
  ('Aplicações', 'Serviços relacionados a aplicações e sistemas', NULL, 2),
  ('Suporte ao Usuário', 'Serviços de suporte e atendimento', NULL, 3);

-- Adicionar alguns subserviços
INSERT INTO services (name, description, parent_id, "order") VALUES
  ('Servidores', 'Gerenciamento de servidores', (SELECT id FROM services WHERE name = 'Infraestrutura' LIMIT 1), 1),
  ('Rede', 'Configuração e manutenção de rede', (SELECT id FROM services WHERE name = 'Infraestrutura' LIMIT 1), 2),
  ('Banco de Dados', 'Administração de banco de dados', (SELECT id FROM services WHERE name = 'Infraestrutura' LIMIT 1), 3);

-- Adicionar alguns subserviços de aplicações
INSERT INTO services (name, description, parent_id, "order") VALUES
  ('ERP', 'Suporte ao sistema ERP', (SELECT id FROM services WHERE name = 'Aplicações' LIMIT 1), 1),
  ('CRM', 'Suporte ao sistema CRM', (SELECT id FROM services WHERE name = 'Aplicações' LIMIT 1), 2),
  ('E-mail', 'Configuração e suporte de e-mail', (SELECT id FROM services WHERE name = 'Aplicações' LIMIT 1), 3);
