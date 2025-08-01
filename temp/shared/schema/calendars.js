"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectCalendarSchema = exports.updateCalendarSchema = exports.createCalendarSchema = exports.calendarsRelations = exports.calendars = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
/**
 * Tabela de calendários de trabalho
 * Define horários de funcionamento e feriados para cálculo de SLA
 */
exports.calendars = (0, pg_core_1.pgTable)('calendars', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    /**
     * Estrutura do workingHours:
     * {
     *   monday: { start: "09:00", end: "18:00", isWorking: true },
     *   tuesday: { start: "09:00", end: "18:00", isWorking: true },
     *   ...
     * }
     */
    workingHours: (0, pg_core_1.jsonb)('working_hours').notNull(),
    /**
     * Estrutura do holidays:
     * [
     *   { date: "2025-01-01", name: "Ano Novo" },
     *   { date: "2025-12-25", name: "Natal" }
     * ]
     */
    holidays: (0, pg_core_1.jsonb)('holidays').default([]),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
/**
 * Relacionamentos da tabela calendars
 * Nota: Relações serão definidas em arquivo separado para evitar imports circulares
 */
exports.calendarsRelations = (0, drizzle_orm_1.relations)(exports.calendars, ({ many }) => ({
// contracts: many(contracts), // Definido em relations/index.ts
}));
/**
 * Schema de validação para estrutura de dia da semana
 */
const dayWorkingHoursSchema = zod_1.z.object({
    start: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
    end: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
    isWorking: zod_1.z.boolean(),
});
/**
 * Schema de validação para estrutura de horários de trabalho
 */
const workingHoursSchema = zod_1.z.object({
    monday: dayWorkingHoursSchema,
    tuesday: dayWorkingHoursSchema,
    wednesday: dayWorkingHoursSchema,
    thursday: dayWorkingHoursSchema,
    friday: dayWorkingHoursSchema,
    saturday: dayWorkingHoursSchema,
    sunday: dayWorkingHoursSchema,
});
/**
 * Schema de validação para estrutura de feriados
 */
const holidaySchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
    name: zod_1.z.string().min(1, 'Nome do feriado é obrigatório'),
});
/**
 * Schema base do Drizzle para inserção
 */
const baseCreateCalendarSchema = (0, drizzle_zod_1.createInsertSchema)(exports.calendars);
/**
 * Schema personalizado para criação de calendário com validações específicas
 */
exports.createCalendarSchema = baseCreateCalendarSchema.extend({
    name: zod_1.z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
    description: zod_1.z.string().optional(),
    workingHours: workingHoursSchema,
    holidays: zod_1.z.array(holidaySchema).optional().default([]),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
/**
 * Schema para atualização de calendário (todos os campos opcionais exceto validações)
 */
exports.updateCalendarSchema = exports.createCalendarSchema.partial().extend({
    workingHours: workingHoursSchema.optional(),
    holidays: zod_1.z.array(holidaySchema).optional(),
});
/**
 * Schema para seleção/resposta de calendário
 */
exports.selectCalendarSchema = (0, drizzle_zod_1.createSelectSchema)(exports.calendars);
