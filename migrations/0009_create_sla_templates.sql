-- Criar tabela de templates SLA
CREATE TABLE IF NOT EXISTS "sla_templates" (
  "id" VARCHAR(255) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(100) NOT NULL,
  "rules" TEXT NOT NULL,
  "is_active" INTEGER DEFAULT 1 NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Inserir templates padrão
INSERT INTO "sla_templates" ("id", "name", "description", "type", "rules", "is_active") VALUES
(
  'support_basic',
  'Suporte Básico',
  'Template para contratos de suporte básico',
  'support',
  '[{"priority":"critical","responseTimeMinutes":240,"solutionTimeMinutes":1440},{"priority":"high","responseTimeMinutes":480,"solutionTimeMinutes":2880},{"priority":"medium","responseTimeMinutes":960,"solutionTimeMinutes":4320},{"priority":"low","responseTimeMinutes":1440,"solutionTimeMinutes":7200}]',
  1
),
(
  'support_premium',
  'Suporte Premium',
  'Template para contratos premium com atendimento prioritário',
  'support',
  '[{"priority":"critical","responseTimeMinutes":30,"solutionTimeMinutes":240},{"priority":"high","responseTimeMinutes":120,"solutionTimeMinutes":480},{"priority":"medium","responseTimeMinutes":240,"solutionTimeMinutes":1440},{"priority":"low","responseTimeMinutes":480,"solutionTimeMinutes":2880}]',
  1
),
(
  'support_critical',
  'Suporte Crítico',
  'Template para serviços críticos 24/7',
  'support',
  '[{"priority":"critical","responseTimeMinutes":15,"solutionTimeMinutes":120},{"priority":"high","responseTimeMinutes":30,"solutionTimeMinutes":240},{"priority":"medium","responseTimeMinutes":60,"solutionTimeMinutes":480},{"priority":"low","responseTimeMinutes":120,"solutionTimeMinutes":720}]',
  1
),
(
  'maintenance',
  'Manutenção',
  'Template para contratos de manutenção',
  'maintenance',
  '[{"priority":"critical","responseTimeMinutes":480,"solutionTimeMinutes":2880},{"priority":"high","responseTimeMinutes":1440,"solutionTimeMinutes":4320},{"priority":"medium","responseTimeMinutes":2880,"solutionTimeMinutes":7200},{"priority":"low","responseTimeMinutes":4320,"solutionTimeMinutes":10080}]',
  1
),
(
  'development',
  'Desenvolvimento',
  'Template para projetos de desenvolvimento',
  'development',
  '[{"priority":"critical","responseTimeMinutes":120,"solutionTimeMinutes":720},{"priority":"high","responseTimeMinutes":240,"solutionTimeMinutes":1440},{"priority":"medium","responseTimeMinutes":480,"solutionTimeMinutes":2880},{"priority":"low","responseTimeMinutes":1440,"solutionTimeMinutes":4320}]',
  1
),
(
  'consulting',
  'Consultoria',
  'Template para serviços de consultoria',
  'consulting',
  '[{"priority":"critical","responseTimeMinutes":240,"solutionTimeMinutes":1440},{"priority":"high","responseTimeMinutes":720,"solutionTimeMinutes":2880},{"priority":"medium","responseTimeMinutes":1440,"solutionTimeMinutes":5760},{"priority":"low","responseTimeMinutes":2880,"solutionTimeMinutes":10080}]',
  1
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS "idx_sla_templates_type" ON "sla_templates" ("type");
CREATE INDEX IF NOT EXISTS "idx_sla_templates_is_active" ON "sla_templates" ("is_active");
