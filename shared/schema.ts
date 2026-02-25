import { z } from "zod";

// Tipos de status, prioridade e categoria
export const TICKET_STATUS = ['open', 'in_progress', 'pending', 'resolved', 'closed'] as const;
export const TICKET_PRIORITY = ['low', 'medium', 'high', 'critical'] as const;
export const TICKET_CATEGORY = ['technical_support', 'financial', 'commercial', 'other'] as const;

export type TicketStatus = typeof TICKET_STATUS[number];
export type TicketPriority = typeof TICKET_PRIORITY[number];
export type TicketCategory = typeof TICKET_CATEGORY[number];

// Validadores Zod para os enum-like types
export const ticketStatusSchema = z.enum(TICKET_STATUS);
export const ticketPrioritySchema = z.enum(TICKET_PRIORITY);
export const ticketCategorySchema = z.enum(TICKET_CATEGORY);

// Tipos de roles do sistema
export const USER_ROLES = [
  'admin',           // Administrador total do sistema
  'helpdesk_agent',  // Agente da empresa de helpdesk (acesso a todos os tickets)
  'helpdesk_manager',// Gerente da empresa de helpdesk (acesso total + configurações)
  'client_manager',  // Gestor da empresa cliente (acesso aos tickets da sua empresa)
  'client_user'      // Usuário padrão da empresa cliente (acesso limitado aos seus tickets)
] as const;

export type UserRole = typeof USER_ROLES[number];

// Validador para roles
export const userRoleSchema = z.enum(USER_ROLES);

// Esquema de usuário para validação com Zod
export const userSchema = z.object({
  id: z.number().optional(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(3),
  email: z.string().email(),
  role: userRoleSchema.default('client_user'),
  company: z.string().nullable().optional(), // Empresa do usuário (para usuários clientes)
  teamId: z.number().nullable().optional(), // ID do team do usuário
  avatarInitials: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(), // URL da foto de perfil
  emailSignature: z.string().nullable().optional(), // Assinatura de email em HTML
  isActive: z.boolean().default(true),
  firstLogin: z.boolean().default(false), // Flag para indicar se precisa trocar senha no primeiro login
  createdAt: z.date().optional()
});

// Esquema de requester (cliente) para validação com Zod
export const requesterSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().min(3),
  email: z.string().email(),
  avatarInitials: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  planType: z.string().default('basic'),
  monthlyHours: z.number().default(10),
  usedHours: z.string().default('0'),
  resetDate: z.date().nullable().optional(),
  createdAt: z.date().optional()
});

// Esquema de empresa para validação com Zod
export const companySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  cnpj: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
  hasActiveContract: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertCompanySchema = companySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Esquema de serviço para validação com Zod
export const serviceSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  parentId: z.number().optional().nullable(),
  teamId: z.number().optional().nullable(), // Equipe padrão opcional
  order: z.number().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertServiceSchema = serviceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Esquema de ticket para validação com Zod
