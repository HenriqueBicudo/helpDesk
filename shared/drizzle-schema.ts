import { pgTable, integer, varchar, text, timestamp, boolean, pgEnum, numeric, json } from 'drizzle-orm/pg-core';

// Enum definitions for PostgreSQL
export const statusEnum = pgEnum('status', ['open', 'in_progress', 'pending', 'resolved', 'closed']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'critical']);
export const categoryEnum = pgEnum('category', ['technical_support', 'financial', 'commercial', 'other']);
export const roleEnum = pgEnum('role', ['admin', 'agent', 'manager']);
export const emailTemplateTypeEnum = pgEnum('email_template_type', [
  'new_ticket',
  'ticket_update',
  'ticket_resolution',
  'ticket_assignment',
  'welcome_user',
  'password_reset',
  'ticket_escalation',
  'sla_breach',
  'satisfaction_survey'
]);
export const interactionTypeEnum = pgEnum('interaction_type', ['comment', 'internal_note', 'status_change', 'assignment', 'time_log']);
export const attachmentTypeEnum = pgEnum('attachment_type', ['image', 'document', 'video', 'other']);
export const planTypeEnum = pgEnum('plan_type', ['basic', 'standard', 'premium', 'enterprise']);

// Tabela de usuários
export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 100 }).notNull(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  role: roleEnum('role').notNull().default('agent'),
  avatarInitials: varchar('avatar_initials', { length: 10 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tabela de solicitantes (clientes)
export const requesters = pgTable('requesters', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  company: varchar('company', { length: 100 }),
  avatarInitials: varchar('avatar_initials', { length: 10 }),
  planType: planTypeEnum('plan_type').notNull().default('basic'),
  monthlyHours: integer('monthly_hours').notNull().default(10), // Horas incluídas no plano
  usedHours: numeric('used_hours', { precision: 5, scale: 2 }).notNull().default('0'), // Horas utilizadas no mês
  resetDate: timestamp('reset_date').notNull().defaultNow(), // Data de reset das horas
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tabela de tickets
export const tickets = pgTable('tickets', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  subject: varchar('subject', { length: 200 }).notNull(),
  description: text('description').notNull(),
  status: statusEnum('status').notNull().default('open'),
  priority: priorityEnum('priority').notNull().default('medium'),
  category: categoryEnum('category').notNull(),
  requesterId: integer('requester_id').notNull().references(() => requesters.id),
  assigneeId: integer('assignee_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tabela de templates de email
export const emailTemplates = pgTable('email_templates', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  type: emailTemplateTypeEnum('type').notNull(),
  subject: varchar('subject', { length: 200 }).notNull(),
  body: text('body').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tabela de interações do ticket
export const ticketInteractions = pgTable('ticket_interactions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  type: interactionTypeEnum('type').notNull(),
  content: text('content'),
  isInternal: boolean('is_internal').notNull().default(false),
  timeSpent: numeric('time_spent', { precision: 5, scale: 2 }), // Horas apontadas
  metadata: json('metadata'), // JSON para dados extras (ex: anexos, mudanças de status)
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tabela de anexos
export const attachments = pgTable('attachments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
  interactionId: integer('interaction_id').references(() => ticketInteractions.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(), // em bytes
  type: attachmentTypeEnum('type').notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tabela de templates de resposta
export const responseTemplates = pgTable('response_templates', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  category: categoryEnum('category').notNull(),
  subject: varchar('subject', { length: 200 }),
  content: text('content').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tabela de configurações do sistema
export const systemSettings = pgTable('system_settings', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: json('value').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Requester = typeof requesters.$inferSelect;
export type NewRequester = typeof requesters.$inferInsert;

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;

export type TicketInteraction = typeof ticketInteractions.$inferSelect;
export type NewTicketInteraction = typeof ticketInteractions.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type ResponseTemplate = typeof responseTemplates.$inferSelect;
export type NewResponseTemplate = typeof responseTemplates.$inferInsert;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
