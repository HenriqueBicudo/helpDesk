-- Reset database for demo/testing
-- WARNING: This will DELETE data. Run only on development or test DB.
-- Purpose: remove all companies, requesters, tickets and non-admin users, leaving a single admin account.

BEGIN;

-- 1) Remove dependent records that reference users/companies
DELETE FROM ticket_interactions WHERE TRUE;
DELETE FROM attachments WHERE TRUE;
DELETE FROM ticket_tags WHERE TRUE;
DELETE FROM linked_tickets WHERE TRUE;

-- 2) Remove tickets and related entities
DELETE FROM tickets WHERE TRUE;

-- 3) Remove contracts and SLA rules
DELETE FROM sla_rules WHERE TRUE;
DELETE FROM contracts WHERE TRUE;

-- 4) Remove requesters (clients)
DELETE FROM requesters WHERE TRUE;

-- 5) Remove tags, teams, response and email templates
DELETE FROM ticket_tags WHERE TRUE;
DELETE FROM tags WHERE TRUE;
DELETE FROM teams WHERE TRUE;
DELETE FROM response_templates WHERE TRUE;
DELETE FROM email_templates WHERE TRUE;

-- 6) Remove companies
DELETE FROM companies WHERE TRUE;

-- 7) Remove non-admin users (preserve any user with role = 'admin')
DELETE FROM users WHERE role IS NULL OR role <> 'admin';

-- 8) Ensure at least one admin user exists. If none, create a default admin with username 'admin' and password 'admin'.
-- Note: password stored in plaintext for simplicity; auth code accepts plaintext for non-hashed entries (development only).
INSERT INTO users (username, password, full_name, email, role, created_at, updated_at)
SELECT 'admin', 'admin', 'Administrador', 'admin@example.com', 'admin', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin');

-- 9) Optionally reset sequences to avoid large ids (uncomment if desired)
-- SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
-- SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1));

COMMIT;

-- Usage:
-- psql "postgresql://user:pass@host:port/dbname" -f scripts/reset_db.sql

-- NOTES:
-- - This script is destructive. Make a backup before running in any non-dev environment.
-- - Password for default admin is 'admin' (plaintext). After running, change the admin password via the API or update the password
--   using the application's hashPassword function to store a hashed password.
-- - If you prefer the admin to have a hashed password, I can add a small Node script that inserts the admin using the same scrypt hashing as the app.
