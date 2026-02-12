import { pgTable, varchar, text, integer, boolean, timestamp, serial, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

/**
 * NOVA ARQUITETURA SLA V2.0
 * 
 * Sistema de SLA completamente reformulado para ser mais flexível:
 * - Templates SLA reutilizáveis por tipo de contrato
 * - Calendários de negócio mais robustos
 * - Histórico de cálculos para auditoria
 * - Suporte a escalation automático
 * - Controle fino de horários comerciais, feriados e fins de semana
 */

// =============================================================================
// VALIDADORES E ENUMS
// =============================================================================

// Enum para prioridades
const priorityEnum = z.enum(['low', 'medium', 'high', 'urgent', 'critical']);

// Enum para tipos de contrato  
const contractTypeEnum = z.enum(['support', 'maintenance', 'development', 'consulting']);

// Schema para horário de trabalho de um dia
const dayWorkingHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato HH:MM'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato HH:MM'),
});

// Schema para horários de trabalho da semana
const workingHoursSchema = z.object({
  monday: dayWorkingHoursSchema,
  tuesday: dayWorkingHoursSchema,
  wednesday: dayWorkingHoursSchema,
  thursday: dayWorkingHoursSchema,
  friday: dayWorkingHoursSchema,
  saturday: dayWorkingHoursSchema,
  sunday: dayWorkingHoursSchema,
});

// Schema para feriados
const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  name: z.string().min(1, 'Nome do feriado obrigatório'),
});

// =============================================================================
// 1. SLA TEMPLATES - Templates reutilizáveis de SLA
// =============================================================================

export const slaTemplates = pgTable('sla_templates', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  contractType: varchar('contract_type', { length: 100 }).notNull(), // support, maintenance, development, consulting
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  type: varchar('type', { length: 100 }).notNull().default('support'),
  rules: text('rules').notNull(),
  isActive: integer('is_active').default(1).notNull(),
});

// =============================================================================
// 2. SLA TEMPLATE RULES - Regras por prioridade de cada template
// =============================================================================

