-- Migration: Add companyId to tickets table
-- Date: 2025-08-04

-- Add companyId column to tickets table
ALTER TABLE tickets 
ADD COLUMN company_id INTEGER REFERENCES companies(id);

-- Add index for better performance
CREATE INDEX idx_tickets_company_id ON tickets(company_id);

-- Update existing tickets to link to companies based on requester's company
UPDATE tickets 
SET company_id = companies.id
FROM requesters, companies
WHERE tickets.requester_id = requesters.id 
  AND requesters.company = companies.name
  AND requesters.company IS NOT NULL 
  AND requesters.company != '';

-- Optional: Add comment to document the column
COMMENT ON COLUMN tickets.company_id IS 'Reference to the company that requested this ticket';
