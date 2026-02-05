-- Migration: Add service_id to tickets table
-- Description: Adds serviceId column to track which service a ticket is related to

-- Add service_id column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_service_id ON tickets(service_id);
