import { pgTable, integer, varchar, text, timestamp, boolean, pgEnum, numeric, json } from 'drizzle-orm/pg-core';

// Enum definitions for PostgreSQL
export const statusEnum = pgEnum('status', ['open', 'in_progress', 'pending', 'resolved', 'closed']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'critical']);
export const categoryEnum = pgEnum('category', ['technical_support', 'financial', 'commercial', 'other']);
export const roleEnum = pgEnum('role', [
  'admin',
  'helpdesk_manager', 
  'helpdesk_agent',
  'client_manager',
  'client_user'
]);

export type UserRole = typeof roleEnum.enumValues[number];
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
export const linkTypeEnum = pgEnum('link_type', ['related', 'duplicate', 'blocks', 'blocked_by', 'child', 'parent']);

// Tabela de usuários
export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 200 }).notNull(), // Aumentado para 200 caracteres
  fullName: varchar('full_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  role: roleEnum('role').notNull().default('client_user'),
  company: varchar('company', { length: 100 }), // Empresa do usuário (para usuários clientes)
  teamId: integer('team_id'), // Referência para equipes (será adicionada após criação da tabela teams)
  avatarInitials: varchar('avatar_initials', { length: 10 }),
  isActive: boolean('is_active').notNull().default(true), // Para desativar usuários
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tabela de empresas
export const companies = pgTable('companies', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  cnpj: varchar('cnpj', { length: 18 }),
  email: varchar('email', { length: 100 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  isActive: boolean('is_active').notNull().default(true),
  hasActiveContract: boolean('has_active_contract').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tabela de equipes
export const teams = pgTable('teams', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  contractId: varchar('contract_id', { length: 255 }), // Referência nullable ao contrato UUID
  // Campos de prazos SLA calculados pelo motor de SLA
  responseDueAt: timestamp('response_due_at'), // Prazo para primeira resposta
  solutionDueAt: timestamp('solution_due_at'), // Prazo para solução definitiva
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

// Tabela de tags
export const tags = pgTable('tags', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  color: varchar('color', { length: 7 }).notNull(), // Hex color code
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tabela de relacionamento many-to-many entre tickets e tags
export const ticketTags = pgTable('ticket_tags', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tabela de links entre tickets
export const linkedTickets = pgTable('linked_tickets', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  sourceTicketId: integer('source_ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  targetTicketId: integer('target_ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  linkType: linkTypeEnum('link_type').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

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

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type TicketTag = typeof ticketTags.$inferSelect;
export type NewTicketTag = typeof ticketTags.$inferInsert;

export type LinkedTicket = typeof linkedTickets.$inferSelect;
export type NewLinkedTicket = typeof linkedTickets.$inferInsert;
