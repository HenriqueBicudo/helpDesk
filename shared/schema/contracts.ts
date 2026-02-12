import { pgTable, varchar, integer, numeric, timestamp, boolean, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { calendars } from './calendars';
import { slaRules } from './sla_rules';
import { slaTemplates } from './sla_templates';

/**
 * Tabela de contratos - Schema alinhado com a realidade do banco
 */
export const contracts = pgTable('contracts', {
  id: varchar('id', { length: 255 }).primaryKey(), // UUID
  contractNumber: varchar('contract_number', { length: 255 }).notNull(),
  companyId: integer('company_id').notNull(), // Referencia companies.id
  servicePackageId: varchar('service_package_id', { length: 255 }),
  type: varchar('type', { length: 50 }).notNull(), // support, maintenance, development, consulting
  status: varchar('status', { length: 50 }).notNull(), // active, inactive, expired, suspended
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  renewalDate: timestamp('renewal_date'),
  monthlyValue: numeric('monthly_value', { precision: 10, scale: 2 }).notNull(),
  setupValue: numeric('setup_value', { precision: 10, scale: 2 }),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
  includedHours: integer('included_hours').notNull(),
  usedHours: numeric('used_hours', { precision: 10, scale: 2 }).notNull(),
  resetDay: integer('reset_day').notNull(),
  lastReset: timestamp('last_reset').notNull(),
  allowOverage: boolean('allow_overage').notNull(),
  autoRenewal: boolean('auto_renewal').notNull(),
  notifyThreshold: integer('notify_threshold'),
  description: text('description'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  calendarId: integer('calendar_id'), // Referencia calendars.id (nullable)
  slaTemplateId: integer('sla_template_id'), // Referencia sla_templates.id (nullable)
});

/**
 * Relacionamentos da tabela contracts
 */
export const contractsRelations = relations(contracts, ({ one, many }) => ({
  // Relacionamento many-to-one com calendars
  calendar: one(calendars, {
    fields: [contracts.calendarId],
    references: [calendars.id],
  }),
  // Relacionamento many-to-one com sla_templates
  slaTemplate: one(slaTemplates, {
    fields: [contracts.slaTemplateId],
    references: [slaTemplates.id],
  }),
  // Relacionamento one-to-many com sla_rules
  slaRules: many(slaRules),
}));

/**
 * Schema para criação de contrato
 */
export const createContractSchema = createInsertSchema(contracts, {
  // Validações personalizadas podem ser adicionadas aqui
});

/**
 * Schema para atualização de contrato
 */
export const updateContractSchema = createContractSchema.partial();

/**
 * Schema para seleção de contrato
 */
export const selectContractSchema = createSelectSchema(contracts);

/**
 * Tipos TypeScript derivados dos schemas
 */
export type Contract = z.infer<typeof selectContractSchema>;
export type InsertContract = z.infer<typeof createContractSchema>;
export type UpdateContract = z.infer<typeof updateContractSchema>;