export const slaTemplateRules = pgTable('sla_template_rules', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').notNull().references(() => slaTemplates.id, { onDelete: 'cascade' }),
  priority: varchar('priority', { length: 20 }).notNull(), // low, medium, high, urgent, critical
  
  // Tempos em minutos (tempo útil apenas)
  responseTimeMinutes: integer('response_time_minutes').notNull(),
  solutionTimeMinutes: integer('solution_time_minutes').notNull(),
  
  // Configurações de escalation (futuras funcionalidades)
  escalationEnabled: boolean('escalation_enabled').default(false),
  escalationTimeMinutes: integer('escalation_time_minutes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =============================================================================
// 3. BUSINESS CALENDARS - Calendários de negócio aprimorados
// =============================================================================

export const businessCalendars = pgTable('business_calendars', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  timezone: varchar('timezone', { length: 50 }).default('America/Sao_Paulo'),
  
  // Configurações gerais
  skipWeekends: boolean('skip_weekends').default(true),
  skipHolidays: boolean('skip_holidays').default(true),
  
  // Horários de trabalho estruturados
  workingHours: jsonb('working_hours').notNull(),
  
  // Lista de feriados
  holidays: jsonb('holidays').default([]),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// =============================================================================
// 4. SLA CALCULATIONS - Histórico de cálculos de SLA
// =============================================================================

export const slaCalculations = pgTable('sla_calculations', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull(), // FK será adicionada na migration
  
  // Dados do cálculo
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  priority: varchar('priority', { length: 20 }).notNull(),
  
  // Prazos calculados
  responseDueAt: timestamp('response_due_at'),
  solutionDueAt: timestamp('solution_due_at'),
  
  // Metadados do cálculo
  businessMinutesUsed: integer('business_minutes_used'), // minutos úteis consumidos
  calendarId: integer('calendar_id').references(() => businessCalendars.id),
  slaTemplateId: integer('sla_template_id').references(() => slaTemplates.id),
  
  // Status
  isCurrent: boolean('is_current').default(true), // apenas um por ticket
  recalculatedReason: text('recalculated_reason'), // motivo do recálculo
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =============================================================================
// RELACIONAMENTOS
// =============================================================================

export const slaTemplatesRelations = relations(slaTemplates, ({ many }) => ({
  rules: many(slaTemplateRules),
  calculations: many(slaCalculations),
}));

export const slaTemplateRulesRelations = relations(slaTemplateRules, ({ one }) => ({
  template: one(slaTemplates, {
    fields: [slaTemplateRules.templateId],
    references: [slaTemplates.id],
  }),
}));

export const businessCalendarsRelations = relations(businessCalendars, ({ many }) => ({
  calculations: many(slaCalculations),
}));

export const slaCalculationsRelations = relations(slaCalculations, ({ one }) => ({
  template: one(slaTemplates, {
    fields: [slaCalculations.slaTemplateId],
    references: [slaTemplates.id],
  }),
  calendar: one(businessCalendars, {
    fields: [slaCalculations.calendarId],
    references: [businessCalendars.id],
  }),
}));

// =============================================================================
// SCHEMAS DE VALIDAÇÃO MANUAIS (SEM DRIZZLE-ZOD)
// =============================================================================

// =============================================================================
// SCHEMAS PARA SLA TEMPLATES
// =============================================================================

export const createSlaTemplateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(255),
  description: z.string().optional(),
  contractType: contractTypeEnum,
  isDefault: z.boolean().default(false),
});

export const updateSlaTemplateSchema = createSlaTemplateSchema.partial();

export const selectSlaTemplateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  contractType: z.string(),
  isDefault: z.boolean().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// =============================================================================
// SCHEMAS PARA SLA TEMPLATE RULES  
// =============================================================================

const baseSlaTemplateRuleSchema = z.object({
  templateId: z.number().int().positive(),
  priority: priorityEnum,
  responseTimeMinutes: z.number().int().min(1).max(525600), // max 1 ano
  solutionTimeMinutes: z.number().int().min(1).max(525600),
  escalationEnabled: z.boolean().default(false),
  escalationTimeMinutes: z.number().int().min(1).optional(),
});

export const createSlaTemplateRuleSchema = baseSlaTemplateRuleSchema.refine(
  (data) => data.solutionTimeMinutes >= data.responseTimeMinutes,
  {
    message: 'Tempo de solução deve ser >= tempo de resposta',
    path: ['solutionTimeMinutes'],
  }
).refine(
  (data) => {
    if (data.escalationEnabled && !data.escalationTimeMinutes) {
      return false;
    }
    return true;
  },
  {
    message: 'Tempo de escalation obrigatório quando escalation habilitado',
    path: ['escalationTimeMinutes'],
  }
);

export const updateSlaTemplateRuleSchema = baseSlaTemplateRuleSchema.omit({
  templateId: true,
}).partial();

export const selectSlaTemplateRuleSchema = z.object({
  id: z.number().int(),
  templateId: z.number().int(),
  priority: z.string(),
  responseTimeMinutes: z.number().int(),
  solutionTimeMinutes: z.number().int(),
  escalationEnabled: z.boolean().nullable(),
  escalationTimeMinutes: z.number().int().nullable(),
  createdAt: z.date(),
});

// =============================================================================
// SCHEMAS PARA BUSINESS CALENDARS
// =============================================================================

export const createBusinessCalendarSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(255),
  description: z.string().optional(),
  timezone: z.string().default('America/Sao_Paulo'),
  skipWeekends: z.boolean().default(true),
  skipHolidays: z.boolean().default(true),
  workingHours: workingHoursSchema,
  holidays: z.array(holidaySchema).default([]),
});

export const updateBusinessCalendarSchema = createBusinessCalendarSchema.partial();

export const selectBusinessCalendarSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  timezone: z.string().nullable(),
  skipWeekends: z.boolean().nullable(),
  skipHolidays: z.boolean().nullable(),
  workingHours: z.any(), // JSONB field
  holidays: z.any(), // JSONB field
  createdAt: z.date(),
  updatedAt: z.date(),
});

// =============================================================================
// SCHEMAS PARA SLA CALCULATIONS
// =============================================================================

export const createSlaCalculationSchema = z.object({
  ticketId: z.number().int().positive(),
  priority: priorityEnum,
  responseDueAt: z.date().optional(),
  solutionDueAt: z.date().optional(),
  businessMinutesUsed: z.number().int().min(0).optional(),
  calendarId: z.number().int().positive().optional(),
  slaTemplateId: z.number().int().positive().optional(),
  isCurrent: z.boolean().default(true),
  recalculatedReason: z.string().optional(),
});

