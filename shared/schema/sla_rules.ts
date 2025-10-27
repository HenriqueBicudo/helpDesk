import { pgTable, varchar, integer, timestamp, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { contracts } from './contracts';

/**
 * Tabela de regras de SLA
 * Define os tempos de resposta e solução por prioridade para cada contrato
 */
export const slaRules = pgTable('sla_rules', {
  id: serial('id').primaryKey(),
  contractId: integer('contract_id').notNull().references(() => contracts.id, {
    onDelete: 'cascade', // Remove regras SLA quando contrato é deletado
  }),
  /**
   * Prioridades padrão do sistema:
   * - 'low': Baixa
   * - 'medium': Média  
   * - 'high': Alta
   * - 'urgent': Urgente
   * - 'critical': Crítica
   */
  priority: varchar('priority', { length: 20 }).notNull(),
  /**
   * Tempo de resposta em minutos
   * Tempo máximo para primeira resposta ao ticket
   */
  responseTimeMinutes: integer('response_time_minutes').notNull(),
  /**
   * Tempo de solução em minutos
   * Tempo máximo para resolução completa do ticket
   */
  solutionTimeMinutes: integer('solution_time_minutes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Relacionamentos da tabela sla_rules
 */
export const slaRulesRelations = relations(slaRules, ({ one }) => ({
  // Relacionamento many-to-one com contracts
  contract: one(contracts, {
    fields: [slaRules.contractId],
    references: [contracts.id],
  }),
}));

/**
 * Enum para prioridades de ticket
 */
const priorityEnum = z.enum(['low', 'medium', 'high', 'urgent', 'critical'], {
  errorMap: () => ({ message: 'Prioridade inválida' }),
});

/**
 * Schema base do Drizzle para inserção
 */
const baseCreateSlaRuleSchema = createInsertSchema(slaRules);

/**
 * Schema personalizado para criação de regra SLA com validações de negócio
 */
export const createSlaRuleSchema = baseCreateSlaRuleSchema.extend({
  contractId: z.number().int().positive('ID do contrato deve ser um número positivo'),
  priority: priorityEnum,
  responseTimeMinutes: z.number().int().min(1, 'Tempo de resposta deve ser pelo menos 1 minuto').max(43200, 'Tempo de resposta não pode exceder 30 dias'),
  solutionTimeMinutes: z.number().int().min(1, 'Tempo de solução deve ser pelo menos 1 minuto').max(525600, 'Tempo de solução não pode exceder 1 ano'),
}).omit({
  id: true,
  createdAt: true,
}).refine(
  (data) => {
    // Validação: tempo de solução deve ser maior ou igual ao tempo de resposta
    return data.solutionTimeMinutes >= data.responseTimeMinutes;
  },
  {
    message: 'Tempo de solução deve ser maior ou igual ao tempo de resposta',
    path: ['solutionTimeMinutes'],
  }
);

/**
 * Schema para atualização de regra SLA (campos opcionais exceto validações)
 */
export const updateSlaRuleSchema = z.object({
  priority: priorityEnum.optional(),
  responseTimeMinutes: z.number().int().min(1, 'Tempo de resposta deve ser pelo menos 1 minuto').max(43200, 'Tempo de resposta não pode exceder 30 dias').optional(),
  solutionTimeMinutes: z.number().int().min(1, 'Tempo de solução deve ser pelo menos 1 minuto').max(525600, 'Tempo de solução não pode exceder 1 ano').optional(),
}).refine(
  (data) => {
    // Validação cruzada para updates: tempo de solução deve ser maior ou igual ao tempo de resposta se ambos fornecidos
    if (data.solutionTimeMinutes !== undefined && data.responseTimeMinutes !== undefined) {
      return data.solutionTimeMinutes >= data.responseTimeMinutes;
    }
    return true;
  },
  {
    message: 'Tempo de solução deve ser maior ou igual ao tempo de resposta',
    path: ['solutionTimeMinutes'],
  }
);

/**
 * Schema para seleção/resposta de regra SLA
 */
export const selectSlaRuleSchema = createSelectSchema(slaRules);

/**
 * Schema para resposta de regra SLA com relacionamentos
 */
export const slaRuleWithContractSchema = selectSlaRuleSchema.extend({
  contract: z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    isActive: z.boolean(),
  }).optional(),
});

/**
 * Schema para filtros de busca de regras SLA
 */
export const slaRuleFiltersSchema = z.object({
  contractId: z.number().int().positive().optional(),
  priority: priorityEnum.optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

/**
 * Schema para cálculo de SLA
 * Usado para determinar se um ticket está dentro do prazo
 */
export const slaCalculationSchema = z.object({
  ticketCreatedAt: z.date(),
  ticketPriority: priorityEnum,
  contractId: z.number().int().positive(),
  currentDate: z.date().optional().default(() => new Date()),
});

/**
 * Schema de resposta para cálculo de SLA
 */
export const slaCalculationResultSchema = z.object({
  responseTimeDeadline: z.date(),
  solutionTimeDeadline: z.date(),
  isResponseOverdue: z.boolean(),
  isSolutionOverdue: z.boolean(),
  responseTimeRemainingMinutes: z.number().nullable(),
  solutionTimeRemainingMinutes: z.number().nullable(),
  slaRule: selectSlaRuleSchema,
});

/**
 * Funções utilitárias para conversão de tempo
 */
export const timeConverters = {
  minutesToHours: (minutes: number): number => Math.round((minutes / 60) * 100) / 100,
  minutesToDays: (minutes: number): number => Math.round((minutes / (60 * 24)) * 100) / 100,
  hoursToMinutes: (hours: number): number => Math.round(hours * 60),
  daysToMinutes: (days: number): number => Math.round(days * 24 * 60),
};

/**
 * Templates de SLA comuns para diferentes tipos de contrato
 */
export const defaultSlaTemplates = {
  support: [
    { priority: 'critical' as const, responseTimeMinutes: 15, solutionTimeMinutes: 240 }, // 15min resp, 4h sol
    { priority: 'urgent' as const, responseTimeMinutes: 60, solutionTimeMinutes: 480 }, // 1h resp, 8h sol
    { priority: 'high' as const, responseTimeMinutes: 240, solutionTimeMinutes: 1440 }, // 4h resp, 24h sol
    { priority: 'medium' as const, responseTimeMinutes: 480, solutionTimeMinutes: 2880 }, // 8h resp, 48h sol
    { priority: 'low' as const, responseTimeMinutes: 1440, solutionTimeMinutes: 7200 }, // 24h resp, 120h sol
  ],
  maintenance: [
    { priority: 'critical' as const, responseTimeMinutes: 30, solutionTimeMinutes: 480 },
    { priority: 'urgent' as const, responseTimeMinutes: 120, solutionTimeMinutes: 960 },
    { priority: 'high' as const, responseTimeMinutes: 480, solutionTimeMinutes: 2880 },
    { priority: 'medium' as const, responseTimeMinutes: 960, solutionTimeMinutes: 5760 },
    { priority: 'low' as const, responseTimeMinutes: 2880, solutionTimeMinutes: 14400 },
  ],
  development: [
    { priority: 'critical' as const, responseTimeMinutes: 60, solutionTimeMinutes: 960 },
    { priority: 'urgent' as const, responseTimeMinutes: 240, solutionTimeMinutes: 1920 },
    { priority: 'high' as const, responseTimeMinutes: 960, solutionTimeMinutes: 5760 },
    { priority: 'medium' as const, responseTimeMinutes: 1920, solutionTimeMinutes: 11520 },
    { priority: 'low' as const, responseTimeMinutes: 5760, solutionTimeMinutes: 28800 },
  ],
  consulting: [
    { priority: 'critical' as const, responseTimeMinutes: 120, solutionTimeMinutes: 1440 },
    { priority: 'urgent' as const, responseTimeMinutes: 480, solutionTimeMinutes: 2880 },
    { priority: 'high' as const, responseTimeMinutes: 1440, solutionTimeMinutes: 7200 },
    { priority: 'medium' as const, responseTimeMinutes: 2880, solutionTimeMinutes: 14400 },
    { priority: 'low' as const, responseTimeMinutes: 7200, solutionTimeMinutes: 43200 },
  ],
};

/**
 * Tipos TypeScript derivados dos schemas
 */
export type SlaRule = z.infer<typeof selectSlaRuleSchema>;
export type CreateSlaRule = z.infer<typeof createSlaRuleSchema>;
export type UpdateSlaRule = z.infer<typeof updateSlaRuleSchema>;
export type SlaRuleWithContract = z.infer<typeof slaRuleWithContractSchema>;
export type SlaRuleFilters = z.infer<typeof slaRuleFiltersSchema>;
export type SlaCalculation = z.infer<typeof slaCalculationSchema>;
export type SlaCalculationResult = z.infer<typeof slaCalculationResultSchema>;
export type Priority = z.infer<typeof priorityEnum>;
