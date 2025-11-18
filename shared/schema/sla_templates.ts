import { pgTable, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * SLA Templates - Templates pré-configurados de SLA para diferentes tipos de contratos
 */
export const slaTemplates = pgTable('sla_templates', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 100 }).notNull(), // support, maintenance, development, consulting
  
  // Regras SLA por prioridade (armazenadas como JSON)
  // Estrutura: [{ priority: string, responseTimeMinutes: number, solutionTimeMinutes: number }]
  rules: text('rules').notNull(),
  
  isActive: integer('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Zod Schemas
export const insertSlaTemplateSchema = createInsertSchema(slaTemplates, {
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().optional(),
  type: z.enum(['support', 'maintenance', 'development', 'consulting', 'other']),
  rules: z.string().refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) && parsed.every(rule => 
        rule.priority && 
        typeof rule.responseTimeMinutes === 'number' && 
        typeof rule.solutionTimeMinutes === 'number'
      );
    } catch {
      return false;
    }
  }, 'Regras devem ser um JSON válido com array de { priority, responseTimeMinutes, solutionTimeMinutes }'),
  isActive: z.number().int().min(0).max(1).optional()
});

export const selectSlaTemplateSchema = createSelectSchema(slaTemplates);

export const updateSlaTemplateSchema = insertSlaTemplateSchema.partial().omit({ id: true });

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
