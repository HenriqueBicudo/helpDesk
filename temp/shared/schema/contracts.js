"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractFiltersSchema = exports.contractWithRelationsSchema = exports.selectContractSchema = exports.updateContractSchema = exports.createContractSchema = exports.contractsRelations = exports.contracts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const calendars_1 = require("./calendars");
const sla_rules_1 = require("./sla_rules");
/**
 * Tabela de contratos
 * Define os termos contratuais entre a empresa e os solicitantes
 */
exports.contracts = (0, pg_core_1.pgTable)('contracts', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    requesterId: (0, pg_core_1.integer)('requester_id').notNull(),
    calendarId: (0, pg_core_1.integer)('calendar_id').notNull().references(() => calendars_1.calendars.id, {
        onDelete: 'restrict', // Não permite deletar calendário que está sendo usado
    }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    /**
     * Tipos de contrato possíveis:
     * - 'support': Suporte técnico
     * - 'maintenance': Manutenção
     * - 'development': Desenvolvimento
     * - 'consulting': Consultoria
     */
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    monthlyHours: (0, pg_core_1.integer)('monthly_hours').notNull(),
    /**
     * Horas já utilizadas no período atual do contrato
     * Incrementado automaticamente quando tickets são resolvidos
     */
    usedHours: (0, pg_core_1.numeric)('used_hours', { precision: 10, scale: 2 }).default('0').notNull(),
    /**
     * Valor base do contrato (mensal)
     * Usando numeric para precisão decimal
     */
    baseValue: (0, pg_core_1.numeric)('base_value', { precision: 10, scale: 2 }).notNull(),
    /**
     * Valor da hora extra quando exceder as horas mensais
     */
    extraHourValue: (0, pg_core_1.numeric)('extra_hour_value', { precision: 10, scale: 2 }).notNull(),
    startDate: (0, pg_core_1.timestamp)('start_date').notNull(),
    endDate: (0, pg_core_1.timestamp)('end_date'), // Pode ser null para contratos indefinidos
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
/**
 * Relacionamentos da tabela contracts
 */
exports.contractsRelations = (0, drizzle_orm_1.relations)(exports.contracts, ({ one, many }) => ({
    // Relacionamento many-to-one com calendars
    calendar: one(calendars_1.calendars, {
        fields: [exports.contracts.calendarId],
        references: [calendars_1.calendars.id],
    }),
    // Relacionamento one-to-many com sla_rules
    slaRules: many(sla_rules_1.slaRules),
}));
/**
 * Enum para tipos de contrato
 */
const contractTypeEnum = zod_1.z.enum(['support', 'maintenance', 'development', 'consulting'], {
    errorMap: () => ({ message: 'Tipo de contrato inválido' }),
});
/**
 * Schema base do Drizzle para inserção
 */
const baseCreateContractSchema = (0, drizzle_zod_1.createInsertSchema)(exports.contracts);
/**
 * Schema personalizado para criação de contrato com validações de negócio
 */
exports.createContractSchema = baseCreateContractSchema.extend({
    requesterId: zod_1.z.number().int().positive('ID do solicitante deve ser um número positivo'),
    calendarId: zod_1.z.number().int().positive('ID do calendário deve ser um número positivo'),
    name: zod_1.z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
    type: contractTypeEnum,
    monthlyHours: zod_1.z.number().int().min(1, 'Horas mensais deve ser pelo menos 1').max(720, 'Horas mensais não pode exceder 720 (24h x 30 dias)'),
    usedHours: zod_1.z.string().refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
    }, 'Horas utilizadas deve ser um número válido maior ou igual a zero').optional().default('0'),
    baseValue: zod_1.z.string().refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
    }, 'Valor base deve ser um número válido maior ou igual a zero'),
    extraHourValue: zod_1.z.string().refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
    }, 'Valor da hora extra deve ser um número válido maior ou igual a zero'),
    startDate: zod_1.z.date().refine((date) => date <= new Date(), 'Data de início não pode ser no futuro'),
    endDate: zod_1.z.date().optional().nullable(),
    isActive: zod_1.z.boolean().optional().default(true),
}).omit({
    id: true,
    createdAt: true,
}).refine((data) => {
    // Validação cruzada: endDate deve ser maior que startDate se fornecida
    if (data.endDate && data.startDate) {
        return data.endDate > data.startDate;
    }
    return true;
}, {
    message: 'Data de término deve ser posterior à data de início',
    path: ['endDate'],
});
/**
 * Schema para atualização de contrato (campos opcionais exceto validações)
 */
exports.updateContractSchema = zod_1.z.object({
    calendarId: zod_1.z.number().int().positive('ID do calendário deve ser um número positivo').optional(),
    name: zod_1.z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo').optional(),
    type: contractTypeEnum.optional(),
    monthlyHours: zod_1.z.number().int().min(1, 'Horas mensais deve ser pelo menos 1').max(720, 'Horas mensais não pode exceder 720 (24h x 30 dias)').optional(),
    usedHours: zod_1.z.string().refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
    }, 'Horas utilizadas deve ser um número válido maior ou igual a zero').optional(),
    baseValue: zod_1.z.string().refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
    }, 'Valor base deve ser um número válido maior ou igual a zero').optional(),
    extraHourValue: zod_1.z.string().refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
    }, 'Valor da hora extra deve ser um número válido maior ou igual a zero').optional(),
    startDate: zod_1.z.date().refine((date) => date <= new Date(), 'Data de início não pode ser no futuro').optional(),
    endDate: zod_1.z.date().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
}).refine((data) => {
    // Validação cruzada para updates: endDate deve ser maior que startDate se ambos fornecidos
    if (data.endDate && data.startDate) {
        return data.endDate > data.startDate;
    }
    return true;
}, {
    message: 'Data de término deve ser posterior à data de início',
    path: ['endDate'],
});
/**
 * Schema para seleção/resposta de contrato
 */
exports.selectContractSchema = (0, drizzle_zod_1.createSelectSchema)(exports.contracts);
/**
 * Schema para resposta de contrato com relacionamentos
 */
exports.contractWithRelationsSchema = exports.selectContractSchema.extend({
    requester: zod_1.z.object({
        id: zod_1.z.number(),
        name: zod_1.z.string(),
        email: zod_1.z.string(),
        company: zod_1.z.string().nullable(),
    }).optional(),
    calendar: zod_1.z.object({
        id: zod_1.z.number(),
        name: zod_1.z.string(),
        description: zod_1.z.string().nullable(),
    }).optional(),
    slaRules: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.number(),
        priority: zod_1.z.string(),
        responseTimeMinutes: zod_1.z.number(),
        solutionTimeMinutes: zod_1.z.number(),
    })).optional(),
});
/**
 * Schema para filtros de busca de contratos
 */
exports.contractFiltersSchema = zod_1.z.object({
    requesterId: zod_1.z.number().int().positive().optional(),
    calendarId: zod_1.z.number().int().positive().optional(),
    type: contractTypeEnum.optional(),
    isActive: zod_1.z.boolean().optional(),
    startDate: zod_1.z.date().optional(),
    endDate: zod_1.z.date().optional(),
    page: zod_1.z.number().int().min(1).optional().default(1),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(10),
});
