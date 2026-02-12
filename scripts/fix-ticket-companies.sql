-- Script para corrigir company_id dos tickets baseado no requester

UPDATE tickets t
SET company_id = (
  SELECT c.id
  FROM requesters r
  JOIN companies c ON c.name = r.company
  WHERE r.id = t.requester_id
)
WHERE t.company_id IS NULL
  AND t.requester_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM requesters r
    JOIN companies c ON c.name = r.company
    WHERE r.id = t.requester_id
  );

-- Verificar resultado
SELECT 
  id,
  subject,
  requester_id,
  company_id,
  (SELECT name FROM companies WHERE id = company_id) as company_name
FROM tickets
ORDER BY id;
