-- Migration: Create ticket status configuration table
-- This allows dynamic configuration of ticket statuses and their behaviors

CREATE TABLE IF NOT EXISTS ticket_status_config (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL, -- Hex color like #3b82f6
  "order" INTEGER NOT NULL,
  is_closed_status BOOLEAN NOT NULL DEFAULT FALSE,
  pause_sla BOOLEAN NOT NULL DEFAULT FALSE,
  auto_close_after_days INTEGER,
  requires_response BOOLEAN NOT NULL DEFAULT TRUE,
  notify_customer BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default statuses (compatible with existing enum)
INSERT INTO ticket_status_config (id, name, color, "order", is_closed_status, pause_sla, auto_close_after_days, requires_response, notify_customer)
VALUES
  ('open', 'Aberto', '#3b82f6', 1, FALSE, FALSE, NULL, TRUE, TRUE),
  ('in_progress', 'Em Atendimento', '#f59e0b', 2, FALSE, FALSE, NULL, TRUE, TRUE),
  ('pending', 'Pendente', '#8b5cf6', 3, FALSE, TRUE, NULL, FALSE, TRUE),
  ('resolved', 'Resolvido', '#10b981', 4, FALSE, TRUE, 3, FALSE, TRUE),
  ('closed', 'Fechado', '#6b7280', 5, TRUE, TRUE, NULL, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_ticket_status_config_order ON ticket_status_config("order");

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ticket_status_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_status_config_updated_at
  BEFORE UPDATE ON ticket_status_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_status_config_updated_at();
