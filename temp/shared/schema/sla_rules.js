"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSlaTemplates = exports.timeConverters = exports.slaCalculationResultSchema = exports.slaCalculationSchema = exports.slaRuleFiltersSchema = exports.slaRuleWithContractSchema = exports.selectSlaRuleSchema = exports.updateSlaRuleSchema = exports.createSlaRuleSchema = exports.slaRulesRelations = exports.slaRules = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const contracts_1 = require("./contracts");
/**
 * Tabela de regras de SLA
 * Define os tempos de resposta e solução por prioridade para cada contrato
 */
exports.slaRules = (0, pg_core_1.pgTable)('sla_rules', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    contractId: (0, pg_core_1.integer)('contract_id').notNull().references(() => contracts_1.contracts.id, {
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
    priority: (0, pg_core_1.varchar)('priority', { length: 20 }).notNull(),
    /**
     * Tempo de resposta em minutos
     * Tempo máximo para primeira resposta ao ticket
     */
    responseTimeMinutes: (0, pg_core_1.integer)('response_time_minutes').notNull(),
    /**
     * Tempo de solução em minutos
     * Tempo máximo para resolução completa do ticket
     */
    solutionTimeMinutes: (0, pg_core_1.integer)('solution_time_minutes').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
/**
 * Relacionamentos da tabela sla_rules
 */
exports.slaRulesRelations = (0, drizzle_orm_1.relations)(exports.slaRules, ({ one }) => ({
    // Relacionamento many-to-one com contracts
    contract: one(contracts_1.contracts, {
        fields: [exports.slaRules.contractId],
        references: [contracts_1.contracts.id],
    }),
}));
/**
 * Enum para prioridades de ticket
 */
const priorityEnum = zod_1.z.enum(['low', 'medium', 'high', 'urgent', 'critical'], {
    errorMap: () => ({ message: 'Prioridade inválida' }),
});
/**
 * Schema base do Drizzle para inserção
 */
const baseCreateSlaRuleSchema = (0, drizzle_zod_1.createInsertSchema)(exports.slaRules);
/**
 * Schema personalizado para criação de regra SLA com validações de negócio
 */
exports.createSlaRuleSchema = baseCreateSlaRuleSchema.extend({
    contractId: zod_1.z.number().int().positive('ID do contrato deve ser um número positivo'),
    priority: priorityEnum,
    responseTimeMinutes: zod_1.z.number().int().min(1, 'Tempo de resposta deve ser pelo menos 1 minuto').max(43200, 'Tempo de resposta não pode exceder 30 dias'),
    solutionTimeMinutes: zod_1.z.number().int().min(1, 'Tempo de solução deve ser pelo menos 1 minuto').max(525600, 'Tempo de solução não pode exceder 1 ano'),
}).omit({
    id: true,
    createdAt: true,
}).refine((data) => {
    // Validação: tempo de solução deve ser maior ou igual ao tempo de resposta
    return data.solutionTimeMinutes >= data.responseTimeMinutes;
}, {
    message: 'Tempo de solução deve ser maior ou igual ao tempo de resposta',
    path: ['solutionTimeMinutes'],
});
/**
 * Schema para atualização de regra SLA (campos opcionais exceto validações)
 */
exports.updateSlaRuleSchema = zod_1.z.object({
    priority: priorityEnum.optional(),
    responseTimeMinutes: zod_1.z.number().int().min(1, 'Tempo de resposta deve ser pelo menos 1 minuto').max(43200, 'Tempo de resposta não pode exceder 30 dias').optional(),
    solutionTimeMinutes: zod_1.z.number().int().min(1, 'Tempo de solução deve ser pelo menos 1 minuto').max(525600, 'Tempo de solução não pode exceder 1 ano').optional(),
}).refine((data) => {
    // Validação cruzada para updates: tempo de solução deve ser maior ou igual ao tempo de resposta se ambos fornecidos
    if (data.solutionTimeMinutes !== undefined && data.responseTimeMinutes !== undefined) {
        return data.solutionTimeMinutes >= data.responseTimeMinutes;
    }
    return true;
}, {
    message: 'Tempo de solução deve ser maior ou igual ao tempo de resposta',
    path: ['solutionTimeMinutes'],
});
/**
 * Schema para seleção/resposta de regra SLA
 */
exports.selectSlaRuleSchema = (0, drizzle_zod_1.createSelectSchema)(exports.slaRules);
/**
 * Schema para resposta de regra SLA com relacionamentos
 */
exports.slaRuleWithContractSchema = exports.selectSlaRuleSchema.extend({
    contract: zod_1.z.object({
        id: zod_1.z.number(),
        name: zod_1.z.string(),
        type: zod_1.z.string(),
        isActive: zod_1.z.boolean(),
    }).optional(),
});
/**
 * Schema para filtros de busca de regras SLA
 */
exports.slaRuleFiltersSchema = zod_1.z.object({
    contractId: zod_1.z.number().int().positive().optional(),
    priority: priorityEnum.optional(),
    page: zod_1.z.number().int().min(1).optional().default(1),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(10),
});
/**
 * Schema para cálculo de SLA
 * Usado para determinar se um ticket está dentro do prazo
 */
exports.slaCalculationSchema = zod_1.z.object({
    ticketCreatedAt: zod_1.z.date(),
    ticketPriority: priorityEnum,
    contractId: zod_1.z.number().int().positive(),
    currentDate: zod_1.z.date().optional().default(() => new Date()),
});
/**
 * Schema de resposta para cálculo de SLA
 */
exports.slaCalculationResultSchema = zod_1.z.object({
    responseTimeDeadline: zod_1.z.date(),
    solutionTimeDeadline: zod_1.z.date(),
    isResponseOverdue: zod_1.z.boolean(),
    isSolutionOverdue: zod_1.z.boolean(),
    responseTimeRemainingMinutes: zod_1.z.number().nullable(),
    solutionTimeRemainingMinutes: zod_1.z.number().nullable(),
    slaRule: exports.selectSlaRuleSchema,
});
/**
 * Funções utilitárias para conversão de tempo
 */
exports.timeConverters = {
    minutesToHours: (minutes) => Math.round((minutes / 60) * 100) / 100,
    minutesToDays: (minutes) => Math.round((minutes / (60 * 24)) * 100) / 100,
    hoursToMinutes: (hours) => Math.round(hours * 60),
    daysToMinutes: (days) => Math.round(days * 24 * 60),
};
/**
 * Templates de SLA comuns para diferentes tipos de contrato
 */
exports.defaultSlaTemplates = {
    support: [
        { priority: 'critical', responseTimeMinutes: 15, solutionTimeMinutes: 240 }, // 15min resp, 4h sol
        { priority: 'urgent', responseTimeMinutes: 60, solutionTimeMinutes: 480 }, // 1h resp, 8h sol
        { priority: 'high', responseTimeMinutes: 240, solutionTimeMinutes: 1440 }, // 4h resp, 24h sol
        { priority: 'medium', responseTimeMinutes: 480, solutionTimeMinutes: 2880 }, // 8h resp, 48h sol
        { priority: 'low', responseTimeMinutes: 1440, solutionTimeMinutes: 7200 }, // 24h resp, 120h sol
    ],
    maintenance: [
        { priority: 'critical', responseTimeMinutes: 30, solutionTimeMinutes: 480 },
        { priority: 'urgent', responseTimeMinutes: 120, solutionTimeMinutes: 960 },
        { priority: 'high', responseTimeMinutes: 480, solutionTimeMinutes: 2880 },
        { priority: 'medium', responseTimeMinutes: 960, solutionTimeMinutes: 5760 },
        { priority: 'low', responseTimeMinutes: 2880, solutionTimeMinutes: 14400 },
    ],
    development: [
        { priority: 'critical', responseTimeMinutes: 60, solutionTimeMinutes: 960 },
        { priority: 'urgent', responseTimeMinutes: 240, solutionTimeMinutes: 1920 },
        { priority: 'high', responseTimeMinutes: 960, solutionTimeMinutes: 5760 },
        { priority: 'medium', responseTimeMinutes: 1920, solutionTimeMinutes: 11520 },
        { priority: 'low', responseTimeMinutes: 5760, solutionTimeMinutes: 28800 },
    ],
    consulting: [
        { priority: 'critical', responseTimeMinutes: 120, solutionTimeMinutes: 1440 },
        { priority: 'urgent', responseTimeMinutes: 480, solutionTimeMinutes: 2880 },
        { priority: 'high', responseTimeMinutes: 1440, solutionTimeMinutes: 7200 },
        { priority: 'medium', responseTimeMinutes: 2880, solutionTimeMinutes: 14400 },
        { priority: 'low', responseTimeMinutes: 7200, solutionTimeMinutes: 43200 },
    ],
};
