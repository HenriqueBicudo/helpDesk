-- Script de Teste para Gatilhos de Automação Temporal
-- Execute este script para criar um gatilho de teste

-- 1. Gatilho: Escalar tickets sem resposta há mais de 1 hora
INSERT INTO automation_triggers (
  name,
  description,
  trigger_type,
  is_active,
  conditions,
  actions,
  created_by,
  created_at,
  updated_at
) VALUES (
  'Escalar tickets sem resposta (TESTE)',
  'Gatilho de teste: aumenta prioridade de tickets criados há mais de 1 hora',
  'time_based',
  true,
  '{
    "timeCondition": {
      "field": "created_at",
      "operator": "greater_than",
      "value": 1,
      "unit": "hours"
    }
  }'::jsonb,
  '[
    {
      "type": "change_priority",
      "priority": "high"
    },
    {
      "type": "add_comment",
      "content": "⏰ Automação Temporal: Ticket criado há mais de 1 hora sem resposta. Escalando prioridade.",
      "isInternal": true
    }
  ]'::jsonb,
  1,
  NOW(),
  NOW()
);

-- 2. Gatilho: Adicionar tag em tickets sem atualização há 2 dias
INSERT INTO automation_triggers (
  name,
  description,
  trigger_type,
  is_active,
  conditions,
  actions,
  created_by,
  created_at,
  updated_at
) VALUES (
  'Tickets inativos há 2 dias (TESTE)',
  'Adiciona tag "INATIVO" em tickets sem atualização há 2 dias',
  'time_based',
  false, -- Desativado por padrão
  '{
    "timeCondition": {
      "field": "updated_at",
      "operator": "greater_than",
      "value": 2,
      "unit": "days"
    }
  }'::jsonb,
  '[
    {
      "type": "add_tag",
      "tag": "INATIVO"
    },
    {
      "type": "add_comment",
      "content": "⚠️ Este ticket está sem atualizações há mais de 2 dias.",
      "isInternal": true
    }
  ]'::jsonb,
  1,
  NOW(),
  NOW()
);

-- 3. Gatilho: Alertar SLA de resposta próximo ao vencimento
INSERT INTO automation_triggers (
  name,
  description,
  trigger_type,
  is_active,
  conditions,
  actions,
  created_by,
  created_at,
  updated_at
) VALUES (
  'SLA Resposta - Alerta 30min (TESTE)',
  'Alerta quando faltam menos de 30 minutos para o vencimento do SLA de resposta',
  'time_based',
  false, -- Desativado por padrão
  '{
    "timeCondition": {
      "field": "response_due_at",
      "operator": "less_than",
      "value": 30,
      "unit": "minutes"
    }
  }'::jsonb,
  '[
    {
      "type": "change_priority",
      "priority": "critical"
    },
    {
      "type": "add_comment",
      "content": "🚨 URGENTE: SLA de resposta vence em menos de 30 minutos!",
      "isInternal": true
    },
    {
      "type": "add_tag",
      "tag": "SLA_CRITICO"
    }
  ]'::jsonb,
  1,
  NOW(),
  NOW()
);

-- Consulta para verificar os gatilhos criados
SELECT 
  id,
  name,
  trigger_type,
  is_active,
  conditions,
  actions
FROM automation_triggers
WHERE trigger_type = 'time_based'
ORDER BY created_at DESC;

-- Para ativar um gatilho de teste:
-- UPDATE automation_triggers SET is_active = true WHERE name = 'Escalar tickets sem resposta (TESTE)';

-- Para desativar todos os gatilhos de teste:
-- UPDATE automation_triggers SET is_active = false WHERE name LIKE '%(TESTE)';

-- Para deletar todos os gatilhos de teste:
-- DELETE FROM automation_triggers WHERE name LIKE '%(TESTE)';
