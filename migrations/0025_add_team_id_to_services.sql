-- Migration: Add team_id to services table
-- This allows services to have an optional default team association
-- When a ticket is created with a service, it can auto-select the associated team

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_services_team_id ON services(team_id);

COMMENT ON COLUMN services.team_id IS 'Optional default team for tickets using this service';
