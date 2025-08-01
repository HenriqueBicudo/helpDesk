UPDATE tickets SET contract_id = '58820811-b99d-44a9-975e-f6f31f91e97e' WHERE id = 33;

SELECT 
  t.id,
  t.subject,
  t.contract_id,
  t.response_due_at,
  t.solution_due_at,
  c.contract_number
FROM tickets t
LEFT JOIN contracts c ON t.contract_id = c.id
WHERE t.id = 33;