export const ticketSchema = z.object({
  id: z.number().optional(),
  subject: z.string().min(3),
  description: z.string().min(10),
  status: ticketStatusSchema.default('open'),
  priority: ticketPrioritySchema.default('medium'),
  category: z.string().min(1), // Nome da categoria (mantido para compatibilidade)
  teamId: z.number().optional().nullable(), // ID da equipe selecionada (opcional)
  categoryId: z.number().optional().nullable(), // ID da categoria hierárquica selecionada
  serviceId: z.number(), // ID do serviço selecionado (obrigatório)
  requesterId: z.number(),
  assigneeId: z.number().optional().nullable(),
  companyId: z.number().optional().nullable(), // Campo para empresa solicitante
  contractId: z.string().optional().nullable(), // Campo para vincular ao contrato (UUID)
  responseDueAt: z.date().optional().nullable(), // Prazo para primeira resposta
  solutionDueAt: z.date().optional().nullable(), // Prazo para solução definitiva
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Schemas para inserção (sem os campos gerados automaticamente)
export const insertUserSchema = userSchema.omit({ 
  id: true, 
  avatarInitials: true, 
  createdAt: true 
});

export const insertRequesterSchema = requesterSchema.omit({ 
  id: true, 
  avatarInitials: true, 
  createdAt: true 
});

export const insertTicketSchema = ticketSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Requester = z.infer<typeof requesterSchema>;
export type InsertRequester = z.infer<typeof insertRequesterSchema>;

export type Company = z.infer<typeof companySchema>;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Service = z.infer<typeof serviceSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Ticket = z.infer<typeof ticketSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

// Extended type for tickets with requester and assignee information
export type TicketWithRelations = Ticket & {
  requester: Requester;
  assignee?: User;
  company?: Company;
  contract?: {
    id: string;
    contractNumber: string;
    includedHours: number;
    usedHours: string;
    monthlyValue: string;
    hourlyRate: string;
    resetDay: number;
    status: string;
  };
};

// Email template types
export const EMAIL_TEMPLATE_TYPES = [
  'new_ticket', 
  'ticket_update', 
  'ticket_resolution', 
  'ticket_assignment',
  'welcome_user',
  'password_reset',
  'ticket_escalation',
  'sla_breach',
  'satisfaction_survey'
] as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[number];

export const emailTemplateTypeSchema = z.enum(EMAIL_TEMPLATE_TYPES);

// Email template schema
export const emailTemplateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(3),
  type: emailTemplateTypeSchema,
  subject: z.string().min(3),
  body: z.string().min(10),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertEmailTemplateSchema = emailTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

// Interaction types
export const INTERACTION_TYPES = ['comment', 'internal_note', 'status_change', 'assignment'] as const;
export type InteractionType = typeof INTERACTION_TYPES[number];
export const interactionTypeSchema = z.enum(INTERACTION_TYPES);

// Attachment types
export const ATTACHMENT_TYPES = ['image', 'document', 'other'] as const;
export type AttachmentType = typeof ATTACHMENT_TYPES[number];
export const attachmentTypeSchema = z.enum(ATTACHMENT_TYPES);

// Ticket interaction schema
export const ticketInteractionSchema = z.object({
  id: z.number().optional(),
  ticketId: z.number(),
  type: interactionTypeSchema,
  content: z.string().min(1),
  isInternal: z.boolean().default(false),
  timeSpent: z.number().min(0).default(0), // Tempo gasto em horas (decimal)
  contractId: z.string().optional().nullable(), // Contrato específico para débito de horas
  createdBy: z.number().nullable(), // null = interação automática do sistema
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertTicketInteractionSchema = ticketInteractionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Attachment schema
export const attachmentSchema = z.object({
  id: z.number().optional(),
  ticketId: z.number(),
  interactionId: z.number().optional().nullable(), // Vincular anexo à interação específica
  fileName: z.string().min(1),
  fileSize: z.number().min(0),
  mimeType: z.string().min(1),
  filePath: z.string().min(1),
  createdAt: z.date().optional()
});

export const insertAttachmentSchema = attachmentSchema.omit({
  id: true,
  createdAt: true
});

// Response template schema
export const responseTemplateSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(3),
  content: z.string().min(10),
  category: z.string().min(3),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertResponseTemplateSchema = responseTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types for new schemas
export type TicketInteraction = z.infer<typeof ticketInteractionSchema>;
export type InsertTicketInteraction = z.infer<typeof insertTicketInteractionSchema>;

export type Attachment = z.infer<typeof attachmentSchema>;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export type ResponseTemplate = z.infer<typeof responseTemplateSchema>;
export type InsertResponseTemplate = z.infer<typeof insertResponseTemplateSchema>;

// System settings schemas
export const SETTING_CATEGORIES = ['general', 'notifications', 'security', 'automation', 'customization', 'integrations'] as const;
export type SettingCategory = typeof SETTING_CATEGORIES[number];
export const settingCategorySchema = z.enum(SETTING_CATEGORIES);

export const systemSettingSchema = z.object({
  id: z.number().optional(),
  key: z.string().min(1),
  value: z.any(),
  category: settingCategorySchema,
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const insertSystemSettingSchema = systemSettingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const updateSystemSettingsSchema = z.object({
  general: z.record(z.any()).optional(),
  notifications: z.record(z.any()).optional(),
  security: z.record(z.any()).optional(),
  automation: z.record(z.any()).optional(),
  customization: z.record(z.any()).optional(),
  integrations: z.record(z.any()).optional(),
});

// Esquema de Team
export const teamSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(3),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type SystemSetting = z.infer<typeof systemSettingSchema>;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type UpdateSystemSettings = z.infer<typeof updateSystemSettingsSchema>;
export type Team = z.infer<typeof teamSchema>;
// Tipos e schemas para Tasks
export const TASK_TYPES = ['support', 'parallel'] as const;
export const TASK_STATUS = ['open', 'in_progress', 'pending', 'completed', 'cancelled'] as const;

export type TaskType = typeof TASK_TYPES[number];
export type TaskStatus = typeof TASK_STATUS[number];

export const taskTypeSchema = z.enum(TASK_TYPES);
export const taskStatusSchema = z.enum(TASK_STATUS);

// Schema de Task
export const taskSchema = z.object({
  id: z.number().optional(),
  ticketId: z.number(),
  taskNumber: z.number(),
  taskCode: z.string(),
  type: taskTypeSchema,
  subject: z.string().min(3),
  description: z.string().min(10),
  status: taskStatusSchema.default('open'),
  priority: ticketPrioritySchema.default('medium'),
  teamId: z.number().optional().nullable(),
  createdBy: z.number(),
  responseDueAt: z.date().optional().nullable(),
  solutionDueAt: z.date().optional().nullable(),
  timeSpent: z.string().default('0'),
  completedAt: z.date().optional().nullable(),
  completedBy: z.number().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const insertTaskSchema = taskSchema.omit({
  id: true,
  taskNumber: true,
  taskCode: true,
  timeSpent: true,
  completedAt: true,
  completedBy: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

// Schema de TaskInteraction
export const taskInteractionSchema = z.object({
  id: z.number().optional(),
  taskId: z.number(),
  userId: z.number().optional().nullable(),
  type: z.enum(['comment', 'internal_note', 'status_change', 'assignment', 'time_log']),
  content: z.string().optional().nullable(),
  isInternal: z.boolean().default(false),
  timeSpent: z.union([z.string(), z.number()]).optional().nullable().transform(val => {
    if (val === null || val === undefined) return null;
    return typeof val === 'number' ? val.toString() : val;
  }),
  metadata: z.any().optional(),
  createdAt: z.date().optional(),
});

export const insertTaskInteractionSchema = taskInteractionSchema.omit({
  id: true,
  createdAt: true,
});

export type Task = z.infer<typeof taskSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskInteraction = z.infer<typeof taskInteractionSchema>;
export type InsertTaskInteraction = z.infer<typeof insertTaskInteractionSchema>;