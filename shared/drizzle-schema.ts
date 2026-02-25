import { pgTable, integer, varchar, text, timestamp, boolean, pgEnum, numeric, json, jsonb } from 'drizzle-orm/pg-core';

// Import SLA schemas
export * from './schema/sla_rules';
export * from './schema/contracts';
export * from './schema/calendars';
export * from './schema/sla_templates';
export * from './schema/ticket-status';
export * from './schema/user-teams';

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
export const taskTypeEnum = pgEnum('task_type', ['support', 'parallel']);
export const taskStatusEnum = pgEnum('task_status', ['open', 'in_progress', 'pending', 'completed', 'cancelled']);

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
  avatarUrl: text('avatar_url'), // URL da foto de perfil
  emailSignature: text('email_signature'), // Assinatura de email em HTML
  isActive: boolean('is_active').notNull().default(true), // Para desativar usuários
  firstLogin: boolean('first_login').notNull().default(false), // Flag para indicar se precisa trocar senha no primeiro login
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

// Tabela de categorias hierárquicas de equipes
export const teamCategories = pgTable('team_categories', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  parentCategoryId: integer('parent_category_id').references((): any => teamCategories.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const teamCategoryUsers = pgTable('team_category_users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  categoryId: integer('category_id').notNull().references(() => teamCategories.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  priority: integer('priority').notNull().default(1),
  autoAssign: boolean('auto_assign').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type TeamCategory = typeof teamCategories.$inferSelect;
export type NewTeamCategory = typeof teamCategories.$inferInsert;
export type TeamCategoryUser = typeof teamCategoryUsers.$inferSelect;
export type NewTeamCategoryUser = typeof teamCategoryUsers.$inferInsert;

// Tabela de serviços hierárquica
export const services = pgTable('services', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  parentId: integer('parent_id').references((): any => services.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'set null' }), // Equipe padrão opcional
  order: integer('order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

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
  status: varchar('status', { length: 50 }).notNull().default('open').references(() => ticketStatusConfig.id),
  priority: priorityEnum('priority').notNull().default('medium'),
  category: varchar('category', { length: 255 }).notNull(),
  teamId: integer('team_id').references(() => teams.id), // ID da equipe (categoria principal)
  categoryId: integer('category_id').references(() => teamCategories.id), // ID da categoria hierárquica
  serviceId: integer('service_id'), // ID do serviço (será referenciado quando a tabela services for criada)
  requesterId: integer('requester_id').notNull().references(() => requesters.id),
  assigneeId: integer('assignee_id').references(() => users.id),
  companyId: integer('company_id').references(() => companies.id), // Referência para empresa solicitante
  contractId: varchar('contract_id', { length: 255 }), // Referência nullable ao contrato UUID
  emailThreadId: varchar('email_thread_id', { length: 255 }), // Message-ID inicial da thread de email
  // Campos de prazos SLA calculados pelo motor de SLA
  responseDueAt: timestamp('response_due_at'), // Prazo para primeira resposta
  solutionDueAt: timestamp('solution_due_at'), // Prazo para solução definitiva
  // Controle de tarefas de apoio
  pausedByTaskId: integer('paused_by_task_id'), // ID da tarefa de apoio que está pausando este ticket
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
  contractId: varchar('contract_id', { length: 255 }), // Contrato específico para débito
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

// Tabela de solicitantes adicionais do ticket (múltiplos solicitantes)
export const ticketRequesters = pgTable('ticket_requesters', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  requesterId: integer('requester_id').notNull().references(() => requesters.id),
  isPrimary: boolean('is_primary').notNull().default(false), // Indica se é o solicitante principal
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tabela de pessoas em cópia (CC) do ticket
export const ticketCc = pgTable('ticket_cc', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 100 }).notNull(),
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tabela de anotações sobre clientes/solicitantes
export const requesterNotes = pgTable('requester_notes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  requesterId: integer('requester_id').notNull().references(() => requesters.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isImportant: boolean('is_important').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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

export type TicketRequester = typeof ticketRequesters.$inferSelect;
export type NewTicketRequester = typeof ticketRequesters.$inferInsert;

export type TicketCc = typeof ticketCc.$inferSelect;
export type NewTicketCc = typeof ticketCc.$inferInsert;

export type RequesterNote = typeof requesterNotes.$inferSelect;
export type NewRequesterNote = typeof requesterNotes.$inferInsert;

// Tabela de configuração de status de tickets
export const ticketStatusConfig = pgTable('ticket_status_config', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(),
  order: integer('order').notNull(),
  isClosedStatus: boolean('is_closed_status').notNull().default(false),
  pauseSla: boolean('pause_sla').notNull().default(false),
  autoCloseAfterDays: integer('auto_close_after_days'),
  requiresResponse: boolean('requires_response').notNull().default(true),
  notifyCustomer: boolean('notify_customer').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type TicketStatusConfig = typeof ticketStatusConfig.$inferSelect;
export type NewTicketStatusConfig = typeof ticketStatusConfig.$inferInsert;

// Tabela de base de conhecimento (Knowledge Base)
export const knowledgeArticles = pgTable('knowledge_articles', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  tags: json('tags').$type<string[]>().notNull().default([]),
  views: integer('views').notNull().default(0),
  authorId: integer('author_id').references(() => users.id),
  author: varchar('author', { length: 100 }).notNull(), // Nome do autor para exibição
  lastEditedById: integer('last_edited_by_id').references(() => users.id),
  lastEditedBy: varchar('last_edited_by', { length: 100 }),
  lastEditedAt: timestamp('last_edited_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;
export type NewKnowledgeArticle = typeof knowledgeArticles.$inferInsert;
// Tabela de comentários da base de conhecimento
export const knowledgeComments = pgTable('knowledge_comments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  articleId: integer('article_id').notNull().references(() => knowledgeArticles.id, { onDelete: 'cascade' }),
  authorId: integer('author_id').notNull().references(() => users.id),
  author: varchar('author', { length: 100 }).notNull(), // Nome do autor para exibição
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type KnowledgeComment = typeof knowledgeComments.$inferSelect;
export type NewKnowledgeComment = typeof knowledgeComments.$inferInsert;
// Tabela de gatilhos de automa��o
export const automationTriggers = pgTable('automation_triggers', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(),
  conditions: jsonb('conditions'),
  actions: jsonb('actions'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type AutomationTrigger = typeof automationTriggers.$inferSelect;
export type NewAutomationTrigger = typeof automationTriggers.$inferInsert;
// Tabela de tarefas (Tasks)
export const tasks = pgTable('tasks', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  taskNumber: integer('task_number').notNull(), // T1, T2, T3... (sequencial por ticket)
  taskCode: varchar('task_code', { length: 50 }).notNull().unique(), // Ex: 123-T1, 123-T2
  type: taskTypeEnum('type').notNull(), // 'support' ou 'parallel'
  subject: varchar('subject', { length: 200 }).notNull(),
  description: text('description').notNull(),
  status: taskStatusEnum('status').notNull().default('open'),
  priority: priorityEnum('priority').notNull().default('medium'),
  teamId: integer('team_id').references(() => teams.id),
  assignedToId: integer('assigned_to_id').references(() => users.id), // Usuário que assumiu a tarefa
  createdBy: integer('created_by').notNull().references(() => users.id),
  
  // Campos de SLA (herdados do ticket original)
  responseDueAt: timestamp('response_due_at'),
  solutionDueAt: timestamp('solution_due_at'),
  
  // Controle de horas
  timeSpent: numeric('time_spent', { precision: 5, scale: 2 }).notNull().default('0'),
  
  // Data de conclusão
  completedAt: timestamp('completed_at'),
  completedBy: integer('completed_by').references(() => users.id),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tabela de interações de tarefas (comentários, apontamentos, etc)
export const taskInteractions = pgTable('task_interactions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  taskId: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  type: interactionTypeEnum('type').notNull(),
  content: text('content'),
  isInternal: boolean('is_internal').notNull().default(false),
  timeSpent: numeric('time_spent', { precision: 5, scale: 2 }), // Horas apontadas
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskInteraction = typeof taskInteractions.$inferSelect;
export type NewTaskInteraction = typeof taskInteractions.$inferInsert;