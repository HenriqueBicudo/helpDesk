import { pgTable, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * SLA Templates - Templates pré-configurados de SLA para diferentes tipos de contratos
 */
export const slaTemplates = pgTable('sla_templates', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  contractType: varchar('contract_type', { length: 100 }).notNull(),
  isDefault: integer('is_default').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  type: varchar('type', { length: 100 }).notNull().default('support'), // Manter por compatibilidade
  
  // Regras SLA por prioridade (armazenadas como JSON)
  // Estrutura: [{ priority: string, responseTimeMinutes: number, solutionTimeMinutes: number }]
  rules: text('rules').notNull(),
  
  isActive: integer('is_active').default(1).notNull()
});

// Zod Schemas simplificados
export const slaTemplateRulesSchema = z.array(z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  responseTimeMinutes: z.number().int().positive(),
  solutionTimeMinutes: z.number().int().positive()
}));

export const insertSlaTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().optional(),
  contractType: z.enum(['support', 'maintenance', 'development', 'consulting', 'other']),
  rules: z.string().refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return slaTemplateRulesSchema.safeParse(parsed).success;
    } catch {
      return false;
    }
  }, 'Regras devem ser um JSON válido'),
  isActive: z.number().int().min(0).max(1).optional()
});

export const updateSlaTemplateSchema = insertSlaTemplateSchema.partial();

// Type exports
export type SlaTemplate = typeof slaTemplates.$inferSelect;
export type InsertSlaTemplate = z.infer<typeof insertSlaTemplateSchema>;
export type UpdateSlaTemplate = z.infer<typeof updateSlaTemplateSchema>;

// Helper type para regras parsed
export interface SlaTemplateRule {
  priority: 'low' | 'medium' | 'high' | 'critical';
  responseTimeMinutes: number;
  solutionTimeMinutes: number;
}

export interface SlaTemplateWithParsedRules extends Omit<SlaTemplate, 'rules'> {
  rules: SlaTemplateRule[];
}
