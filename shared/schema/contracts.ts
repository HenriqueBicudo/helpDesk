import { pgTable, varchar, integer, numeric, timestamp, boolean, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { calendars } from './calendars';
import { slaRules } from './sla_rules';

/**
 * Tabela de contratos
 * Define os termos contratuais entre a empresa e os solicitantes
 */
export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  requesterId: integer('requester_id').notNull(),
  calendarId: integer('calendar_id').notNull().references(() => calendars.id, {
    onDelete: 'restrict', // Não permite deletar calendário que está sendo usado
  }),
  name: varchar('name', { length: 255 }).notNull(),
  /**
   * Tipos de contrato possíveis:
   * - 'support': Suporte técnico
   * - 'maintenance': Manutenção
   * - 'development': Desenvolvimento
   * - 'consulting': Consultoria
   */
  type: varchar('type', { length: 50 }).notNull(),
  monthlyHours: integer('monthly_hours').notNull(),
  /**
   * Horas já utilizadas no período atual do contrato
   * Incrementado automaticamente quando tickets são resolvidos
   */
  usedHours: numeric('used_hours', { precision: 10, scale: 2 }).default('0').notNull(),
  /**
   * Valor base do contrato (mensal)
   * Usando numeric para precisão decimal
   */
  baseValue: numeric('base_value', { precision: 10, scale: 2 }).notNull(),
  /**
   * Valor da hora extra quando exceder as horas mensais
   */
  extraHourValue: numeric('extra_hour_value', { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'), // Pode ser null para contratos indefinidos
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  // Relacionamento one-to-many com sla_rules
  slaRules: many(slaRules),
}));

/**
 * Enum para tipos de contrato
 */
const contractTypeEnum = z.enum(['support', 'maintenance', 'development', 'consulting'], {
  errorMap: () => ({ message: 'Tipo de contrato inválido' }),
});

/**
 * Schema base do Drizzle para inserção
 */
const baseCreateContractSchema = createInsertSchema(contracts);

/**
 * Schema personalizado para criação de contrato com validações de negócio
 */
export const createContractSchema = baseCreateContractSchema.extend({
  requesterId: z.number().int().positive('ID do solicitante deve ser um número positivo'),
  calendarId: z.number().int().positive('ID do calendário deve ser um número positivo'),
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  type: contractTypeEnum,
  monthlyHours: z.number().int().min(1, 'Horas mensais deve ser pelo menos 1').max(720, 'Horas mensais não pode exceder 720 (24h x 30 dias)'),
  usedHours: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    'Horas utilizadas deve ser um número válido maior ou igual a zero'
  ).optional().default('0'),
  baseValue: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    'Valor base deve ser um número válido maior ou igual a zero'
  ),
  extraHourValue: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    'Valor da hora extra deve ser um número válido maior ou igual a zero'
  ),
  startDate: z.date().refine(
    (date) => date <= new Date(),
    'Data de início não pode ser no futuro'
  ),
  endDate: z.date().optional().nullable(),
  isActive: z.boolean().optional().default(true),
}).omit({
  id: true,
  createdAt: true,
}).refine(
  (data) => {
    // Validação cruzada: endDate deve ser maior que startDate se fornecida
    if (data.endDate && data.startDate) {
      return data.endDate > data.startDate;
    }
    return true;
  },
  {
    message: 'Data de término deve ser posterior à data de início',
    path: ['endDate'],
  }
);

/**
 * Schema para atualização de contrato (campos opcionais exceto validações)
 */
export const updateContractSchema = z.object({
  calendarId: z.number().int().positive('ID do calendário deve ser um número positivo').optional(),
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo').optional(),
  type: contractTypeEnum.optional(),
  monthlyHours: z.number().int().min(1, 'Horas mensais deve ser pelo menos 1').max(720, 'Horas mensais não pode exceder 720 (24h x 30 dias)').optional(),
  usedHours: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    'Horas utilizadas deve ser um número válido maior ou igual a zero'
  ).optional(),
  baseValue: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    'Valor base deve ser um número válido maior ou igual a zero'
  ).optional(),
  extraHourValue: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    'Valor da hora extra deve ser um número válido maior ou igual a zero'
  ).optional(),
  startDate: z.date().refine(
    (date) => date <= new Date(),
    'Data de início não pode ser no futuro'
  ).optional(),
  endDate: z.date().optional().nullable(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    // Validação cruzada para updates: endDate deve ser maior que startDate se ambos fornecidos
    if (data.endDate && data.startDate) {
      return data.endDate > data.startDate;
    }
    return true;
  },
  {
    message: 'Data de término deve ser posterior à data de início',
    path: ['endDate'],
  }
);

/**
 * Schema para seleção/resposta de contrato
 */
export const selectContractSchema = createSelectSchema(contracts);

/**
 * Schema para resposta de contrato com relacionamentos
 */
export const contractWithRelationsSchema = selectContractSchema.extend({
  requester: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    company: z.string().nullable(),
  }).optional(),
  calendar: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
  }).optional(),
  slaRules: z.array(z.object({
    id: z.number(),
    priority: z.string(),
    responseTimeMinutes: z.number(),
    solutionTimeMinutes: z.number(),
  })).optional(),
});

/**
 * Schema para filtros de busca de contratos
 */
export const contractFiltersSchema = z.object({
  requesterId: z.number().int().positive().optional(),
  calendarId: z.number().int().positive().optional(),
  type: contractTypeEnum.optional(),
  isActive: z.boolean().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

/**
 * Tipos TypeScript derivados dos schemas
 */
export type Contract = z.infer<typeof selectContractSchema>;
export type CreateContract = z.infer<typeof createContractSchema>;
export type UpdateContract = z.infer<typeof updateContractSchema>;
export type ContractWithRelations = z.infer<typeof contractWithRelationsSchema>;
export type ContractFilters = z.infer<typeof contractFiltersSchema>;
export type ContractType = z.infer<typeof contractTypeEnum>;
