"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkedTickets = exports.ticketTags = exports.tags = exports.systemSettings = exports.responseTemplates = exports.attachments = exports.ticketInteractions = exports.emailTemplates = exports.tickets = exports.requesters = exports.users = exports.linkTypeEnum = exports.planTypeEnum = exports.attachmentTypeEnum = exports.interactionTypeEnum = exports.emailTemplateTypeEnum = exports.roleEnum = exports.categoryEnum = exports.priorityEnum = exports.statusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// Enum definitions for PostgreSQL
exports.statusEnum = (0, pg_core_1.pgEnum)('status', ['open', 'in_progress', 'pending', 'resolved', 'closed']);
exports.priorityEnum = (0, pg_core_1.pgEnum)('priority', ['low', 'medium', 'high', 'critical']);
exports.categoryEnum = (0, pg_core_1.pgEnum)('category', ['technical_support', 'financial', 'commercial', 'other']);
exports.roleEnum = (0, pg_core_1.pgEnum)('role', ['admin', 'agent', 'manager']);
exports.emailTemplateTypeEnum = (0, pg_core_1.pgEnum)('email_template_type', [
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
exports.interactionTypeEnum = (0, pg_core_1.pgEnum)('interaction_type', ['comment', 'internal_note', 'status_change', 'assignment', 'time_log']);
exports.attachmentTypeEnum = (0, pg_core_1.pgEnum)('attachment_type', ['image', 'document', 'video', 'other']);
exports.planTypeEnum = (0, pg_core_1.pgEnum)('plan_type', ['basic', 'standard', 'premium', 'enterprise']);
exports.linkTypeEnum = (0, pg_core_1.pgEnum)('link_type', ['related', 'duplicate', 'blocks', 'blocked_by', 'child', 'parent']);
// Tabela de usuários
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    username: (0, pg_core_1.varchar)('username', { length: 50 }).notNull().unique(),
    password: (0, pg_core_1.varchar)('password', { length: 100 }).notNull(),
    fullName: (0, pg_core_1.varchar)('full_name', { length: 100 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 100 }).notNull().unique(),
    role: (0, exports.roleEnum)('role').notNull().default('agent'),
    avatarInitials: (0, pg_core_1.varchar)('avatar_initials', { length: 10 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// Tabela de solicitantes (clientes)
exports.requesters = (0, pg_core_1.pgTable)('requesters', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    fullName: (0, pg_core_1.varchar)('full_name', { length: 100 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 100 }).notNull().unique(),
    company: (0, pg_core_1.varchar)('company', { length: 100 }),
    avatarInitials: (0, pg_core_1.varchar)('avatar_initials', { length: 10 }),
    planType: (0, exports.planTypeEnum)('plan_type').notNull().default('basic'),
    monthlyHours: (0, pg_core_1.integer)('monthly_hours').notNull().default(10), // Horas incluídas no plano
    usedHours: (0, pg_core_1.numeric)('used_hours', { precision: 5, scale: 2 }).notNull().default('0'), // Horas utilizadas no mês
    resetDate: (0, pg_core_1.timestamp)('reset_date').notNull().defaultNow(), // Data de reset das horas
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// Tabela de tickets
exports.tickets = (0, pg_core_1.pgTable)('tickets', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    subject: (0, pg_core_1.varchar)('subject', { length: 200 }).notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    status: (0, exports.statusEnum)('status').notNull().default('open'),
    priority: (0, exports.priorityEnum)('priority').notNull().default('medium'),
    category: (0, exports.categoryEnum)('category').notNull(),
    requesterId: (0, pg_core_1.integer)('requester_id').notNull().references(() => exports.requesters.id),
    assigneeId: (0, pg_core_1.integer)('assignee_id').references(() => exports.users.id),
    contractId: (0, pg_core_1.integer)('contract_id'), // Referência nullable ao contrato - será definida em relations
    // Campos de prazos SLA calculados pelo motor de SLA
    responseDueAt: (0, pg_core_1.timestamp)('response_due_at'), // Prazo para primeira resposta
    solutionDueAt: (0, pg_core_1.timestamp)('solution_due_at'), // Prazo para solução definitiva
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
// Tabela de templates de email
exports.emailTemplates = (0, pg_core_1.pgTable)('email_templates', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    type: (0, exports.emailTemplateTypeEnum)('type').notNull(),
    subject: (0, pg_core_1.varchar)('subject', { length: 200 }).notNull(),
    body: (0, pg_core_1.text)('body').notNull(),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
// Tabela de interações do ticket
exports.ticketInteractions = (0, pg_core_1.pgTable)('ticket_interactions', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    ticketId: (0, pg_core_1.integer)('ticket_id').notNull().references(() => exports.tickets.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id),
    type: (0, exports.interactionTypeEnum)('type').notNull(),
    content: (0, pg_core_1.text)('content'),
    isInternal: (0, pg_core_1.boolean)('is_internal').notNull().default(false),
    timeSpent: (0, pg_core_1.numeric)('time_spent', { precision: 5, scale: 2 }), // Horas apontadas
    metadata: (0, pg_core_1.json)('metadata'), // JSON para dados extras (ex: anexos, mudanças de status)
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// Tabela de anexos
exports.attachments = (0, pg_core_1.pgTable)('attachments', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    ticketId: (0, pg_core_1.integer)('ticket_id').references(() => exports.tickets.id, { onDelete: 'cascade' }),
    interactionId: (0, pg_core_1.integer)('interaction_id').references(() => exports.ticketInteractions.id, { onDelete: 'cascade' }),
    fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }).notNull(),
    originalName: (0, pg_core_1.varchar)('original_name', { length: 255 }).notNull(),
    mimeType: (0, pg_core_1.varchar)('mime_type', { length: 100 }).notNull(),
    fileSize: (0, pg_core_1.integer)('file_size').notNull(), // em bytes
    type: (0, exports.attachmentTypeEnum)('type').notNull(),
    filePath: (0, pg_core_1.varchar)('file_path', { length: 500 }).notNull(),
    uploadedBy: (0, pg_core_1.integer)('uploaded_by').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// Tabela de templates de resposta
exports.responseTemplates = (0, pg_core_1.pgTable)('response_templates', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    category: (0, exports.categoryEnum)('category').notNull(),
    subject: (0, pg_core_1.varchar)('subject', { length: 200 }),
    content: (0, pg_core_1.text)('content').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdBy: (0, pg_core_1.integer)('created_by').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
// Tabela de configurações do sistema
exports.systemSettings = (0, pg_core_1.pgTable)('system_settings', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    key: (0, pg_core_1.varchar)('key', { length: 100 }).notNull().unique(),
    value: (0, pg_core_1.json)('value').notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
// Tabela de tags
exports.tags = (0, pg_core_1.pgTable)('tags', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    name: (0, pg_core_1.varchar)('name', { length: 50 }).notNull().unique(),
    color: (0, pg_core_1.varchar)('color', { length: 7 }).notNull(), // Hex color code
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// Tabela de relacionamento many-to-many entre tickets e tags
exports.ticketTags = (0, pg_core_1.pgTable)('ticket_tags', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    ticketId: (0, pg_core_1.integer)('ticket_id').notNull().references(() => exports.tickets.id, { onDelete: 'cascade' }),
    tagId: (0, pg_core_1.integer)('tag_id').notNull().references(() => exports.tags.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// Tabela de links entre tickets
exports.linkedTickets = (0, pg_core_1.pgTable)('linked_tickets', {
    id: (0, pg_core_1.integer)('id').primaryKey().generatedAlwaysAsIdentity(),
    sourceTicketId: (0, pg_core_1.integer)('source_ticket_id').notNull().references(() => exports.tickets.id, { onDelete: 'cascade' }),
    targetTicketId: (0, pg_core_1.integer)('target_ticket_id').notNull().references(() => exports.tickets.id, { onDelete: 'cascade' }),
    linkType: (0, exports.linkTypeEnum)('link_type').notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
