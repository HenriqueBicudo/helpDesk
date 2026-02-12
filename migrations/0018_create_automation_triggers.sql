-- Migration: Create automation_triggers table
-- Description: Tabela para armazenar gatilhos personalizados de automação

CREATE TABLE IF NOT EXISTS automation_triggers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Tipo de gatilho: 'ticket_created', 'ticket_updated', 'status_changed', 'priority_changed', 'assigned', 'comment_added', 'time_based'
  trigger_type VARCHAR(50) NOT NULL,
  
  -- Condições em JSON: ex: { "status": "open", "priority": "high", "category": "technical" }
  conditions JSONB DEFAULT '{}',
  
  -- Ações em JSON: ex: [{ "type": "add_comment", "content": "..." }, { "type": "assign_to", "userId": 5 }]
  actions JSONB DEFAULT '[]',
  
  -- Status do gatilho
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_automation_triggers_active ON automation_triggers(is_active);
CREATE INDEX idx_automation_triggers_type ON automation_triggers(trigger_type);
CREATE INDEX idx_automation_triggers_created_by ON automation_triggers(created_by);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_automation_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automation_triggers_updated_at
BEFORE UPDATE ON automation_triggers
FOR EACH ROW
EXECUTE FUNCTION update_automation_triggers_updated_at();

-- Inserir gatilhos de exemplo
INSERT INTO automation_triggers (name, description, trigger_type, conditions, actions, is_active, created_by) VALUES
(
  'Auto-atribuir tickets urgentes',
  'Atribui automaticamente tickets com prioridade urgente para o gerente',
  'ticket_created',
  '{"priority": "urgent"}',
  '[{"type": "assign_to", "userId": 1}, {"type": "add_comment", "content": "Ticket urgente detectado. Atribuído automaticamente ao gerente.", "isInternal": true}]',
  true,
  1
),
(
  'Notificar em tickets pendentes por 24h',
  'Adiciona comentário em tickets que estão pendentes há mais de 24 horas',
  'time_based',
  '{"status": "pending", "hoursInStatus": 24}',
  '[{"type": "add_comment", "content": "Este ticket está pendente há mais de 24 horas. Por favor, verifique o status.", "isInternal": false}]',
  true,
  1
),
(
  'Escalar tickets não atribuídos',
  'Escala prioridade de tickets que ficam sem atribuição por mais de 2 horas',
  'time_based',
  '{"assigneeId": null, "hoursOpen": 2, "status": "open"}',
  '[{"type": "change_priority", "priority": "high"}, {"type": "add_comment", "content": "Ticket escalado automaticamente por falta de atribuição.", "isInternal": true}]',
  true,
  1
);

COMMENT ON TABLE automation_triggers IS 'Gatilhos personalizados para automação de interações';
COMMENT ON COLUMN automation_triggers.trigger_type IS 'Tipo do gatilho: ticket_created, ticket_updated, status_changed, priority_changed, assigned, comment_added, time_based';
COMMENT ON COLUMN automation_triggers.conditions IS 'Condições em formato JSON para ativar o gatilho';
COMMENT ON COLUMN automation_triggers.actions IS 'Array de ações em formato JSON a serem executadas';