export const selectSlaCalculationSchema = z.object({
  id: z.number().int(),
  ticketId: z.number().int(),
  calculatedAt: z.date(),
  priority: z.string(),
  responseDueAt: z.date().nullable(),
  solutionDueAt: z.date().nullable(),
  businessMinutesUsed: z.number().int().nullable(),
  calendarId: z.number().int().nullable(),
  slaTemplateId: z.number().int().nullable(),
  isCurrent: z.boolean().nullable(),
  recalculatedReason: z.string().nullable(),
  createdAt: z.date(),
});

// =============================================================================
// SCHEMAS PARA RESPONSES COM RELACIONAMENTOS
// =============================================================================

export const slaTemplateWithRulesSchema = selectSlaTemplateSchema.extend({
  rules: z.array(selectSlaTemplateRuleSchema),
});

export const slaCalculationWithRelationsSchema = selectSlaCalculationSchema.extend({
  template: selectSlaTemplateSchema.optional(),
  calendar: selectBusinessCalendarSchema.optional(),
});

// =============================================================================
// SCHEMAS PARA FILTROS E BUSCA
// =============================================================================

export const slaTemplateFiltersSchema = z.object({
  contractType: contractTypeEnum.optional(),
  isDefault: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export const slaCalculationFiltersSchema = z.object({
  ticketId: z.number().int().positive().optional(),
  priority: priorityEnum.optional(),
  isOverdue: z.boolean().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// =============================================================================
// UTILITÁRIOS E HELPERS
// =============================================================================

export const timeConverters = {
  minutesToHours: (minutes: number): number => Math.round((minutes / 60) * 100) / 100,
  minutesToDays: (minutes: number): number => Math.round((minutes / (60 * 24)) * 100) / 100,
  hoursToMinutes: (hours: number): number => Math.round(hours * 60),
  daysToMinutes: (days: number): number => Math.round(days * 24 * 60),
  businessDaysToMinutes: (days: number, hoursPerDay = 9): number => Math.round(days * hoursPerDay * 60),
};

// Templates de SLA predefinidos
export const defaultSlaTemplatesData = {
  support: {
    name: 'Suporte Técnico Padrão',
    description: 'Template padrão para contratos de suporte técnico',
    contractType: 'support' as const,
    rules: [
      { priority: 'critical' as const, responseTimeMinutes: 15, solutionTimeMinutes: 240, escalationEnabled: true, escalationTimeMinutes: 30 },
      { priority: 'urgent' as const, responseTimeMinutes: 60, solutionTimeMinutes: 480, escalationEnabled: true, escalationTimeMinutes: 120 },
      { priority: 'high' as const, responseTimeMinutes: 240, solutionTimeMinutes: 1440, escalationEnabled: true, escalationTimeMinutes: 480 },
      { priority: 'medium' as const, responseTimeMinutes: 480, solutionTimeMinutes: 2880, escalationEnabled: false },
      { priority: 'low' as const, responseTimeMinutes: 1440, solutionTimeMinutes: 7200, escalationEnabled: false },
    ],
  },
  maintenance: {
    name: 'Manutenção Padrão', 
    description: 'Template padrão para contratos de manutenção',
    contractType: 'maintenance' as const,
    rules: [
      { priority: 'critical' as const, responseTimeMinutes: 30, solutionTimeMinutes: 480, escalationEnabled: true, escalationTimeMinutes: 60 },
      { priority: 'urgent' as const, responseTimeMinutes: 120, solutionTimeMinutes: 960, escalationEnabled: true, escalationTimeMinutes: 240 },
      { priority: 'high' as const, responseTimeMinutes: 480, solutionTimeMinutes: 2880, escalationEnabled: true, escalationTimeMinutes: 720 },
      { priority: 'medium' as const, responseTimeMinutes: 960, solutionTimeMinutes: 5760, escalationEnabled: false },
      { priority: 'low' as const, responseTimeMinutes: 2880, solutionTimeMinutes: 14400, escalationEnabled: false },
    ],
  },
  development: {
    name: 'Desenvolvimento Padrão',
    description: 'Template padrão para contratos de desenvolvimento',
    contractType: 'development' as const,
    rules: [
      { priority: 'critical' as const, responseTimeMinutes: 60, solutionTimeMinutes: 960, escalationEnabled: true, escalationTimeMinutes: 120 },
      { priority: 'urgent' as const, responseTimeMinutes: 240, solutionTimeMinutes: 1920, escalationEnabled: true, escalationTimeMinutes: 480 },
      { priority: 'high' as const, responseTimeMinutes: 960, solutionTimeMinutes: 5760, escalationEnabled: false },
      { priority: 'medium' as const, responseTimeMinutes: 1920, solutionTimeMinutes: 11520, escalationEnabled: false },
      { priority: 'low' as const, responseTimeMinutes: 5760, solutionTimeMinutes: 28800, escalationEnabled: false },
    ],
  },
};

// Calendários predefinidos
export const defaultBusinessCalendarsData = {
  comercialBrasil: {
    name: 'Comercial Brasil',
    description: 'Horário comercial brasileiro - Segunda a Sexta, 9h às 18h',
    timezone: 'America/Sao_Paulo',
    skipWeekends: true,
    skipHolidays: true,
    workingHours: {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '12:00' },
      sunday: { enabled: false, start: '09:00', end: '12:00' },
    },
    holidays: [
      { date: '2025-01-01', name: 'Confraternização Universal' },
      { date: '2025-04-18', name: 'Sexta-feira Santa' },
      { date: '2025-04-21', name: 'Tiradentes' },
      { date: '2025-05-01', name: 'Dia do Trabalhador' },
      { date: '2025-09-07', name: 'Independência do Brasil' },
      { date: '2025-10-12', name: 'Nossa Senhora Aparecida' },
      { date: '2025-11-02', name: 'Finados' },
      { date: '2025-11-15', name: 'Proclamação da República' },
      { date: '2025-12-25', name: 'Natal' },
    ],
  },
  suporte24x7: {
    name: 'Suporte 24/7',
    description: 'Suporte crítico 24 horas por dia, 7 dias por semana',
    timezone: 'America/Sao_Paulo',
    skipWeekends: false,
    skipHolidays: false,
    workingHours: {
      monday: { enabled: true, start: '00:00', end: '23:59' },
      tuesday: { enabled: true, start: '00:00', end: '23:59' },
      wednesday: { enabled: true, start: '00:00', end: '23:59' },
      thursday: { enabled: true, start: '00:00', end: '23:59' },
      friday: { enabled: true, start: '00:00', end: '23:59' },
      saturday: { enabled: true, start: '00:00', end: '23:59' },
      sunday: { enabled: true, start: '00:00', end: '23:59' },
    },
    holidays: [],
  },
};

// =============================================================================
// TIPOS TYPESCRIPT
// =============================================================================

export type SlaTemplate = z.infer<typeof selectSlaTemplateSchema>;
export type CreateSlaTemplate = z.infer<typeof createSlaTemplateSchema>;
export type UpdateSlaTemplate = z.infer<typeof updateSlaTemplateSchema>;
export type SlaTemplateWithRules = z.infer<typeof slaTemplateWithRulesSchema>;

export type SlaTemplateRule = z.infer<typeof selectSlaTemplateRuleSchema>;
export type CreateSlaTemplateRule = z.infer<typeof createSlaTemplateRuleSchema>;
export type UpdateSlaTemplateRule = z.infer<typeof updateSlaTemplateRuleSchema>;

export type BusinessCalendar = z.infer<typeof selectBusinessCalendarSchema>;
export type CreateBusinessCalendar = z.infer<typeof createBusinessCalendarSchema>;
export type UpdateBusinessCalendar = z.infer<typeof updateBusinessCalendarSchema>;

export type SlaCalculation = z.infer<typeof selectSlaCalculationSchema>;
export type CreateSlaCalculation = z.infer<typeof createSlaCalculationSchema>;
export type SlaCalculationWithRelations = z.infer<typeof slaCalculationWithRelationsSchema>;

export type Priority = z.infer<typeof priorityEnum>;
export type ContractType = z.infer<typeof contractTypeEnum>;
export type WorkingHours = z.infer<typeof workingHoursSchema>;
export type Holiday = z.infer<typeof holidaySchema>;
export type DayWorkingHours = z.infer<typeof dayWorkingHoursSchema>;

export type SlaTemplateFilters = z.infer<typeof slaTemplateFiltersSchema>;
export type SlaCalculationFilters = z.infer<typeof slaCalculationFiltersSchema>;