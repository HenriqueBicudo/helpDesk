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

-- ==================================================================
-- Seed demo data (reset + seed). This section inserts a small set of
-- example records useful for development: company, team, users,
-- requester, a ticket and an initial comment. Run only on dev DB.
-- ==================================================================

BEGIN;

-- 1) Companies
INSERT INTO companies (name, email, is_active, has_active_contract, created_at, updated_at)
SELECT 'Acme Corp', 'contact@acme.example', true, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE email = 'contact@acme.example');

-- 2) Teams
INSERT INTO teams (name, description, is_active, created_at, updated_at)
SELECT 'Suporte Técnico', 'Equipe de suporte técnico', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Suporte Técnico');

-- 3) Users (admin, agent, client)
-- Note: in development the auth accepts plaintext passwords for seeded users.
INSERT INTO users (username, password, full_name, email, role, company, team_id, is_active, created_at, updated_at)
SELECT 'admin', 'admin', 'Administrador', 'admin@example.com', 'admin', NULL, NULL, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

INSERT INTO users (username, password, full_name, email, role, company, team_id, is_active, created_at, updated_at)
SELECT 'agent1', 'agent', 'Fulano Agente', 'agent1@example.com', 'helpdesk_agent', NULL,
	(SELECT id FROM teams WHERE name = 'Suporte Técnico' LIMIT 1), true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'agent1@example.com');

INSERT INTO users (username, password, full_name, email, role, company, team_id, is_active, created_at, updated_at)
SELECT 'client1', 'client', 'Cliente Um', 'client1@example.com', 'client_user', 'Acme Corp', NULL, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'client1@example.com');

-- 4) Requesters (clients)
INSERT INTO requesters (full_name, email, company, plan_type, monthly_hours, used_hours, reset_date, created_at)
SELECT 'Cliente Um', 'client1@example.com', 'Acme Corp', 'basic', 10, '0', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM requesters WHERE email = 'client1@example.com');

-- 5) Tickets
INSERT INTO tickets (subject, description, status, priority, category, requester_id, assignee_id, company_id, created_at, updated_at)
SELECT
	'Problema no sistema',
	'Não consigo acessar o relatório X. Aparece erro de permissão.',
	'open', 'medium', 'technical_support',
	(SELECT id FROM requesters WHERE email = 'client1@example.com' LIMIT 1),
	(SELECT id FROM users WHERE email = 'agent1@example.com' LIMIT 1),
	(SELECT id FROM companies WHERE email = 'contact@acme.example' LIMIT 1),
	now(), now()
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE subject = 'Problema no sistema' AND requester_id = (SELECT id FROM requesters WHERE email = 'client1@example.com'));

-- 6) Initial interaction/comment on the ticket
INSERT INTO ticket_interactions (ticket_id, user_id, type, content, is_internal, created_at)
SELECT
	(SELECT id FROM tickets WHERE subject = 'Problema no sistema' LIMIT 1),
	(SELECT id FROM users WHERE email = 'agent1@example.com' LIMIT 1),
	'comment', 'Iniciando análise do chamado', false, now()
WHERE EXISTS (SELECT 1 FROM tickets WHERE subject = 'Problema no sistema');

COMMIT;

-- Optional: reset sequences to keep ids compact (uncomment if desired)
-- SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
-- SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1));

