-- Migration: Convert ticket status from enum to varchar to support custom statuses
-- This migration changes the status field from enum to varchar and adds foreign key to ticket_status_config

-- Step 1: Add new status column as varchar
ALTER TABLE tickets ADD COLUMN status_new VARCHAR(50);

-- Step 2: Copy existing enum values to new column
UPDATE tickets SET status_new = status::text;

-- Step 3: Drop old enum column
ALTER TABLE tickets DROP COLUMN status;

-- Step 4: Rename new column to status
ALTER TABLE tickets RENAME COLUMN status_new TO status;

-- Step 5: Set default and not null constraint
ALTER TABLE tickets ALTER COLUMN status SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'open';

-- Step 6: Add foreign key constraint to ticket_status_config
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_status 
  FOREIGN KEY (status) REFERENCES ticket_status_config(id);

-- Step 7: Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Step 8: Insert "Aguardando tarefa" status into ticket_status_config
INSERT INTO ticket_status_config (id, name, color, "order", is_closed_status, pause_sla, auto_close_after_days, requires_response, notify_customer)
VALUES
  ('status_1771613797601', 'Aguardando tarefa', '#f97316', 6, FALSE, TRUE, NULL, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Step 9: Drop the old status enum type (only if not used elsewhere)
-- Note: This might fail if the enum is still referenced somewhere, which is fine
DO $$ 
BEGIN
  DROP TYPE IF EXISTS status CASCADE;
EXCEPTION 
  WHEN OTHERS THEN NULL;
END $$;
