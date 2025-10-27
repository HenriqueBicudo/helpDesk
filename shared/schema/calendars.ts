import { pgTable, text, varchar, jsonb, timestamp, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Tabela de calendários de trabalho
 * Define horários de funcionamento e feriados para cálculo de SLA
 */
export const calendars = pgTable('calendars', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  /**
   * Estrutura do workingHours:
   * {
   *   monday: { start: "09:00", end: "18:00", isWorking: true },
   *   tuesday: { start: "09:00", end: "18:00", isWorking: true },
   *   ...
   * }
   */
  workingHours: jsonb('working_hours').notNull(),
  /**
   * Estrutura do holidays:
   * [
   *   { date: "2025-01-01", name: "Ano Novo" },
   *   { date: "2025-12-25", name: "Natal" }
   * ]
   */
  holidays: jsonb('holidays').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Relacionamentos da tabela calendars
 * Nota: Relações serão definidas em arquivo separado para evitar imports circulares
 */
export const calendarsRelations = relations(calendars, ({ many }) => ({
  // contracts: many(contracts), // Definido em relations/index.ts
}));

/**
 * Schema de validação para estrutura de dia da semana
 */
const dayWorkingHoursSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  isWorking: z.boolean(),
});

/**
 * Schema de validação para estrutura de horários de trabalho
 */
const workingHoursSchema = z.object({
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
const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
  name: z.string().min(1, 'Nome do feriado é obrigatório'),
});

/**
 * Schema base do Drizzle para inserção
 */
const baseCreateCalendarSchema = createInsertSchema(calendars);

/**
 * Schema personalizado para criação de calendário com validações específicas
 */
export const createCalendarSchema = baseCreateCalendarSchema.extend({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().optional(),
  workingHours: workingHoursSchema,
  holidays: z.array(holidaySchema).optional().default([]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Schema para atualização de calendário (todos os campos opcionais exceto validações)
 */
export const updateCalendarSchema = createCalendarSchema.partial().extend({
  workingHours: workingHoursSchema.optional(),
  holidays: z.array(holidaySchema).optional(),
});

/**
 * Schema para seleção/resposta de calendário
 */
export const selectCalendarSchema = createSelectSchema(calendars);

/**
 * Tipos TypeScript derivados dos schemas
 */
export type Calendar = z.infer<typeof selectCalendarSchema>;
export type CreateCalendar = z.infer<typeof createCalendarSchema>;
export type UpdateCalendar = z.infer<typeof updateCalendarSchema>;
export type WorkingHours = z.infer<typeof workingHoursSchema>;
export type Holiday = z.infer<typeof holidaySchema>;
